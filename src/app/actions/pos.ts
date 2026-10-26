"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { Prisma } from "@/generated/prisma/client";
import { recordAudit } from "@/lib/audit";
import { canWrite, requireContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { setFlash } from "@/lib/flash";
import { getOrCreateDefaultWarehouse, registerMovement } from "@/lib/inventory";
import { computeIva, formatCLP } from "@/lib/money";
import { enabledModuleCodes } from "@/lib/org-module-state";
import { checkRut } from "@/app/actions/partners";
import { checkPlanLimit, incrementUsage } from "@/lib/plans";
import { formatRut, isValidRut, normalizeRut } from "@/lib/rut";
import { getOpenPosSession } from "@/lib/pos";

export type PosActionState = { error?: string; ok?: boolean } | undefined;

type SaleItemInput = {
  productId: string;
  quantity: number;
  discount?: number;
};

type SalePaymentInput = {
  method: string;
  amount: number;
  reference?: string;
};

type SalePayload = {
  partnerId?: string | null;
  items: SaleItemInput[];
  payments: SalePaymentInput[];
  notes?: string | null;
};

type NormalizedItem = {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  lineTotal: number;
  tracksStock: boolean;
};

async function requirePosWrite() {
  const ctx = await requireContext();
  const organizationId = ctx.user.orgMembership?.organizationId ?? null;
  const codes = await enabledModuleCodes(organizationId);
  if (!codes.includes("pos")) {
    return { ctx, error: "El módulo Punto de Venta no está habilitado para esta organización." };
  }
  if (!canWrite(ctx, "ventas")) {
    return { ctx, error: "No tienes permiso para vender en el punto de venta." };
  }
  return { ctx, error: null };
}

function parseInteger(value: FormDataEntryValue | null) {
  const parsed = Number(String(value ?? "").replace(/\./g, "").replace(/,/g, "."));
  return Number.isFinite(parsed) ? Math.round(parsed) : 0;
}

async function nextSaleNumber(tx: Prisma.TransactionClient, companyId: string) {
  const last = await tx.posSale.findFirst({
    where: { companyId },
    orderBy: { saleNumber: "desc" },
    select: { saleNumber: true },
  });
  const numeric = last ? Number(last.saleNumber.replace(/\D/g, "")) : 0;
  const next = Number.isFinite(numeric) ? numeric + 1 : 1;
  return `PV-${String(next).padStart(6, "0")}`;
}

export async function openPosSession(
  _prev: PosActionState,
  formData: FormData,
): Promise<PosActionState> {
  const { ctx, error } = await requirePosWrite();
  if (error) return { error };

  const openingAmount = Math.max(0, parseInteger(formData.get("openingAmount")));
  const existing = await getOpenPosSession(ctx.company.id, ctx.user.id);
  if (existing) return { error: "Ya tienes una caja abierta. Ciérrala antes de abrir otra." };

  const session = await db.posSession.create({
    data: {
      companyId: ctx.company.id,
      openedById: ctx.user.id,
      openingAmount,
      notes: String(formData.get("notes") ?? "").trim() || null,
    },
  });

  await recordAudit(ctx, {
    action: "CREATE",
    entityType: "PosSession",
    entityId: session.id,
    summary: `Abrió la caja con ${formatCLP(openingAmount)}.`,
  });

  await setFlash("success", "Caja abierta", `Monto inicial ${formatCLP(openingAmount)}.`);
  revalidatePath("/pos");
  revalidatePath("/pos/caja");
  redirect("/pos/venta");
}

export async function closePosSession(
  _prev: PosActionState,
  formData: FormData,
): Promise<PosActionState> {
  const { ctx, error } = await requirePosWrite();
  if (error) return { error };

  const sessionId = String(formData.get("sessionId") ?? "");
  const session = await db.posSession.findFirst({
    where: { id: sessionId, companyId: ctx.company.id, openedById: ctx.user.id },
  });
  if (!session) return { error: "La caja no existe o no es tuya." };
  if (session.status === "CLOSED") return { error: "Esa caja ya está cerrada." };

  const closingAmount = Math.max(0, parseInteger(formData.get("closingAmount")));

  // El arqueo: lo que debía haber (apertura + lo cobrado en efectivo) contra lo
  // contado. Sin este número el cierre no dice nada: solo dice que se cerró.
  const cash = await db.posPayment.aggregate({
    _sum: { amount: true },
    where: {
      method: { contains: "efectivo", mode: "insensitive" },
      sale: { sessionId: session.id, status: "COMPLETED" },
    },
  });
  const expected = session.openingAmount + (cash._sum.amount ?? 0);
  const difference = closingAmount - expected;

  await db.posSession.update({
    where: { id: session.id },
    data: {
      status: "CLOSED",
      closedAt: new Date(),
      closingAmount,
      notes: String(formData.get("notes") ?? "").trim() || session.notes,
    },
  });

  await recordAudit(ctx, {
    action: "UPDATE",
    entityType: "PosSession",
    entityId: session.id,
    summary:
      difference === 0
        ? `Cerró la caja cuadrada con ${formatCLP(closingAmount)}.`
        : `Cerró la caja con ${formatCLP(closingAmount)}; ${difference < 0 ? "faltaban" : "sobraban"} ${formatCLP(Math.abs(difference))} respecto de lo esperado.`,
  });

  await setFlash(
    "success",
    "Caja cerrada",
    difference === 0
      ? `Contado ${formatCLP(closingAmount)}, cuadrado con lo esperado.`
      : `Contado ${formatCLP(closingAmount)}; se esperaban ${formatCLP(expected)}, ${difference < 0 ? "faltan" : "sobran"} ${formatCLP(Math.abs(difference))}.`,
  );
  revalidatePath("/pos");
  revalidatePath("/pos/caja");
  revalidatePath(`/pos/caja/${session.id}`);
  redirect(`/pos/caja/${session.id}`);
}

export async function createPosSale(
  _prev: PosActionState,
  formData: FormData,
): Promise<PosActionState> {
  const { ctx, error } = await requirePosWrite();
  if (error) return { error };

  const raw = String(formData.get("payload") ?? "");
  let payload: SalePayload;
  try {
    payload = JSON.parse(raw) as SalePayload;
  } catch {
    return { error: "No se pudo leer la venta. Recarga la página e intenta de nuevo." };
  }

  const items = Array.isArray(payload.items) ? payload.items : [];
  if (items.length === 0) return { error: "Agrega al menos un producto." };

  const session = await getOpenPosSession(ctx.company.id, ctx.user.id);
  if (!session) return { error: "Abre la caja antes de vender." };

  const organizationId = ctx.user.orgMembership?.organizationId ?? null;
  const bloqueado = await checkPlanLimit(organizationId, "documents");
  if (bloqueado) return { error: bloqueado };

  const productIds = [...new Set(items.map((item) => item.productId).filter(Boolean))];
  const products = await db.product.findMany({
    where: { id: { in: productIds }, companyId: ctx.company.id, active: true },
    select: {
      id: true,
      name: true,
      sku: true,
      priceNet: true,
      ivaAffected: true,
      tracksStock: true,
    },
  });
  const productMap = new Map(products.map((product) => [product.id, product]));

  const normalizedItems: NormalizedItem[] = [];
  let subtotal = 0;
  let tax = 0;

  for (const item of items) {
    const product = productMap.get(item.productId);
    if (!product) return { error: "Uno de los productos ya no está disponible." };
    if (product.priceNet === null) {
      return { error: `«${product.name}» no tiene precio de venta configurado.` };
    }

    const quantity = Number(item.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return { error: `La cantidad de «${product.name}» no es válida.` };
    }

    const rawDiscount = Number(item.discount ?? 0);
    if (!Number.isFinite(rawDiscount) || rawDiscount < 0) {
      return { error: `El descuento de «${product.name}» no es válido.` };
    }

    const lineNet = Math.round(product.priceNet * quantity) - Math.round(rawDiscount);
    if (lineNet < 0) {
      return { error: `El descuento de «${product.name}» supera su valor.` };
    }

    const lineTax = computeIva(lineNet, product.ivaAffected ? ctx.company.ivaRate : 0);
    subtotal += lineNet;
    tax += lineTax;
    normalizedItems.push({
      productId: product.id,
      name: product.name,
      quantity,
      unitPrice: product.priceNet,
      discount: Math.round(rawDiscount),
      lineTotal: lineNet,
      tracksStock: product.tracksStock,
    });
  }

  const total = subtotal + tax;
  const rawPayments = Array.isArray(payload.payments) ? payload.payments : [];
  const payments = rawPayments
    .map((payment) => ({
      method: String(payment.method ?? "").trim(),
      amount: Math.round(Number(payment.amount ?? 0)),
      reference: String(payment.reference ?? "").trim() || null,
    }))
    .filter((payment) => payment.method && payment.amount > 0);

  if (total > 0) {
    const paid = payments.reduce((sum, payment) => sum + payment.amount, 0);
    if (paid < total) {
      return { error: `Faltan ${formatCLP(total - paid)} para completar el pago.` };
    }
    // Si el cliente paga de más (vuelto), lo que se registra es lo que cubre la
    // venta. La diferencia no es un ingreso: es cambio.
    let remaining = total;
    for (const payment of payments) {
      const applied = Math.min(payment.amount, remaining);
      payment.amount = applied;
      remaining -= applied;
      if (remaining === 0) break;
    }
    if (remaining > 0) return { error: "El pago no alcanza el total de la venta." };
  } else {
    payments.length = 0;
  }

  let saleId = "";
  // Dos cajas vendiendo en el mismo instante leen el mismo último folio y una
  // pierde la carrera contra el UNIQUE (companyId, saleNumber). Reintentar
  // recalcula el folio con lo ya comprometido: lo deshecho no tocó stock.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      saleId = await db.$transaction(async (tx) => {
        const saleNumber = await nextSaleNumber(tx, ctx.company.id);
        const sale = await tx.posSale.create({
          data: {
            companyId: ctx.company.id,
            sessionId: session.id,
            saleNumber,
            partnerId: payload.partnerId || null,
            subtotal,
            tax,
            discount: normalizedItems.reduce((sum, item) => sum + item.discount, 0),
            total,
            status: "COMPLETED",
            notes: String(payload.notes ?? "").trim() || null,
            userId: ctx.user.id,
            items: {
              create: normalizedItems.map((item) => ({
                productId: item.productId,
                name: item.name,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                discount: item.discount,
                lineTotal: item.lineTotal,
              })),
            },
            payments: {
              create: payments.map((payment) => ({
                method: payment.method,
                amount: payment.amount,
                reference: payment.reference,
              })),
            },
          },
        });

        for (const item of normalizedItems) {
          if (!item.tracksStock) continue;
          const result = await registerMovement(
            {
              companyId: ctx.company.id,
              productId: item.productId,
              type: "OUT",
              date: new Date(),
              quantity: new Prisma.Decimal(item.quantity.toFixed(6)),
              unitCost: null,
              warehouseId: null,
              reason: `Venta POS ${saleNumber}`,
              reference: `pos:${sale.id}:item:${item.productId}`,
              notes: item.name,
              createdById: ctx.user.id,
            },
            tx,
          );
          if (!result.ok) {
            throw new Error(`${item.name}: ${result.error ?? "No se pudo descontar el stock."}`);
          }
        }

        return sale.id;
      });
    } catch (cause) {
      const colision =
        cause instanceof Prisma.PrismaClientKnownRequestError && cause.code === "P2002";
      if (colision && attempt < 2) continue;
      const message = cause instanceof Error ? cause.message : "No se pudo registrar la venta.";
      return { error: message };
    }
  }

  if (!saleId) return { error: "No se pudo registrar la venta. Intenta de nuevo." };

  if (organizationId) {
    await incrementUsage(organizationId, { documents: 1 });
  }

  await recordAudit(ctx, {
    action: "CREATE",
    entityType: "PosSale",
    entityId: saleId,
    summary: `Registró una venta POS por ${formatCLP(total)}.`,
  });

  await setFlash("success", "Venta registrada", `Ticket ${formatCLP(total)}.`);
  revalidatePath("/pos");
  revalidatePath("/pos/venta");
  revalidatePath("/pos/ventas");
  revalidatePath("/pos/caja");
  redirect(`/pos/ventas/${saleId}`);
}

