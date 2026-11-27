"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { diffChanges, recordAudit } from "@/lib/audit";
import { canWrite, requireContext } from "@/lib/auth";
import { esCategoriaCombustible } from "@/lib/fuel-categories";
import { applyBulkEdit, parseBulkChange, type BulkField } from "@/lib/bulk-edit";
import { db } from "@/lib/db";
import { setFlash } from "@/lib/flash";
import { safeReturnTo } from "@/lib/return-to";
import { computeTotal, documentSign, formatCLP, todayDate } from "@/lib/money";
import { checkPlanLimit, incrementUsage } from "@/lib/plans";
import { esPagoConTarjeta } from "@/lib/payment-card";
import { recomputeStatus } from "@/lib/payments";
import {
  descripcionCompra,
  obraEsImputable,
  sincronizarCostoObra,
} from "@/lib/obra-imputacion";
import { purchaseSchema, type PurchaseInput } from "@/lib/validation";

export type PurchaseFormState = { error?: string } | undefined;

function readForm(formData: FormData) {
  return {
    partnerId: formData.get("partnerId"),
    categoryId: formData.get("categoryId"),
    areaId: formData.get("areaId"),
    documentType: formData.get("documentType"),
    documentNumber: formData.get("documentNumber"),
    referenceDocumentNumber: formData.get("referenceDocumentNumber"),
    date: formData.get("date"),
    dueDate: formData.get("dueDate"),
    description: formData.get("description"),
    netAmount: formData.get("netAmount"),
    ivaAmount: formData.get("ivaAmount"),
    status: formData.get("status"),
    paymentMethod: formData.get("paymentMethod"),
    paymentDate: formData.get("paymentDate"),
    combustibleTipo: formData.get("combustibleTipo"),
    combustibleLitros: formData.get("combustibleLitros"),
    impuestoEspecifico: formData.get("impuestoEspecifico"),
    impuestoEspecificoGlosa: formData.get("impuestoEspecificoGlosa"),
    impuestoEspecificoRecuperable: formData.get("impuestoEspecificoRecuperable"),
    // Solo se acepta si el formulario ofrecía el selector: un POST de un
    // cliente sin módulo Obras no debe adivinar una imputación.
    obraId: formData.get("obraCampo") === "1" ? formData.get("obraId") : null,
    notes: formData.get("notes"),
  };
}

function toData(input: PurchaseInput, combustible: boolean) {
  const paid = input.status === "PAID";
  const metodo = paid ? String(input.paymentMethod ?? "").trim() || "Otro" : null;
  // El impuesto específico no es base del IVA, pero sí parte del total del DTE.
  const impuestoEspecifico = combustible ? input.impuestoEspecifico ?? 0 : 0;
  return {
    partnerId: input.partnerId,
    categoryId: input.categoryId ?? null,
    areaId: input.areaId ?? null,
    documentType: input.documentType,
    documentNumber: input.documentNumber ?? null,
    referenceDocumentNumber: input.referenceDocumentNumber ?? null,
    date: input.date,
    dueDate: input.dueDate ?? null,
    description: input.description ?? null,
    netAmount: input.netAmount,
    ivaAmount: input.ivaAmount,
    // El total siempre se recalcula: nunca se confía en lo que llega del cliente.
    totalAmount: computeTotal(input.netAmount, input.ivaAmount) + impuestoEspecifico,
    combustibleTipo: combustible ? input.combustibleTipo ?? null : null,
    combustibleLitros: combustible ? input.combustibleLitros ?? null : null,
    impuestoEspecifico,
    impuestoEspecificoGlosa: combustible ? input.impuestoEspecificoGlosa ?? null : null,
    impuestoEspecificoRecuperable: combustible
      ? input.impuestoEspecificoRecuperable
      : false,
    status: input.status,
    paymentMethod: metodo,
    // Tarjeta de crédito/débito: la fecha de pago es la de emisión de la
    // factura, aunque el formulario haya mandado otra (POST directo incluido).
    // Los demás medios conservan la fecha elegida o el día de Chile por defecto.
    paymentDate: paid
      ? esPagoConTarjeta(metodo)
        ? input.date
        : input.paymentDate ?? todayDate()
      : null,
    obraId: input.obraId ?? null,
    notes: input.notes ?? null,
  };
}

