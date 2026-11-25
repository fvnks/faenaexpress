"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { diffChanges, recordAudit } from "@/lib/audit";
import { canWrite, requireContext } from "@/lib/auth";
import { applyBulkEdit, parseBulkChange, type BulkField } from "@/lib/bulk-edit";
import { db } from "@/lib/db";
import { setFlash } from "@/lib/flash";
import { computeTotal, documentSign, formatCLP, todayDate } from "@/lib/money";
import { checkPlanLimit, incrementUsage } from "@/lib/plans";
import { reverseStockForDocument } from "@/lib/inventory-sync";
import { recomputeStatus, saleSettleTotal } from "@/lib/payments";
import { safeReturnTo } from "@/lib/return-to";
import { saleSchema, type SaleInput } from "@/lib/validation";
import {
  bulkFetchSaleXmlAction,
  bulkCheckSaleStatusAction,
} from "@/app/actions/defontana";

export type SaleFormState = { error?: string } | undefined;

function readForm(formData: FormData) {
  return {
    partnerId: formData.get("partnerId"),
    categoryId: formData.get("categoryId"),
    areaId: formData.get("areaId"),
    documentType: formData.get("documentType"),
    documentNumber: formData.get("documentNumber"),
    referenceDocumentNumber: formData.get("referenceDocumentNumber"),
    date: formData.get("date"),
    salespersonId: formData.get("salespersonId"),
    purchaseOrder: formData.get("purchaseOrder"),
    dispatchGuide: formData.get("dispatchGuide"),
    hesNumber: formData.get("hesNumber"),
    netAmount: formData.get("netAmount"),
    ivaAmount: formData.get("ivaAmount"),
    retentionAmount: formData.get("retentionAmount"),
    status: formData.get("status"),
    paymentMethod: formData.get("paymentMethod"),
    paymentDate: formData.get("paymentDate"),
    confirmingAt: formData.get("confirmingAt"),
    notes: formData.get("notes"),
  };
}

function toData(input: SaleInput) {
  const paid = input.status === "PAID";
  return {
    partnerId: input.partnerId,
    categoryId: input.categoryId ?? null,
    areaId: input.areaId ?? null,
    documentType: input.documentType,
    documentNumber: input.documentNumber ?? null,
    referenceDocumentNumber: input.referenceDocumentNumber ?? null,
    date: input.date,
    salespersonId: input.salespersonId ?? null,
    purchaseOrder: input.purchaseOrder ?? null,
    dispatchGuide: input.dispatchGuide ?? null,
    hesNumber: input.hesNumber ?? null,
    netAmount: input.netAmount,
    ivaAmount: input.ivaAmount,
    // El total siempre se recalcula: nunca se confía en lo que llega del cliente.
    totalAmount: computeTotal(input.netAmount, input.ivaAmount),
    retentionAmount: input.retentionAmount ?? 0,
    status: input.status,
    paymentDate: paid ? input.paymentDate : null,
    // El medio de pago es el nombre del catálogo de la empresa. Si la venta se
    // marca pagada sin elegir uno, queda "Otro".
    paymentMethod: paid ? (String(input.paymentMethod ?? "").trim() || "Otro") : null,
    confirmingAt: input.confirmingAt ?? null,
    notes: input.notes ?? null,
  };
}

function describe(input: { documentNumber?: string | null; netAmount: number; ivaAmount: number }) {
  const folio = input.documentNumber ? `N° ${input.documentNumber} ` : "";
  return `venta ${folio}por ${formatCLP(computeTotal(input.netAmount, input.ivaAmount))}`;
}

type RepartoFila = { centroCostoId: string; monto: number };

/** Parsea y valida el reparto que llega del formulario. Vacío = sin centro. */
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
        error: `El reparto suma $${suma.toLocaleString("es-CL")} pero la venta es $${esperado.toLocaleString("es-CL")}. Ajusta los montos.`,
      };
    }
  }
  return { filas };
}

async function escribirReparto(
  tx: Parameters<Parameters<typeof db.$transaction>[0]>[0],
  companyId: string,
  saleId: string,
  filas: RepartoFila[],
) {
  await tx.repartoCentroCosto.deleteMany({ where: { companyId, saleId } });
  if (filas.length > 0) {
    await tx.repartoCentroCosto.createMany({
      data: filas.map((f) => ({ companyId, saleId, centroCostoId: f.centroCostoId, monto: f.monto })),
    });
  }
}