export async function voidPosSale(
  _prev: PosActionState,
  formData: FormData,
): Promise<PosActionState> {
  const { ctx, error } = await requirePosWrite();
  if (error) return { error };

  const saleId = String(formData.get("saleId") ?? "");
  const sale = await db.posSale.findFirst({
    where: { id: saleId, companyId: ctx.company.id },
    include: { session: { select: { status: true } } },
  });
  if (!sale) return { error: "La venta no existe." };
  if (sale.status !== "COMPLETED") return { error: "Esa venta ya está anulada." };
  if (sale.session.status !== "OPEN") {
    return {
      error:
        "La caja de esta venta ya está cerrada. La anulación es del mismo turno: con la caja cerrada, registra la devolución como nota de crédito en Facturas.",
    };
  }

  const motivo = String(formData.get("motivo") ?? "").trim() || null;

  try {
    await db.$transaction(async (tx) => {
      // Carrera de doble clic: el que llegue segundo ya no la encuentra COMPLETED.
      const fresh = await tx.posSale.findFirst({
        where: { id: sale.id, companyId: ctx.company.id, status: "COMPLETED" },
        select: { id: true },
      });
      if (!fresh) throw new Error("Esa venta ya está anulada.");

      await tx.posSale.update({
        where: { id: sale.id },
        data: {
          status: "VOIDED",
          notes:
            [sale.notes, motivo ? `Anulación: ${motivo}` : null].filter(Boolean).join(" · ") ||
            null,
        },
      });

      // Se devuelve exactamente lo que la venta descontó: los movimientos OUT
      // con la referencia de esta venta. ADJUST_IN sin costo conserva el
      // promedio (PPP) y no pisa el costo vigente del producto, a diferencia
      // de una entrada IN, que fijaría costo nuevo.
      const outs = await tx.stockMovement.findMany({
        where: { companyId: ctx.company.id, type: "OUT", reference: { startsWith: `pos:${sale.id}:` } },
        select: { productId: true, quantity: true, warehouseId: true },
      });

      for (const out of outs) {
        const result = await registerMovement(
          {
            companyId: ctx.company.id,
            productId: out.productId,
            type: "ADJUST_IN",
            date: new Date(),
            quantity: out.quantity,
            unitCost: null,
            warehouseId: out.warehouseId,
            reason: `Anulación ${sale.saleNumber}`,
            reference: `pos:void:${sale.id}:item:${out.productId}`,
            notes: motivo,
            createdById: ctx.user.id,
          },
          tx,
        );
        if (!result.ok) {
          throw new Error(`No se pudo devolver el stock: ${result.error ?? "error desconocido."}`);
        }
      }
    });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "No se pudo anular la venta.";
    return { error: message };
  }

  await recordAudit(ctx, {
    action: "UPDATE",
    entityType: "PosSale",
    entityId: sale.id,
    summary: motivo
      ? `Anuló el ticket ${sale.saleNumber} por ${formatCLP(sale.total)}; motivo: ${motivo}.`
      : `Anuló el ticket ${sale.saleNumber} por ${formatCLP(sale.total)}.`,
  });

  await setFlash("success", "Venta anulada", `Ticket ${sale.saleNumber}. El stock volvió al inventario.`);
  revalidatePath("/pos");
  revalidatePath("/pos/ventas");
  revalidatePath(`/pos/ventas/${sale.id}`);
  revalidatePath("/pos/caja");
  return { ok: true };
}