function contarFilasReparto(formData: FormData): number {
  try {
    const crudo = JSON.parse(String(formData.get("repartos") ?? "[]"));
    return Array.isArray(crudo) ? crudo.length : 0;
  } catch {
    return 0;
  }
}

/** Reglas del DTE de combustible, también válidas para un POST directo. */
function validarDatosCombustible(
  input: PurchaseInput,
  filasReparto: number,
): string | null {
  if (!input.combustibleTipo) return "Selecciona el tipo de combustible.";
  if (input.combustibleLitros === undefined || input.combustibleLitros <= 0) {
    return "Ingresa los litros o m³ de combustible.";
  }
  if (input.impuestoEspecifico === undefined) {
    return "Ingresa el monto del impuesto específico (puede ser 0 o negativo).";
  }
  if (input.impuestoEspecifico < 0 && !input.impuestoEspecificoGlosa?.trim()) {
    return "Cuando el impuesto específico es negativo, indica la glosa del documento.";
  }
  if (filasReparto === 0) {
    return "Las facturas de combustible deben tener al menos un centro de costo asignado.";
  }
  return null;
}

function describe(input: { documentNumber?: string | null; netAmount: number; ivaAmount: number }) {
  const folio = input.documentNumber ? `N° ${input.documentNumber} ` : "";
  return `compra ${folio}por ${formatCLP(computeTotal(input.netAmount, input.ivaAmount))}`;
}

type RepartoFila = { centroCostoId: string; monto: number };

async function validarReparto(
  formData: FormData,
  companyId: string,
  esperado: number,
  anteriores: string[] = [],
): Promise<{ filas: RepartoFila[]; error?: string }> {
  let filas: RepartoFila[] = [];
  try {
    const crudo = JSON.parse(String(formData.get("repartos") ?? "[]"));
    if (!Array.isArray(crudo)) throw new Error();
    filas = crudo.map((f) => ({
      centroCostoId: String(f?.centroCostoId ?? ""),
      monto: Math.round(Number(f?.monto)),
    }));
  } catch {
    return { filas: [], error: "El reparto de centros de costo no es válido." };
  }
  if (filas.some((f) => !f.centroCostoId || !Number.isFinite(f.monto) || f.monto === 0)) {
    return { filas: [], error: "Cada centro debe tener un monto distinto de cero." };
  }
  const ids = [...new Set(filas.map((f) => f.centroCostoId))];
  if (ids.length !== filas.length) return { filas: [], error: "No repitas un centro de costo." };
  if (filas.length > 0) {
    const existentes = await db.centroCosto.count({ where: { id: { in: ids }, companyId } });
    if (existentes !== ids.length) return { filas: [], error: "Algún centro de costo no existe." };
    const yaAsignados = new Set(anteriores);
    const inactivos = await db.centroCosto.findMany({
      where: { id: { in: ids }, companyId, active: false },
      select: { id: true },
    });
    if (inactivos.some((c) => !yaAsignados.has(c.id))) {
      return { filas: [], error: "No puedes asignar un centro de costo inactivo." };
    }
    const suma = filas.reduce((acc, f) => acc + f.monto, 0);
    if (suma !== esperado) {
      return {
        filas: [],
        error: `El reparto suma $${suma.toLocaleString("es-CL")} pero la compra es $${esperado.toLocaleString("es-CL")}. Ajusta los montos.`,
      };
    }
  }
  return { filas };
}

async function escribirReparto(companyId: string, purchaseId: string, filas: RepartoFila[]) {
  await db.repartoCentroCosto.deleteMany({ where: { companyId, purchaseId } });
  if (filas.length > 0) {
    await db.repartoCentroCosto.createMany({
      data: filas.map((f) => ({ companyId, purchaseId, centroCostoId: f.centroCostoId, monto: f.monto })),
    });
  }
}