/** Total asignable de una venta, con signo de nota de crédito y sin retención. */
function totalCentros(data: { documentType: string; totalAmount: number; retentionAmount: number }) {
  return documentSign(data.documentType) * saleSettleTotal(data.totalAmount, data.retentionAmount);
}

export async function createSale(_prev: SaleFormState, formData: FormData): Promise<SaleFormState> {
  const ctx = await requireContext();
  if (!canWrite(ctx, "ventas")) return { error: "No tienes permiso para registrar ventas." };

  // El corte va en la acción, no en el botón: un POST directo lo saltaría.
  const organizationId = ctx.user.orgMembership?.organizationId ?? null;
  const bloqueado = await checkPlanLimit(organizationId, "documents");
  if (bloqueado) return { error: bloqueado };

  const parsed = saleSchema.safeParse(readForm(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revisa los datos." };

  // Verificar que el número de documento no esté repetido en la misma empresa.
  const existing = await db.sale.findFirst({
    where: { companyId: ctx.company.id, documentNumber: parsed.data.documentNumber ?? "" },
  });
  if (existing) {
    return { error: "Ya existe una venta con ese número de factura en esta empresa." };
  }

  const data = toData(parsed.data);
  if (!data.salespersonId) {
    const partner = await db.partner.findFirst({
      where: { id: parsed.data.partnerId, companyId: ctx.company.id },
      select: { salespersonId: true },
    });
    if (partner?.salespersonId) data.salespersonId = partner.salespersonId;
  }
  const reparto = await validarReparto(formData, ctx.company.id, totalCentros(data));
  if (reparto.error) return { error: reparto.error };

  const sale = await db.sale.create({
    data: { ...data, companyId: ctx.company.id, createdById: ctx.user.id },
  });
  await escribirReparto(db, ctx.company.id, sale.id, reparto.filas);

  // El contador de documentos del mes.
  if (organizationId) {
    await incrementUsage(organizationId, { documents: 1 });
  }

  await recordAudit(ctx, {
    action: "CREATE",
    entityType: "Sale",
    entityId: sale.id,
    summary: `Registró una ${describe(data)}.`,
  });

  await setFlash("success", "Venta guardada", describe(data));
  revalidatePath("/facturas/ventas");
  revalidatePath("/facturas");
  revalidatePath("/facturas/reportes/centros-costo");
  redirect("/facturas/ventas");
}

export async function updateSale(
  id: string,
  _prev: SaleFormState,
  formData: FormData,
): Promise<SaleFormState> {
  const ctx = await requireContext();
  if (!canWrite(ctx, "ventas")) return { error: "No tienes permiso para editar ventas." };

  const parsed = saleSchema.safeParse(readForm(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revisa los datos." };

  // Verificar que el número de documento no esté repetido por otra venta en la misma empresa.
  const existing = await db.sale.findFirst({
    where: { companyId: ctx.company.id, documentNumber: parsed.data.documentNumber ?? "" },
  });
  if (existing && existing.id !== id) {
    return { error: "Ya existe otra venta con ese número de factura en esta empresa." };
  }

  const before = await db.sale.findFirst({ where: { id, companyId: ctx.company.id } });
  if (!before) return { error: "La venta no existe." };

  const data = toData(parsed.data);
  const anteriores = await db.repartoCentroCosto.findMany({
    where: { companyId: ctx.company.id, saleId: id },
    select: { centroCostoId: true },
  });
  const reparto = await validarReparto(
    formData,
    ctx.company.id,
    totalCentros(data),
    anteriores.map((r) => r.centroCostoId),
  );
  if (reparto.error) return { error: reparto.error };

  await db.sale.update({ where: { id, companyId: ctx.company.id }, data });
  await escribirReparto(db, ctx.company.id, id, reparto.filas);

  // Si la venta tiene abonos, el estado se deriva de ellos: el formulario no
  // puede pisarlo (el selector solo ofrece por cobrar/cobrada).
  const abonos = await db.payment.count({ where: { companyId: ctx.company.id, saleId: id } });
  if (abonos > 0) await recomputeStatus(ctx.company.id, "sale", id);

  await recordAudit(ctx, {
    action: "UPDATE",
    entityType: "Sale",
    entityId: id,
    summary: `Editó una ${describe(data)}.`,
    changes: diffChanges(before, data),
  });

  await setFlash("success", "Venta actualizada", describe(data));
  revalidatePath("/facturas/ventas", "page");
  revalidatePath(`/facturas/ventas/${id}`);
  revalidatePath("/facturas/reportes/centros-costo");
  redirect(`/facturas/ventas/${id}`);
}

/**
 * Fecha escrita por una persona → YYYY-MM-DD, o null si no es válida.
 *
 * Acepta `DD-MM`, `DD-MM-AAAA` y `YYYY-MM-DD`. Además del formato se comprueba
 * que la fecha exista: "31-02" tiene la forma correcta pero no existe, y
 * guardarla dejaría un `Invalid Date` en la base.
 */
function normalizeDateInput(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.trim().replace(/\//g, "-");

  let wire: string | null = null;
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(cleaned);
  if (iso) {
    wire = `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;
  } else {
    const short = /^(\d{1,2})-(\d{1,2})(?:-(\d{4}))?$/.exec(cleaned);
    if (!short) return null;
    const day = Number(short[1]);
    const month = Number(short[2]);
    const year = Number(short[3] ?? new Date().getFullYear());
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    wire = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  const date = new Date(`${wire}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return null;
  // 31-02 se "rebalsa" a marzo: si la fecha no vuelve igual, no existía.
  return date.toISOString().slice(0, 10) === wire ? wire : null;
}

export async function markSalePaid(formData: FormData): Promise<void> {
  const ctx = await requireContext();
  if (!canWrite(ctx, "ventas")) redirect("/facturas/ventas");

  const id = String(formData.get("id") ?? "");
  const rawDate = formData.get("paymentDate");
  const wired = normalizeDateInput(rawDate);
  if (!wired) return;
  const paymentDate = new Date(`${wired}T00:00:00.000Z`);

  const rawSalespersonId = formData.get("salespersonId");
  const salespersonId = typeof rawSalespersonId === "string" ? rawSalespersonId.trim() : null;
  if (salespersonId) {
    const salesperson = await db.salesperson.findFirst({
      where: { id: salespersonId, companyId: ctx.company.id },
    });
    if (!salesperson) redirect("/facturas/ventas");
  }

  const sale = await db.sale.findFirst({ where: { id, companyId: ctx.company.id } });
  if (!sale) redirect("/facturas/ventas");

  if ((await db.payment.count({ where: { companyId: ctx.company.id, saleId: id } })) > 0) {
    await setFlash("error", "Esta venta tiene abonos: administra el cobro desde su panel de abonos.");
    redirect(`/facturas/ventas/${id}`);
  }

  await db.sale.update({
    where: { id, companyId: ctx.company.id },
    data: {
      status: "PAID",
      paymentDate,
      // El medio de pago es el nombre del catálogo de la empresa.
      paymentMethod: String(formData.get("paymentMethod") ?? "").trim() || "Otro",
      ...(rawSalespersonId !== null ? { salespersonId: salespersonId || null } : {}),
    },
  });

  await recordAudit(ctx, {
    action: "UPDATE",
    entityType: "Sale",
    entityId: id,
    summary: `Marcó como cobrada la venta ${sale.documentNumber ? `N° ${sale.documentNumber} ` : ""}por ${formatCLP(sale.totalAmount)}.`,
    changes: { status: { before: sale.status, after: "PAID" } },
  });

  await setFlash("success", "Venta marcada como cobrada");
  revalidatePath("/facturas/ventas", "page");
  revalidatePath(`/facturas/ventas/${id}`);
}

export async function markSaleConfirming(formData: FormData): Promise<void> {
  const ctx = await requireContext();
  if (!canWrite(ctx, "ventas")) redirect("/facturas/ventas");

  const id = String(formData.get("id") ?? "");
  const rawDate = formData.get("confirmingDate") ?? formData.get("confirmingAt");
  const wired = normalizeDateInput(rawDate);
  if (!wired) return;
  const confirmingDate = new Date(`${wired}T00:00:00.000Z`);

  const rawSalespersonId = formData.get("salespersonId");
  const salespersonId = typeof rawSalespersonId === "string" ? rawSalespersonId.trim() : null;
  if (salespersonId) {
    const salesperson = await db.salesperson.findFirst({
      where: { id: salespersonId, companyId: ctx.company.id },
    });
    if (!salesperson) redirect("/facturas/ventas");
  }

  const sale = await db.sale.findFirst({ where: { id, companyId: ctx.company.id } });
  if (!sale) redirect("/facturas/ventas");

  await db.sale.update({
    where: { id, companyId: ctx.company.id },
    data: {
      confirmingAt: confirmingDate,
      ...(rawSalespersonId !== null ? { salespersonId: salespersonId || null } : {}),
    },
  });

  await recordAudit(ctx, {
    action: "UPDATE",
    entityType: "Sale",
    entityId: id,
    summary: `Marcó la venta ${sale.documentNumber ? `Nº ${sale.documentNumber} ` : ""}en Confirming.`,
    changes: { confirmingAt: { before: sale.confirmingAt, after: new Date() } },
  });

  await setFlash("success", "Venta marcada como Confirming");
  revalidatePath("/facturas/ventas", "page");
  revalidatePath(`/facturas/ventas/${id}`);
}

export async function clearSaleConfirming(formData: FormData): Promise<void> {
  const ctx = await requireContext();
  if (!canWrite(ctx, "ventas")) redirect("/facturas/ventas");

  const id = String(formData.get("id") ?? "");
  const sale = await db.sale.findFirst({ where: { id, companyId: ctx.company.id } });
  if (!sale) redirect("/facturas/ventas");

  await db.sale.update({
    where: { id, companyId: ctx.company.id },
    data: { confirmingAt: null },
  });

  await recordAudit(ctx, {
    action: "UPDATE",
    entityType: "Sale",
    entityId: id,
    summary: `Quitó Confirming de la venta ${sale.documentNumber ? `Nº ${sale.documentNumber} ` : ""}.`,
    changes: { confirmingAt: { before: sale.confirmingAt, after: null } },
  });

  await setFlash("success", "Confirming quitado");
  revalidatePath("/facturas/ventas", "page");
  revalidatePath(`/facturas/ventas/${id}`);
}

export async function markSalePending(formData: FormData): Promise<void> {
  const ctx = await requireContext();
  if (!canWrite(ctx, "ventas")) redirect("/facturas/ventas");

  const id = String(formData.get("id") ?? "");
  const sale = await db.sale.findFirst({ where: { id, companyId: ctx.company.id } });
  if (!sale) redirect("/facturas/ventas");

  if ((await db.payment.count({ where: { companyId: ctx.company.id, saleId: id } })) > 0) {
    await setFlash("error", "Esta venta tiene abonos: administra el cobro desde su panel de abonos.");
    redirect(`/facturas/ventas/${id}`);
  }

  await db.sale.update({
    where: { id, companyId: ctx.company.id },
    data: { status: "PENDING", paymentDate: null, paymentMethod: null },
  });

  await recordAudit(ctx, {
    action: "UPDATE",
    entityType: "Sale",
    entityId: id,
    summary: `Marcó como por cobrar la venta ${sale.documentNumber ? `N° ${sale.documentNumber} ` : ""}por ${formatCLP(sale.totalAmount)}.`,
    changes: { status: { before: sale.status, after: "PENDING" } },
  });

  await setFlash("success", "Venta marcada como por cobrar");
  revalidatePath("/facturas/ventas", "page");
  revalidatePath(`/facturas/ventas/${id}`);
}

export async function convertQuoteToInvoice(formData: FormData): Promise<void> {
  const ctx = await requireContext();
  if (!canWrite(ctx, "ventas")) redirect("/facturas/ventas");

  const id = String(formData.get("id") ?? "");
  const sale = await db.sale.findFirst({ where: { id, companyId: ctx.company.id } });
  if (!sale) redirect("/facturas/ventas/cotizaciones");
  if (sale.documentType !== "QUOTATION") redirect(`/facturas/ventas/${id}`);

  await db.sale.update({
    where: { id, companyId: ctx.company.id },
    data: { documentType: "INVOICE" },
  });

  await recordAudit(ctx, {
    action: "UPDATE",
    entityType: "Sale",
    entityId: id,
    summary: `Convirtió la cotización en factura de venta por ${formatCLP(sale.totalAmount)}.`,
    changes: { documentType: { before: "QUOTATION", after: "INVOICE" } },
  });

  await setFlash("success", "Cotización convertida a factura");
  revalidatePath("/facturas/ventas");
  revalidatePath("/facturas/ventas/cotizaciones");
  revalidatePath(`/facturas/ventas/${id}`);
  redirect(`/facturas/ventas/${id}/editar`);
}
export async function deleteSale(formData: FormData): Promise<void> {
  const ctx = await requireContext();
  if (!canWrite(ctx, "ventas")) redirect("/facturas/ventas");

  const id = String(formData.get("id") ?? "");
  if (id) {
    const sale = await db.sale.findFirst({ where: { id, companyId: ctx.company.id } });
    if (sale) {
      await db.sale.delete({ where: { id, companyId: ctx.company.id } });
      await recordAudit(ctx, {
        action: "DELETE",
        entityType: "Sale",
        entityId: id,
        summary: `Eliminó la venta ${sale.documentNumber ? `N° ${sale.documentNumber} ` : ""}por ${formatCLP(sale.totalAmount)}.`,
      });
      await setFlash("success", "Venta eliminada", sale.documentNumber ? `N° ${sale.documentNumber}` : undefined);
    }
  }
  revalidatePath("/facturas/ventas");
  redirect("/facturas/ventas");
}

// Cambia el estado de cobro de varias ventas a la vez.
export async function bulkSetSaleStatus(formData: FormData): Promise<void> {
  const ctx = await requireContext();
  if (!canWrite(ctx, "ventas")) redirect("/facturas/ventas");

  const ids = formData.getAll("ids").map(String).filter(Boolean);
  const rawStatus = String(formData.get("status") ?? "");
  const validStatuses = ["PENDING", "PAID", "PARTIAL", "OVERDUE", "CANCELLED"] as const;
  const status = validStatuses.find((s) => s === rawStatus) ?? "PENDING";
  const returnTo = safeReturnTo(formData.get("returnTo"), "/facturas/ventas");
  if (ids.length === 0) redirect(returnTo);

  const result = await db.sale.updateMany({
    // Las ventas con abonos quedan fuera: su estado se deriva de los abonos.
    where: { id: { in: ids }, companyId: ctx.company.id, payments: { none: {} } },
    // Fecha de cobro = día de Chile (medianoche UTC), no la hora exacta del
    // navegador: el dominio guarda días de calendario.
    data: {
      status,
      paymentDate: status === "PAID" ? todayDate() : null,
      // Sin abonos, el medio de pago es el que se eligió al marcar la venta.
      paymentMethod: status === "PAID" ? "Otro" : null,
    },
  });

  if (result.count > 0) {
    const statusLabels: Record<string, string> = {
      PENDING: "por cobrar",
      PAID: "cobradas",
      PARTIAL: "parciales",
      OVERDUE: "vencidas",
      CANCELLED: "anuladas",
    };
    await recordAudit(ctx, {
      action: "UPDATE",
      entityType: "Sale",
      entityId: "bulk",
      summary: `Marcó ${result.count} ${result.count === 1 ? "venta" : "ventas"} como ${statusLabels[status]}.`,
    });
    await setFlash(
      "success",
      `${result.count} ${result.count === 1 ? "venta actualizada" : "ventas actualizadas"}`,
      `Marcadas como ${statusLabels[status]}.`,
    );
  }
  revalidatePath("/facturas/ventas");
  redirect(returnTo);
}

/**
 * Asigna un vendedor a todas las ventas seleccionadas (masivo).
 * No borra la información existente: solo actualiza salespersonId.
 */
export async function bulkAssignSalesperson(formData: FormData): Promise<void> {
  const ctx = await requireContext("ventas");
  const returnTo = safeReturnTo(formData.get("returnTo"), "/facturas/ventas");
  if (!canWrite(ctx, "ventas")) redirect(returnTo);

  const ids = formData
    .getAll("ids")
    // El formulario manda un `ids` por fila marcada; el formato viejo venía
    // unido por comas. Se aceptan los dos.
    .flatMap((value) => String(value).split(","))
    .map((id) => id.trim())
    .filter(Boolean);
  const salespersonId = String(formData.get("salespersonId") ?? "").trim();

  if (ids.length === 0) {
    await setFlash("error", "No hay ventas seleccionadas.", "Selecciona al menos una venta.");
    redirect(returnTo);
  }
  if (!salespersonId) {
    await setFlash("error", "Debes seleccionar un vendedor.");
    redirect(returnTo);
  }

  // Validar que el vendedor pertenece a la empresa
  const salesperson = await db.salesperson.findFirst({
    where: { id: salespersonId, companyId: ctx.company.id },
  });
  if (!salesperson) {
    await setFlash("error", "Vendedor no encontrado.");
    redirect(returnTo);
  }

  const result = await db.sale.updateMany({
    where: { id: { in: ids }, companyId: ctx.company.id },
    data: { salespersonId },
  });

  if (result.count > 0) {
    await recordAudit(ctx, {
      action: "UPDATE",
      entityType: "Sale",
      entityId: "bulk",
      summary: `Asignó vendedor ${salesperson.name} a ${result.count} ${result.count === 1 ? "venta" : "ventas"}.`,
    });
    await setFlash(
      "success",
      `${result.count} ${result.count === 1 ? "venta actualizada" : "ventas actualizadas"}`,
      `Vendedor asignado: ${salesperson.name}.`,
    );
  } else {
    await setFlash("error", "Ninguna venta fue actualizada.", "Las ventas ya tenían ese vendedor o no existen.");
  }

  revalidatePath("/facturas/ventas");
  redirect(returnTo);
}

/**
 * Anula una venta asociándola a una nota de crédito/débito del SII o a una razón.
 * Se usa desde el modal de cancelación.
 */
export async function cancelSale(formData: FormData): Promise<void> {
  const ctx = await requireContext("ventas");
  if (!canWrite(ctx, "ventas")) redirect("/facturas/ventas");

  const saleId = String(formData.get("saleId") ?? "");
  const cancellationType = String(formData.get("cancellationType") ?? "");
  const cancellationNoteNumber = String(formData.get("cancellationNoteNumber") ?? "").trim();
  const cancellationReason = String(formData.get("cancellationReason") ?? "").trim();
  const cancellationComment = String(formData.get("cancellationComment") ?? "").trim();
  const refacturadaNumber = String(formData.get("refacturadaNumber") ?? "").trim();

  if (!saleId) redirect("/facturas/ventas");

  const sale = await db.sale.findFirst({
    where: { id: saleId, companyId: ctx.company.id },
  });
  if (!sale) redirect("/facturas/ventas");

  // Si ya tiene una nota asociada, no se puede cambiar
  if (sale.cancellationNoteNumber) {
    await setFlash("error", "Esta venta ya tiene una nota asociada y no se puede modificar.");
    redirect("/facturas/ventas");
  }

  // Validaciones según el tipo
  if (cancellationType === "CREDIT_NOTE" || cancellationType === "DEBIT_NOTE") {
    if (!cancellationNoteNumber) {
      await setFlash("error", "Debes indicar el número de la nota de crédito o débito.");
      redirect("/facturas/ventas");
    }
  } else if (cancellationType === "REASON") {
    if (!cancellationReason) {
      await setFlash("error", "Debes indicar la razón de la cancelación.");
      redirect("/facturas/ventas");
    }
  } else {
    await setFlash("error", "Tipo de cancelación inválido.");
    redirect("/facturas/ventas");
  }

  await db.sale.update({
    where: { id: saleId },
    data: {
      status: "CANCELLED",
      cancellationType,
      cancellationNoteNumber: cancellationType === "REASON" ? null : cancellationNoteNumber,
      cancellationReason: cancellationType === "REASON" ? cancellationReason : null,
      cancellationComment: cancellationComment || null,
      refacturadaNumber: refacturadaNumber || null,
    },
  });

  // Anular una venta devuelve el stock: si no, el inventario queda con menos
  // unidades de las que realmente hay.
  const revertido = await reverseStockForDocument({
    companyId: ctx.company.id,
    documentType: "sale",
    documentId: saleId,
    createdById: ctx.user.id,
  });
  for (const error of revertido.errors) {
    await setFlash("error", "La venta se anuló, pero el stock no se pudo corregir", error);
  }

  await recordAudit(ctx, {
    action: "UPDATE",
    entityType: "Sale",
    entityId: saleId,
    summary: `Anuló la venta ${sale.documentNumber ?? saleId} (${cancellationType === "CREDIT_NOTE" ? "NC" : cancellationType === "DEBIT_NOTE" ? "ND" : "razón"}).`,
  });

  await setFlash("success", "Venta anulada", `Se registró la anulación correctamente.`);
  revalidatePath("/facturas/ventas");
  redirect("/facturas/ventas");
}

export async function assignSaleSalesperson(formData: FormData): Promise<void> {
  const ctx = await requireContext("ventas");
  if (!canWrite(ctx, "ventas")) redirect("/facturas/ventas");

  const id = String(formData.get("id") ?? "").trim();
  const salespersonIdRaw = String(formData.get("salespersonId") ?? "").trim();
  if (!id) redirect("/facturas/ventas");

  const sale = await db.sale.findFirst({ where: { id, companyId: ctx.company.id } });
  if (!sale) redirect("/facturas/ventas");

  if (salespersonIdRaw) {
    const salesperson = await db.salesperson.findFirst({
      where: { id: salespersonIdRaw, companyId: ctx.company.id },
    });
    if (!salesperson) redirect("/facturas/ventas");
    await db.sale.update({ where: { id, companyId: ctx.company.id }, data: { salespersonId: salespersonIdRaw } });
    await recordAudit(ctx, {
      action: "UPDATE",
      entityType: "Sale",
      entityId: id,
      summary: `Asignó vendedor ${salesperson.name} a la venta ${sale.documentNumber ? `Nº ${sale.documentNumber} ` : ""}.`,
    });
  } else {
    await db.sale.update({ where: { id, companyId: ctx.company.id }, data: { salespersonId: null } });
    await recordAudit(ctx, {
      action: "UPDATE",
      entityType: "Sale",
      entityId: id,
      summary: `Quitó el vendedor de la venta ${sale.documentNumber ? `Nº ${sale.documentNumber} ` : ""}.`,
    });
  }

  await setFlash("success", "Vendedor actualizado.");
  revalidatePath("/facturas/ventas", "page");
  revalidatePath(`/facturas/ventas/${id}`);
}

/**
 * Acción unificada para todas las operaciones masivas en ventas.
 * Recibe un campo `bulkAction` que indica qué operación realizar:
 * - "set_status": cambiar estado (PAID, PENDING, PARTIAL, OVERDUE, CANCELLED)
 * - "fetch_xml": traer XML de Defontana
 * - "check_status": consultar estado SII (sin botón en la UI: se dejó la acción
 *   preparada para reactivarla cuando el scraper MIPYME vuelva a estar disponible)
 * - "assign_salesperson": asignar vendedor
 * 
 * Para compatibilidad con botones de estado antiguos, también acepta el campo `status`
 * cuando `bulkAction` no está presente pero `status` sí.
 */
export async function bulkSalesAction(formData: FormData): Promise<void> {
  const ctx = await requireContext("ventas");
  if (!canWrite(ctx, "ventas")) redirect("/facturas/ventas");

  const bulkAction = String(formData.get("bulkAction") ?? "");
  const statusFallback = String(formData.get("status") ?? "");
  const ids = formData.getAll("ids").map(String).filter(Boolean);
  const returnTo = safeReturnTo(formData.get("returnTo"), "/facturas/ventas");

  if (ids.length === 0) {
    await setFlash("error", "No hay ventas seleccionadas.", "Selecciona al menos una venta.");
    redirect(returnTo);
  }

  // Determinar la acción: prioridad a bulkAction, fallback a status
  let action = String(formData.get("bulkAction") ?? "");
  if (!action && String(formData.get("status") ?? "")) {
    action = "set_status";
  }

  if (!action) {
    await setFlash("error", "Acción masiva no reconocida.");
    redirect(returnTo);
  }

  switch (action) {
    case "set_status": {
      const rawStatus = String(formData.get("status") ?? "");
      const validStatuses = ["PENDING", "PAID", "PARTIAL", "OVERDUE", "CANCELLED"] as const;
      const status = validStatuses.find((s) => s === rawStatus) ?? "PENDING";

      const conAbonos = await db.sale.count({
        where: { id: { in: ids }, companyId: ctx.company.id, payments: { some: {} } },
      });
      const result = await db.sale.updateMany({
        where: { id: { in: ids }, companyId: ctx.company.id, payments: { none: {} } },
        data: {
          status,
          paymentDate: status === "PAID" ? todayDate() : null,
          paymentMethod: status === "PAID" ? "Otro" : null,
        },
      });

      if (result.count > 0 || conAbonos > 0) {
        const statusLabels: Record<string, string> = {
          PENDING: "por cobrar",
          PAID: "cobradas",
          PARTIAL: "parciales",
          OVERDUE: "vencidas",
          CANCELLED: "anuladas",
        };
        await recordAudit(ctx, {
          action: "UPDATE",
          entityType: "Sale",
          entityId: "bulk",
          summary: `Marcó ${result.count} ${result.count === 1 ? "venta" : "ventas"} como ${statusLabels[status]}.${conAbonos > 0 ? ` ${conAbonos} con abonos se omitieron.` : ""}`,
        });
        await setFlash(
          conAbonos > 0 ? "error" : "success",
          `${result.count} ${result.count === 1 ? "venta actualizada" : "ventas actualizadas"}`,
          conAbonos > 0
            ? `${conAbonos} ${conAbonos === 1 ? "venta tiene abonos" : "ventas tienen abonos"} y su estado es derivado: no se ${conAbonos === 1 ? "cambió" : "cambiaron"}.`
            : `Marcadas como ${statusLabels[status]}.`,
        );
      }
      break;
    }

    case "fetch_xml": {
      const result = await bulkFetchSaleXmlAction(formData);
      if (result?.ok) {
        await setFlash("success", result.message ?? "XML procesados.");
      } else if (result?.error) {
        await setFlash("error", result.error);
      }
      redirect(result?.redirectTo ?? returnTo);
    }

    case "check_status": {
      const result = await bulkCheckSaleStatusAction(formData);
      if (result?.ok) {
        await setFlash("success", result.message ?? "Estados del SII consultados.");
      } else if (result?.error) {
        await setFlash("error", result.error);
      }
      redirect(result?.redirectTo ?? returnTo);
    }

    case "assign_salesperson": {
      const salespersonId = String(formData.get("salespersonId") ?? "").trim();
      if (!salespersonId) {
        await setFlash("error", "Debes seleccionar un vendedor.");
        redirect(returnTo);
      }

      const salesperson = await db.salesperson.findFirst({
        where: { id: salespersonId, companyId: ctx.company.id },
      });
      if (!salesperson) {
        await setFlash("error", "Vendedor no encontrado.");
        redirect(returnTo);
      }

      const result = await db.sale.updateMany({
        where: { id: { in: ids }, companyId: ctx.company.id },
        data: { salespersonId },
      });

      if (result.count > 0) {
        await recordAudit(ctx, {
          action: "UPDATE",
          entityType: "Sale",
          entityId: "bulk",
          summary: `Asignó vendedor ${salesperson.name} a ${result.count} ${result.count === 1 ? "venta" : "ventas"}.`,
        });
        await setFlash(
          "success",
          `${result.count} ${result.count === 1 ? "venta actualizada" : "ventas actualizadas"}`,
          `Vendedor asignado: ${salesperson.name}.`,
        );
      } else {
        await setFlash("error", "Ninguna venta fue actualizada.", "Las ventas ya tenían ese vendedor o no existen.");
      }
      break;
    }

    case "bulk_edit": {
      const change = parseBulkChange(formData.get("bulkField"), formData.get("bulkValue"));
      if (!change) {
        await setFlash("error", "No se reconoció el campo o el valor a cambiar.");
        break;
      }
      const count = await applyBulkEdit("sale", ctx.company.id, ids, change);
      if (count > 0) {
        const labels: Record<BulkField, string> = {
          categoria: "categoría",
          area: "área",
          metodoPago: "medio de pago",
        };
        await recordAudit(ctx, {
          action: "UPDATE",
          entityType: "Sale",
          entityId: "bulk",
          summary: `Cambió la ${labels[change.field]} de ${count} ${count === 1 ? "venta" : "ventas"}.`,
        });
        await setFlash("success", `${count} ${count === 1 ? "venta actualizada" : "ventas actualizadas"}.`);
      } else {
        await setFlash("error", "Ninguna venta fue actualizada.", "Revisa el valor elegido.");
      }
      break;
    }

    case "bulk_delete": {
      if (!canWrite(ctx, "ventas")) {
        await setFlash("error", "No tienes permiso para eliminar ventas.");
        break;
      }
      // Solo se pueden borrar documentos sin abonos: borrar una venta con
      // pagos dejaría el dinero sin rastro.
      const result = await db.sale.deleteMany({
        where: { id: { in: ids }, companyId: ctx.company.id, payments: { none: {} } },
      });
      if (result.count > 0) {
        await recordAudit(ctx, {
          action: "DELETE",
          entityType: "Sale",
          entityId: "bulk",
          summary: `Eliminó ${result.count} ${result.count === 1 ? "venta" : "ventas"}.`,
        });
        await setFlash("success", `${result.count} ${result.count === 1 ? "venta eliminada" : "ventas eliminadas"}.`);
      } else {
        await setFlash("error", "Ninguna venta fue eliminada.", "Las ventas con abonos no se pueden borrar.");
      }
      break;
    }

    default:
      await setFlash("error", "Acción masiva no reconocida.");
  }

  revalidatePath("/facturas/ventas");
  redirect(returnTo);
}