export type PosPartnerResult = {
  error?: string;
  partner?: { id: string; name: string; rut: string | null };
};

/**
 * Crea un cliente desde la venta: el «¿boleta con RUT?» de siempre, sin salir
 * del POS. Si el RUT ya existe como cliente se devuelve el existente — el
 * cajero lo tecleó para buscarlo, no para chocar con un error.
 */
export async function createPosPartner(input: {
  name: string;
  rut?: string;
}): Promise<PosPartnerResult> {
  const { ctx, error } = await requirePosWrite();
  if (error) return { error };

  const name = String(input.name ?? "").trim().slice(0, 120);
  const rawRut = String(input.rut ?? "").trim();

  let rut: string | null = null;
  if (rawRut) {
    if (!isValidRut(rawRut)) {
      return { error: "El RUT no es válido (revisa el dígito verificador)." };
    }
    rut = formatRut(rawRut);

    // Primero el RUT: si el cliente ya existe se devuelve tal cual, aunque el
    // nombre venga vacío — el cajero tecleó el RUT para encontrarlo.
    const existing = await db.partner.findFirst({
      where: { companyId: ctx.company.id, OR: [{ rut }, { rut: normalizeRut(rut) }] },
    });
    if (existing) {
      return { partner: { id: existing.id, name: existing.name, rut: existing.rut } };
    }
    // Un trabajador de RRHH no entra a los libros como cliente.
    const rutError = await checkRut(ctx.company.id, rut);
    if (rutError) return { error: rutError };
  }

  if (!name) return { error: "Ingresa el nombre del cliente." };

  const partner = await db.partner.create({
    data: { companyId: ctx.company.id, type: "CUSTOMER", name, rut },
  });

  await recordAudit(ctx, {
    action: "CREATE",
    entityType: "Partner",
    entityId: partner.id,
    summary: `Creó el cliente «${partner.name}» desde el punto de venta.`,
  });

  revalidatePath("/pos/venta");
  return { partner: { id: partner.id, name: partner.name, rut: partner.rut } };
}