export async function createPurchase(
  _prev: PurchaseFormState,
  formData: FormData,
): Promise<PurchaseFormState> {
  const ctx = await requireContext();
  if (!canWrite(ctx, "compras")) {
    return { error: "No tienes permiso para registrar compras." };
  }

  // El corte va en la acción, no en el botón: un POST directo lo saltaría.
  const organizationId = ctx.user.orgMembership?.organizationId ?? null;
  const bloqueado = await checkPlanLimit(organizationId, "documents");
  if (bloqueado) return { error: bloqueado };

  const parsed = purchaseSchema.safeParse(readForm(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisa los datos del formulario." };
  }
  if (parsed.data.obraId && !(await obraEsImputable(parsed.data.obraId))) {
    return { error: "No tienes acceso a esa obra." };
  }

  // Verificar que el número de documento no esté repetido en la misma empresa.
  const existing = await db.purchase.findFirst({
    where: { companyId: ctx.company.id, documentNumber: parsed.data.documentNumber },
  });
  if (existing) {
    return { error: "Ya existe una compra con ese número de documento en esta empresa." };
  }

  const combustible = await esCategoriaCombustible(ctx.company.id, parsed.data.categoryId);
  if (combustible) {
    const error = validarDatosCombustible(parsed.data, contarFilasReparto(formData));
    if (error) return { error };
  }

  const data = toData(parsed.data, combustible);
  const reparto = await validarReparto(
    formData,
    ctx.company.id,
    documentSign(data.documentType) * data.totalAmount,
  );
  if (reparto.error) return { error: reparto.error };

  const proveedor = await db.partner.findFirst({
    where: { id: parsed.data.partnerId, companyId: ctx.company.id },
    select: { name: true },
  });
  const purchase = await db.$transaction(async (tx) => {
    const creada = await tx.purchase.create({
      data: { ...data, companyId: ctx.company.id, createdById: ctx.user.id },
    });
    await sincronizarCostoObra(tx, {
      sourceType: "PURCHASE",
      sourceId: creada.id,
      obraId: data.obraId ?? null,
      habilitado: formData.get("obraCampo") === "1",
      monto: data.totalAmount,
      fecha: data.date,
      descripcion: descripcionCompra(data.documentNumber ?? null, proveedor?.name ?? ""),
    });
    return creada;
  });
  await escribirReparto(ctx.company.id, purchase.id, reparto.filas);

  // El contador de documentos del mes.
  if (organizationId) {
    await incrementUsage(organizationId, { documents: 1 });
  }

  await recordAudit(ctx, {
    action: "CREATE",
    entityType: "Purchase",
    entityId: purchase.id,
    summary: `Registró una ${describe(data)}.`,
  });

  await setFlash("success", "Compra guardada", describe(data));
  revalidatePath("/facturas/compras");
  revalidatePath("/facturas");
  revalidatePath("/facturas/reportes/centros-costo");
  for (const ruta of ["/obras", "/obras/compras", "/obras/presupuesto", "/obras/reportes"]) {
    revalidatePath(ruta);
  }
  redirect("/facturas/compras");
}

export async function updatePurchase(
  id: string,
  _prev: PurchaseFormState,
  formData: FormData,
): Promise<PurchaseFormState> {
  const ctx = await requireContext();
  if (!canWrite(ctx, "compras")) {
    return { error: "No tienes permiso para editar compras." };
  }

  const parsed = purchaseSchema.safeParse(readForm(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisa los datos del formulario." };
  }
  if (parsed.data.obraId && !(await obraEsImputable(parsed.data.obraId))) {
    return { error: "No tienes acceso a esa obra." };
  }

  // Verificar que el número de documento no esté repetido por otra compra en la misma empresa.
  const existing = await db.purchase.findFirst({
    where: { companyId: ctx.company.id, documentNumber: parsed.data.documentNumber },
  });
  if (existing && existing.id !== id) {
    return { error: "Ya existe otra compra con ese número de documento en esta empresa." };
  }

  const before = await db.purchase.findFirst({ where: { id, companyId: ctx.company.id } });
  if (!before) {
    return { error: "La compra no existe." };
  }

  const combustible = await esCategoriaCombustible(ctx.company.id, parsed.data.categoryId);
  if (combustible) {
    const error = validarDatosCombustible(parsed.data, contarFilasReparto(formData));
    if (error) return { error };
  }

  const data = toData(parsed.data, combustible);
  const anteriores = await db.repartoCentroCosto.findMany({
    where: { companyId: ctx.company.id, purchaseId: id },
    select: { centroCostoId: true },
  });
  const reparto = await validarReparto(
    formData,
    ctx.company.id,
    documentSign(data.documentType) * data.totalAmount,
    anteriores.map((r) => r.centroCostoId),
  );
  if (reparto.error) return { error: reparto.error };

  const proveedor = await db.partner.findFirst({
    where: { id: parsed.data.partnerId, companyId: ctx.company.id },
    select: { name: true },
  });
  await db.$transaction(async (tx) => {
    await tx.purchase.update({ where: { id, companyId: ctx.company.id }, data });
    await sincronizarCostoObra(tx, {
      sourceType: "PURCHASE",
      sourceId: id,
      obraId: data.obraId ?? null,
      habilitado: formData.get("obraCampo") === "1",
      monto: data.totalAmount,
      fecha: data.date,
      descripcion: descripcionCompra(data.documentNumber ?? null, proveedor?.name ?? ""),
    });
  });
  await escribirReparto(ctx.company.id, id, reparto.filas);

  // Si la compra tiene abonos, el estado se deriva de ellos: el formulario no
  // puede pisarlo (el selector solo ofrece pendiente/pagada).
  const abonos = await db.payment.count({ where: { companyId: ctx.company.id, purchaseId: id } });
  if (abonos > 0) await recomputeStatus(ctx.company.id, "purchase", id);

  await recordAudit(ctx, {
    action: "UPDATE",
    entityType: "Purchase",
    entityId: id,
    summary: `Editó una ${describe(data)}.`,
    changes: diffChanges(before, data),
  });

  await setFlash("success", "Compra actualizada", describe(data));
  revalidatePath("/facturas/compras");
  revalidatePath(`/facturas/compras/${id}`);
  revalidatePath("/facturas/reportes/centros-costo");
  for (const ruta of ["/obras", "/obras/compras", "/obras/presupuesto", "/obras/reportes"]) {
    revalidatePath(ruta);
  }
  redirect(`/facturas/compras/${id}`);
}

function normalizePaymentDate(value: unknown): string | null {
  if (!(typeof value === "string")) return null;
  const cleaned = value.trim().replace(/\//g, "-");
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) return cleaned;
  const match = /^(\d{1,2})-(\d{1,2})(?:-(\d{4}))?$/.exec(cleaned);
  if (!match) return null;
  const day = match[1].padStart(2, "0");
  const month = match[2].padStart(2, "0");
  const year = match[3] ?? String(new Date().getFullYear());
  const iso = `${year}-${month}-${day}`;
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : null;
}

export async function markPurchasePaid(formData: FormData): Promise<void> {
  const ctx = await requireContext();
  if (!canWrite(ctx, "compras")) {
    redirect("/facturas/compras");
  }

  const id = String(formData.get("id") ?? "");
  const rawMethod = String(formData.get("paymentMethod") ?? "").trim();
  // El medio de pago es el nombre del catálogo de la empresa: si no viene, se
  // deja como "Otro" (que es lo que siempre estuvo).
  const paymentMethod = rawMethod || "Otro";

  const purchase = await db.purchase.findFirst({ where: { id, companyId: ctx.company.id } });
  if (!purchase) redirect("/facturas/compras");

  // Con tarjeta se usa la fecha de emisión; no se exige fecha de pago.
  let paymentDate: Date;
  if (esPagoConTarjeta(paymentMethod)) {
    paymentDate = purchase.date;
  } else {
    const wired = normalizePaymentDate(formData.get("paymentDate"));
    if (!wired) {
      await setFlash("error", "Ingresa la fecha de pago en formato DD-MM o DD-MM-AAAA.");
      redirect(`/facturas/compras/${id}`);
    }
    paymentDate = new Date(`${wired}T00:00:00.000Z`);
  }

  // Un documento con abonos se salda desde su panel: aquí el estado se pisaría.
  if ((await db.payment.count({ where: { companyId: ctx.company.id, purchaseId: id } })) > 0) {
    await setFlash("error", "Esta compra tiene abonos: administra el pago desde su panel de abonos.");
    redirect(`/facturas/compras/${id}`);
  }

  await db.purchase.update({
    where: { id, companyId: ctx.company.id },
    data: { status: "PAID", paymentMethod, paymentDate },
  });

  await recordAudit(ctx, {
    action: "UPDATE",
    entityType: "Purchase",
    entityId: id,
    summary: `Marcó como pagada la compra ${purchase.documentNumber ? `N° ${purchase.documentNumber} ` : ""}por ${formatCLP(purchase.totalAmount)}.`,
    changes: { status: { before: purchase.status, after: "PAID" } },
  });

  await setFlash("success", "Compra marcada como pagada");
  revalidatePath("/facturas/compras");
  revalidatePath(`/facturas/compras/${id}`);
  redirect(`/facturas/compras/${id}`);
}

export async function markPurchasePending(formData: FormData): Promise<void> {
  const ctx = await requireContext();
  if (!canWrite(ctx, "compras")) {
    redirect("/facturas/compras");
  }

  const id = String(formData.get("id") ?? "");
  const purchase = await db.purchase.findFirst({ where: { id, companyId: ctx.company.id } });
  if (!purchase) redirect("/facturas/compras");

  if ((await db.payment.count({ where: { companyId: ctx.company.id, purchaseId: id } })) > 0) {
    await setFlash("error", "Esta compra tiene abonos: administra el pago desde su panel de abonos.");
    redirect(`/facturas/compras/${id}`);
  }

  await db.purchase.update({
    where: { id, companyId: ctx.company.id },
    data: { status: "PENDING", paymentMethod: null, paymentDate: null },
  });

  await recordAudit(ctx, {
    action: "UPDATE",
    entityType: "Purchase",
    entityId: id,
    summary: `Marcó como pendiente la compra ${purchase.documentNumber ? `N° ${purchase.documentNumber} ` : ""}por ${formatCLP(purchase.totalAmount)}.`,
    changes: { status: { before: purchase.status, after: "PENDING" } },
  });

  await setFlash("success", "Compra marcada como pendiente");
  revalidatePath("/facturas/compras");
  revalidatePath(`/facturas/compras/${id}`);
  redirect(`/facturas/compras/${id}`);
}

export async function deletePurchase(formData: FormData): Promise<void> {
  const ctx = await requireContext();
  if (!canWrite(ctx, "compras")) {
    redirect("/facturas/compras");
  }

  const id = String(formData.get("id") ?? "");
  if (id) {
    const purchase = await db.purchase.findFirst({ where: { id, companyId: ctx.company.id } });
    if (purchase) {
      await db.purchase.delete({ where: { id, companyId: ctx.company.id } });
      await recordAudit(ctx, {
        action: "DELETE",
        entityType: "Purchase",
        entityId: id,
        summary: `Eliminó la compra ${purchase.documentNumber ? `N° ${purchase.documentNumber} ` : ""}por ${formatCLP(purchase.totalAmount)}.`,
      });
      await setFlash("success", "Compra eliminada", purchase.documentNumber ? `N° ${purchase.documentNumber}` : undefined);
    }
  }
  revalidatePath("/facturas/compras");
  redirect("/facturas/compras");
}

// Cambia el estado de pago de varias compras a la vez.
export async function bulkSetPurchaseStatus(formData: FormData): Promise<void> {
  const ctx = await requireContext();
  const returnTo = safeReturnTo(formData.get("returnTo"), "/facturas/compras");
  if (!canWrite(ctx, "compras")) {
    redirect(returnTo);
  }

  const ids = formData.getAll("ids").map(String).filter(Boolean);
  const status = formData.get("status") === "PAID" ? "PAID" : "PENDING";
  if (ids.length === 0) redirect(returnTo);

  const result = await db.purchase.updateMany({
    // Las compras con abonos quedan fuera: su estado se deriva de los abonos.
    where: { id: { in: ids }, companyId: ctx.company.id, payments: { none: {} } },
    data: { status, paymentDate: status === "PAID" ? todayDate() : null },
  });

  if (result.count > 0) {
    await recordAudit(ctx, {
      action: "UPDATE",
      entityType: "Purchase",
      entityId: "bulk",
      summary: `Marcó ${result.count} ${result.count === 1 ? "compra" : "compras"} como ${status === "PAID" ? "pagadas" : "pendientes"}.`,
    });
    await setFlash(
      "success",
      `${result.count} ${result.count === 1 ? "compra actualizada" : "compras actualizadas"}`,
      status === "PAID" ? "Marcadas como pagadas." : "Marcadas como pendientes.",
    );
  }
  revalidatePath("/facturas/compras");
  redirect(returnTo);
}

/** Acción masiva unificada de compras: estado, edición en bloque y borrado. */
export async function bulkPurchaseAction(formData: FormData): Promise<void> {
  const ctx = await requireContext();
  const returnTo = safeReturnTo(formData.get("returnTo"), "/facturas/compras");
  if (!canWrite(ctx, "compras")) redirect(returnTo);

  const ids = formData.getAll("ids").map(String).filter(Boolean);
  if (ids.length === 0) {
    await setFlash("error", "No hay compras seleccionadas.");
    redirect(returnTo);
  }

  const bulkAction = String(formData.get("bulkAction") ?? "");

  if (bulkAction === "bulk_edit") {
    const change = parseBulkChange(formData.get("bulkField"), formData.get("bulkValue"));
    if (!change) {
      await setFlash("error", "No se reconoció el campo o el valor a cambiar.");
    } else {
      const count = await applyBulkEdit("purchase", ctx.company.id, ids, change);
      if (count > 0) {
        const labels: Record<BulkField, string> = { categoria: "categoría", area: "área", metodoPago: "medio de pago" };
        await recordAudit(ctx, {
          action: "UPDATE",
          entityType: "Purchase",
          entityId: "bulk",
          summary: `Cambió la ${labels[change.field]} de ${count} ${count === 1 ? "compra" : "compras"}.`,
        });
        await setFlash("success", `${count} ${count === 1 ? "compra actualizada" : "compras actualizadas"}.`);
      } else {
        await setFlash("error", "Ninguna compra fue actualizada.", "Revisa el valor elegido.");
      }
    }
  } else if (bulkAction === "bulk_delete") {
    const result = await db.purchase.deleteMany({
      where: { id: { in: ids }, companyId: ctx.company.id, payments: { none: {} } },
    });
    if (result.count > 0) {
      await recordAudit(ctx, {
        action: "DELETE",
        entityType: "Purchase",
        entityId: "bulk",
        summary: `Eliminó ${result.count} ${result.count === 1 ? "compra" : "compras"}.`,
      });
      await setFlash("success", `${result.count} ${result.count === 1 ? "compra eliminada" : "compras eliminadas"}.`);
    } else {
      await setFlash("error", "Ninguna compra fue eliminada.", "Las compras con abonos no se pueden borrar.");
    }
  } else {
    // Compatibilidad: el formulario de estado antiguo no manda bulkAction.
    const status = formData.get("status") === "PAID" ? "PAID" : "PENDING";
    const conAbonos = await db.purchase.count({
      where: { id: { in: ids }, companyId: ctx.company.id, payments: { some: {} } },
    });
    const result = await db.purchase.updateMany({
      where: { id: { in: ids }, companyId: ctx.company.id, payments: { none: {} } },
      data: { status, paymentDate: status === "PAID" ? todayDate() : null },
    });
    if (result.count > 0 || conAbonos > 0) {
      await recordAudit(ctx, {
        action: "UPDATE",
        entityType: "Purchase",
        entityId: "bulk",
        summary: `Marcó ${result.count} ${result.count === 1 ? "compra" : "compras"} como ${status === "PAID" ? "pagadas" : "pendientes"}.${conAbonos > 0 ? ` ${conAbonos} con abonos se omitieron.` : ""}`,
      });
      await setFlash(
        conAbonos > 0 ? "error" : "success",
        `${result.count} ${result.count === 1 ? "compra actualizada" : "compras actualizadas"}.`,
        conAbonos > 0
          ? `${conAbonos} ${conAbonos === 1 ? "compra tiene abonos" : "compras tienen abonos"} y su estado es derivado: no se ${conAbonos === 1 ? "cambió" : "cambiaron"}.`
          : undefined,
      );
    }
  }

  revalidatePath("/facturas/compras");
  redirect(returnTo);
}