// ---------------------------------------------------------------------------
// Productos: el catálogo que la caja vende. Es el MISMO inventario de
// Facturas (misma tabla `Product` y mismos movimientos de kardex); acá solo
// se gestiona desde el módulo POS, para que quien solo contrató el punto de
// venta pueda mantener su catálogo sin entrar a Facturas.
// ---------------------------------------------------------------------------

export type PosProductInput = {
  id?: string;
  name: string;
  sku?: string;
  priceNet: number;
  ivaAffected: boolean;
  tracksStock: boolean;
  /** Solo al crear: saldo inicial en la bodega por defecto. */
  initialStock?: number;
  active?: boolean;
};

export type PosProductResult = { error?: string; ok?: boolean };

function parsePriceNet(raw: number): number | null {
  if (!Number.isFinite(raw) || raw < 0) return null;
  return Math.round(raw);
}

/** Sugerencia de SKU para quien no usa códigos de barras: secuencial. */
async function nextPosSku(companyId: string) {
  const count = await db.product.count({ where: { companyId } });
  return `P-${String(count + 1).padStart(4, "0")}`;
}

export async function createPosProduct(input: PosProductInput): Promise<PosProductResult> {
  const { ctx, error } = await requirePosWrite();
  if (error) return { error };

  const name = String(input.name ?? "").trim().slice(0, 120);
  if (!name) return { error: "Ingresa el nombre del producto." };

  const sku = String(input.sku ?? "").trim().slice(0, 60) || (await nextPosSku(ctx.company.id));
  const priceNet = parsePriceNet(Number(input.priceNet));
  if (priceNet === null) return { error: "El precio de venta no es válido." };

  const existing = await db.product.findFirst({
    where: { companyId: ctx.company.id, sku },
    select: { id: true },
  });
  if (existing) return { error: `Ya existe un producto con el SKU «${sku}».` };

  const tracksStock = Boolean(input.tracksStock);
  const initialStock = tracksStock ? Number(input.initialStock ?? 0) : 0;
  if (!Number.isFinite(initialStock) || initialStock < 0) {
    return { error: "El stock inicial no es válido." };
  }

  const product = await db.product.create({
    data: {
      companyId: ctx.company.id,
      sku,
      name,
      priceNet,
      ivaAffected: Boolean(input.ivaAffected),
      tracksStock,
      costNet: 0,
      active: true,
    },
  });

  if (tracksStock) {
    // El saldo inicial queda trazado en el kardex como inventario inicial,
    // con costo cero: el POS no pide costo, y si mañana se contrata
    // Facturas, el inventario avanzado lo corrige.
    const result = await registerMovement(
      {
        companyId: ctx.company.id,
        productId: product.id,
        type: "INITIAL",
        date: new Date(),
        quantity: new Prisma.Decimal(initialStock.toFixed(3)),
        unitCost: 0,
        warehouseId: null,
        reason: "Alta desde el punto de venta",
        reference: `pos:alta:${product.id}`,
        notes: name,
        createdById: ctx.user.id,
      },
    );
    if (!result.ok) return { error: result.error ?? "No se pudo registrar el stock inicial." };
  }

  await recordAudit(ctx, {
    action: "CREATE",
    entityType: "Product",
    entityId: product.id,
    summary: `Creó el producto «${product.name}» desde el punto de venta.`,
  });

  revalidatePath("/pos/productos");
  revalidatePath("/pos/venta");
  return { ok: true };
}

export async function updatePosProduct(input: PosProductInput): Promise<PosProductResult> {
  const { ctx, error } = await requirePosWrite();
  if (error) return { error };

  const productId = String(input.id ?? "");
  const product = await db.product.findFirst({
    where: { id: productId, companyId: ctx.company.id },
    select: { id: true, sku: true, tracksStock: true, active: true },
  });
  if (!product) return { error: "El producto no existe." };

  const name = String(input.name ?? "").trim().slice(0, 120);
  if (!name) return { error: "Ingresa el nombre del producto." };

  const sku = String(input.sku ?? "").trim().slice(0, 60);
  if (!sku) return { error: "El SKU no puede quedar vacío." };
  if (sku !== product.sku) {
    const taken = await db.product.findFirst({
      where: { companyId: ctx.company.id, sku },
      select: { id: true },
    });
    if (taken) return { error: `Ya existe un producto con el SKU «${sku}».` };
  }

  const priceNet = parsePriceNet(Number(input.priceNet));
  if (priceNet === null) return { error: "El precio de venta no es válido." };

  await db.product.update({
    where: { id: product.id },
    data: {
      name,
      sku,
      priceNet,
      ivaAffected: Boolean(input.ivaAffected),
      tracksStock: Boolean(input.tracksStock),
      active: input.active === undefined ? product.active : Boolean(input.active),
    },
  });

  await recordAudit(ctx, {
    action: "UPDATE",
    entityType: "Product",
    entityId: product.id,
    summary: `Editó el producto «${name}» desde el punto de venta.`,
  });

  revalidatePath("/pos/productos");
  revalidatePath("/pos/venta");
  return { ok: true };
}

/**
 * Corrección de stock desde el POS (conteo físico): mueve el saldo hasta la
 * cantidad indicada con un ADJUST_IN o ADJUST_OUT, que conserva el costo
 * promedio. Es la misma regla del inventario de Facturas.
 */
export async function adjustPosStock(input: {
  productId: string;
  newQuantity: number;
  reason?: string;
}): Promise<PosProductResult> {
  const { ctx, error } = await requirePosWrite();
  if (error) return { error };

  const product = await db.product.findFirst({
    where: { id: String(input.productId ?? ""), companyId: ctx.company.id },
    select: { id: true, name: true, tracksStock: true },
  });
  if (!product) return { error: "El producto no existe." };
  if (!product.tracksStock) return { error: "Ese producto no controla stock." };

  const newQuantity = Number(input.newQuantity);
  if (!Number.isFinite(newQuantity) || newQuantity < 0) {
    return { error: "La cantidad no es válida." };
  }

  const warehouse = await getOrCreateDefaultWarehouse(ctx.company.id);
  const row = await db.productStock.findUnique({
    where: { productId_warehouseId: { productId: product.id, warehouseId: warehouse.id } },
    select: { quantity: true },
  });
  const current = row ? Number(row.quantity.toString()) : 0;
  const delta = newQuantity - current;
  if (Math.abs(delta) < 0.0005) return { error: "La cantidad es igual al stock actual." };

  const result = await registerMovement({
    companyId: ctx.company.id,
    productId: product.id,
    type: delta > 0 ? "ADJUST_IN" : "ADJUST_OUT",
    date: new Date(),
    quantity: new Prisma.Decimal(Math.abs(delta).toFixed(3)),
    unitCost: null,
    warehouseId: warehouse.id,
    reason: input.reason?.trim() || "Ajuste desde el punto de venta",
    reference: `pos:ajuste:${product.id}`,
    notes: product.name,
    createdById: ctx.user.id,
  });
  if (!result.ok) return { error: result.error ?? "No se pudo ajustar el stock." };

  await recordAudit(ctx, {
    action: "UPDATE",
    entityType: "Product",
    entityId: product.id,
    summary: `Ajustó el stock de «${product.name}» desde el punto de venta: ${current} → ${newQuantity}.`,
  });

  revalidatePath("/pos/productos");
  revalidatePath("/pos/venta");
  return { ok: true };
}

/**
 * Devolución de un ticket de un turno cerrado.
 *
 * Es una PosSale con los montos en negativo, ligada al original
 * (relatedSaleId), asociada a la caja abierta de quien la procesa: el dinero
 * sale de ESA caja y el arqueo del día lo descuenta solo. El stock vuelve con
 * un ADJUST_IN por cada OUT original — misma regla que la anulación, que
 * conserva el costo promedio en vez de fijar uno nuevo.
 *
 * La anulación (voidPosSale) sigue siendo la herramienta del mismo turno: no
 * deja rastro de venta. La devolución es para lo que ya cerró.
 */
export async function createPosReturn(
  _prev: PosActionState,
  formData: FormData,
): Promise<PosActionState> {
  const { ctx, error } = await requirePosWrite();
  if (error) return { error };

  const saleId = String(formData.get("saleId") ?? "");
  const motivo = String(formData.get("motivo") ?? "").trim();

  const original = await db.posSale.findFirst({
    where: { id: saleId, companyId: ctx.company.id },
    include: {
      session: { select: { status: true } },
      items: true,
      payments: true,
      relatedReturns: { where: { status: "COMPLETED" }, select: { id: true } },
    },
  });
  if (!original) return { error: "La venta no existe." };
  if (original.status !== "COMPLETED") {
    return { error: "Esa venta está anulada: no se puede devolver." };
  }
  if (original.total < 0 || original.relatedSaleId) {
    return { error: "Ese ticket ya es una devolución." };
  }
  if (original.relatedReturns.length > 0) {
    return { error: "Ese ticket ya tiene una devolución registrada." };
  }
  if (original.session.status !== "CLOSED") {
    return {
      error:
        "La caja de esa venta sigue abierta: usa «Anular venta», que deja la venta sin efecto en el mismo turno.",
    };
  }
  if (!motivo) return { error: "Escribe el motivo de la devolución." };

  const session = await getOpenPosSession(ctx.company.id, ctx.user.id);
  if (!session) {
    return { error: "Abre la caja antes de registrar una devolución: el dinero sale de tu caja." };
  }

  const organizationId = ctx.user.orgMembership?.organizationId ?? null;
  const bloqueado = await checkPlanLimit(organizationId, "documents");
  if (bloqueado) return { error: bloqueado };

  let returnId = "";
  try {
    returnId = await db.$transaction(async (tx) => {
      // Carrera: que nadie más devuelva el mismo ticket mientras tanto.
      const yaDevuelta = await tx.posSale.count({
        where: { relatedSaleId: original.id, companyId: ctx.company.id, status: "COMPLETED" },
      });
      if (yaDevuelta > 0) throw new Error("Ese ticket ya tiene una devolución registrada.");

      const saleNumber = await nextSaleNumber(tx, ctx.company.id);
      const devolucion = await tx.posSale.create({
        data: {
          companyId: ctx.company.id,
          sessionId: session.id,
          saleNumber,
          partnerId: original.partnerId,
          subtotal: -original.subtotal,
          tax: -original.tax,
          discount: 0,
          total: -original.total,
          status: "COMPLETED",
          notes: motivo,
          userId: ctx.user.id,
          relatedSaleId: original.id,
          items: {
            create: original.items.map((item) => ({
              productId: item.productId,
              name: item.name,
              quantity: item.quantity.negated(),
              unitPrice: item.unitPrice,
              discount: 0,
              lineTotal: -item.lineTotal,
            })),
          },
          payments: {
            create: original.payments.map((payment) => ({
              method: payment.method,
              // Se devuelve por el mismo medio con que se pagó.
              amount: -payment.amount,
              reference: payment.reference,
            })),
          },
        },
      });

      // El stock vuelve donde salió: los OUT de la venta original.
      const outs = await tx.stockMovement.findMany({
        where: {
          companyId: ctx.company.id,
          type: "OUT",
          reference: { startsWith: `pos:${original.id}:` },
        },
        select: { productId: true, quantity: true, warehouseId: true },
      });
      for (const out of outs) {
        const result = await registerMovement(
          {
            companyId: ctx.company.id,
            productId: out.productId,
            type: "ADJUST_IN",
            date: new Date(),
            quantity: out.quantity,
            unitCost: null,
            warehouseId: out.warehouseId,
            reason: `Devolución ${original.saleNumber}`,
            reference: `pos:return:${devolucion.id}:item:${out.productId}`,
            notes: motivo,
            createdById: ctx.user.id,
          },
          tx,
        );
        if (!result.ok) {
          throw new Error(`No se pudo devolver el stock: ${result.error ?? "error desconocido."}`);
        }
      }

      return devolucion.id;
    });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "No se pudo registrar la devolución.";
    return { error: message };
  }

  if (organizationId) {
    await incrementUsage(organizationId, { documents: 1 });
  }

  await recordAudit(ctx, {
    action: "CREATE",
    entityType: "PosSale",
    entityId: returnId,
    summary: `Registró devolución del ticket ${original.saleNumber} por ${formatCLP(original.total)}; motivo: ${motivo}.`,
  });

  await setFlash("success", "Devolución registrada", `Ticket ${original.saleNumber} devuelto.`);
  revalidatePath("/pos");
  revalidatePath("/pos/ventas");
  revalidatePath(`/pos/ventas/${saleId}`);
  revalidatePath(`/pos/ventas/${returnId}`);
  revalidatePath("/pos/caja");
  redirect(`/pos/ventas/${returnId}`);
}
