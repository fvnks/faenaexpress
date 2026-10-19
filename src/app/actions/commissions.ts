"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { recordAudit } from "@/lib/audit";
import { setFlash } from "@/lib/flash";
import { canWrite, requireContext } from "@/lib/auth";
import {
  closeCommissionMonth,
  computeCommission,
  formatRateBps,
  listCommissionCloses,
  parseRateInput,
} from "@/lib/commissions";
import { db } from "@/lib/db";
import { formatPeriod } from "@/lib/money";

export type CommissionActionState =
  | { error?: string; ok?: boolean; message?: string; assigned?: number }
  | undefined;

// El form envía varios `saleId` (uno por checkbox marcado).
function readSaleIds(formData: FormData): string[] {
  return formData
    .getAll("saleId")
    .map((value) => String(value).trim())
    .filter(Boolean)
    .slice(0, 200);
}

/**
 * Asigna uno o varios documentos al mes de comisión de un vendedor. Es la
 * herramienta para las guías de despacho rezagadas: un documento de marzo que
 * corresponde comisionar en junio se asigna aquí.
 *
 * El monto SIEMPRE es el neto completo del documento; no se puede sobrescribir.
 */
export async function assignCommissionDocuments(
  _prev: CommissionActionState,
  formData: FormData,
): Promise<CommissionActionState> {
  const ctx = await requireContext("comisiones");
  if (!canWrite(ctx, "comisiones")) {
    return { error: "No tienes permiso para editar comisiones." };
  }

  const period = String(formData.get("period") ?? "").trim();
  const salespersonId = String(formData.get("salespersonId") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim() || null;
  const saleIds = readSaleIds(formData);

  if (!/^\d{4}-\d{2}$/.test(period)) return { error: "Período inválido. Usa el formato AAAA-MM." };
  if (!salespersonId) return { error: "Selecciona el vendedor." };
  if (saleIds.length === 0) return { error: "Marca al menos un documento." };

  const closed = await db.commissionClose.findUnique({
    where: { companyId_period: { companyId: ctx.company.id, period } },
  });
  if (closed) return { error: `El período ${formatPeriod(period)} ya está cerrado.` };

  const person = await db.salesperson.findFirst({
    where: { id: salespersonId, companyId: ctx.company.id },
    select: { id: true, name: true },
  });
  if (!person) return { error: "Vendedor no encontrado." };

  // Solo documentos de la empresa, y solo los que todavía no comisionaron.
  const docs = await db.sale.findMany({
    where: { id: { in: saleIds }, companyId: ctx.company.id },
    select: {
      id: true,
      documentNumber: true,
      commissionAssignment: { select: { id: true, period: true } },
      commissionEntries: { select: { id: true, period: true } },
    },
  });

  const byId = new Map(docs.map((doc) => [doc.id, doc]));
  const faltantes = saleIds.filter((id) => !byId.has(id));
  if (faltantes.length > 0) {
    return { error: `${faltantes.length} documento(s) no existen en esta empresa.` };
  }

  const yaAsignados = docs.filter((doc) => doc.commissionAssignment);
  if (yaAsignados.length > 0) {
    const folios = yaAsignados
      .map((doc) => doc.documentNumber ?? doc.id.slice(0, 8))
      .join(", ");
    return {
      error: `Ya tienen comisión asignada: ${folios}. Quita esa asignación antes de moverlos.`,
    };
  }

  const yaCongelados = docs.filter((doc) => doc.commissionEntries.length > 0);
  if (yaCongelados.length > 0) {
    return { error: "Algunos documentos ya comisionaron en un mes cerrado y no se pueden mover." };
  }

  let assigned = 0;
  for (const doc of docs) {
    await db.commissionAssignment.create({
      data: {
        companyId: ctx.company.id,
        saleId: doc.id,
        period,
        salespersonId,
        note,
        createdById: ctx.user.id,
      },
    });
    assigned += 1;
  }

  await recordAudit(ctx, {
    action: "CREATE",
    entityType: "CommissionAssignment",
    summary: `Asignó ${assigned} documento(s) de comisión a ${person.name} en ${formatPeriod(period)}.`,
  });

  revalidatePath("/facturas/comisiones");
  revalidatePath("/facturas/comisiones/asignaciones");
  revalidatePath("/facturas/comisiones/cierres");
  return {
    ok: true,
    assigned,
    message: `${assigned} documento(s) comisionarán en ${formatPeriod(period)} para ${person.name}.`,
  };
}

/** Quita una asignación. El documento vuelve al cómputo automático de su mes. */
export async function unassignCommissionDocument(
  _prev: CommissionActionState,
  formData: FormData,
): Promise<CommissionActionState> {
  const ctx = await requireContext("comisiones");
  if (!canWrite(ctx, "comisiones")) {
    return { error: "No tienes permiso para editar comisiones." };
  }

  const saleId = String(formData.get("saleId") ?? "").trim();
  const dispatchGuideId = String(formData.get("dispatchGuideId") ?? "").trim();
  if (!saleId && !dispatchGuideId) return { error: "Documento no indicado." };

  const assignment = await db.commissionAssignment.findFirst({
    where: {
      OR: [
        saleId ? { saleId, companyId: ctx.company.id } : {},
        dispatchGuideId ? { dispatchGuideId, companyId: ctx.company.id } : {},
      ].filter(Boolean),
    },
    include: {
      sale: { select: { documentNumber: true } },
      dispatchGuide: { select: { guideNumber: true } },
    },
  });
  if (!assignment) return { error: "Esa asignación ya no existe." };

  if (assignment.period) {
    const closed = await db.commissionClose.findUnique({
      where: { companyId_period: { companyId: ctx.company.id, period: assignment.period } },
    });
    if (closed) {
      return { error: `No se puede quitar: ${formatPeriod(assignment.period)} ya está cerrado.` };
    }
  }

  await db.commissionAssignment.delete({ where: { id: assignment.id } });

  await recordAudit(ctx, {
    action: "DELETE",
    entityType: "CommissionAssignment",
    entityId: assignment.id,
    summary: `Quitó la comisión del documento ${assignment.sale?.documentNumber ?? assignment.dispatchGuide?.guideNumber ?? assignment.saleId}.`,
  });

  revalidatePath("/facturas/comisiones");
  revalidatePath("/facturas/comisiones/asignaciones");
  revalidatePath("/facturas/comisiones/cierres");
  return { ok: true, message: "Asignación eliminada." };
}

/**
 * Congela el mes. Copia el cálculo a `CommissionEntry` con la tasa vigente y
 * sella el período: de ahí en adelante el motor lo ignora.
 */
export async function closeCommissionMonthAction(
  _prev: CommissionActionState,
  formData: FormData,
): Promise<CommissionActionState> {
  const ctx = await requireContext("comisiones");
  if (!canWrite(ctx, "comisiones")) {
    return { error: "No tienes permiso para cerrar meses de comisión." };
  }

  const period = String(formData.get("period") ?? "").trim();
  if (!/^\d{4}-\d{2}$/.test(period)) return { error: "Período inválido." };

  const report = await computeCommission(ctx.company.id, period);
  if (report.closed) return { error: `El período ${formatPeriod(period)} ya está cerrado.` };

  const cerrado = await closeCommissionMonth(ctx.company.id, period, ctx.user.id);

  await recordAudit(ctx, {
    action: "CREATE",
    entityType: "CommissionClose",
    summary: `Cerró las comisiones de ${formatPeriod(period)} con ${cerrado.entries} línea(s).`,
  });

  revalidatePath("/facturas/comisiones");
  revalidatePath("/facturas/comisiones/asignaciones");
  revalidatePath("/facturas/comisiones/cierres");
  return {
    ok: true,
    message: `Mes cerrado: ${cerrado.entries} línea(s) congelada(s) en ${formatPeriod(period)}.`,
  };
}

export type SalespersonCommissionState = { error?: string; ok?: boolean } | undefined;

/** Guarda la tasa y la regla de comisión de un vendedor. */
export async function saveSalespersonCommission(
  _prev: SalespersonCommissionState,
  formData: FormData,
): Promise<SalespersonCommissionState> {
  const ctx = await requireContext("comisiones");
  if (!canWrite(ctx, "comisiones")) {
    return { error: "No tienes permiso para editar comisiones." };
  }

  const id = String(formData.get("id") ?? "").trim();
  const rateBps = parseRateInput(String(formData.get("commissionRate") ?? ""));
  const rule = String(formData.get("commissionRule") ?? "");

  if (!id) return { error: "Vendedor no indicado." };
  if (rateBps === null) return { error: "El porcentaje debe estar entre 0 y 100." };
  if (rule !== "INVOICE" && rule !== "GUIDE") return { error: "Regla de comisión inválida." };

  const person = await db.salesperson.findFirst({
    where: { id, companyId: ctx.company.id },
    select: { id: true, name: true },
  });
  if (!person) return { error: "Vendedor no encontrado." };

  await db.salesperson.update({
    where: { id },
    data: { commissionRate: rateBps, commissionRule: rule },
  });

  await recordAudit(ctx, {
    action: "UPDATE",
    entityType: "Salesperson",
    entityId: id,
    summary: `Ajustó la comisión de «${person.name}» a ${formatRateBps(rateBps)} (${rule === "GUIDE" ? "por guía" : "por factura"}).`,
  });

  revalidatePath("/facturas/comisiones");
  revalidatePath("/facturas/comisiones/asignaciones");
  revalidatePath("/facturas/comisiones/vendedores");
  revalidatePath("/facturas/catalogos");
  return { ok: true };
}

/** Historial de meses cerrados, para la vista y para bloquear botones. */
export async function getCommissionHistory(companyId: string) {
  return listCommissionCloses(companyId);
}

// ---------------------------------------------------------------------------
// Guías de despacho sin facturar
// ---------------------------------------------------------------------------

export type RegisterDispatchGuideState =
  | { error?: string; ok?: boolean; guideId?: string; message?: string }
  | undefined;

/**
 * Registra una guía de despacho que todavía no tiene factura.
 * El vendedor cobra comisión por ella en el mes que se asigne (no necesariamente
 * el mes de emisión de la guía).
 */
export async function registerDispatchGuide(
  _prev: RegisterDispatchGuideState,
  formData: FormData,
): Promise<RegisterDispatchGuideState> {
  const ctx = await requireContext("comisiones");
  if (!canWrite(ctx, "comisiones")) {
    return { error: "No tienes permiso." };
  }

  const guideNumber = String(formData.get("guideNumber") ?? "").trim();
  const partnerId = String(formData.get("partnerId") ?? "").trim();
  const salespersonId = String(formData.get("salespersonId") ?? "").trim();
  const dateRaw = String(formData.get("date") ?? "").trim();
  const netAmount = parseInt(String(formData.get("netAmount") ?? ""), 10);
  const note = String(formData.get("note") ?? "").trim() || null;

  if (!guideNumber) return { error: "Indica el número de guía." };
  if (!partnerId) return { error: "Selecciona el cliente." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateRaw)) return { error: "Fecha inválida. Usa AAAA-MM-DD." };
  if (!Number.isFinite(netAmount) || netAmount <= 0) {
    return { error: "El neto debe ser un número positivo." };
  }

  const date = new Date(dateRaw + "T00:00:00Z");

  // Verificar unicidad del número de guía por empresa.
  const existing = await db.dispatchGuide.findFirst({
    where: { companyId: ctx.company.id, guideNumber },
    select: { id: true },
  });
  if (existing) return { error: `Ya existe una guía con número «${guideNumber}».` };

  // Vendedor: opcional. Las guías de compra del RCV no traen vendedor.
  let vendedorNombre: string | null = null;
  if (salespersonId) {
    const salesperson = await db.salesperson.findFirst({
      where: { id: salespersonId, companyId: ctx.company.id },
      select: { id: true, name: true },
    });
    if (!salesperson) return { error: "Vendedor no encontrado." };
    vendedorNombre = salesperson.name;
  }

  // Verificar cliente.
  const partner = await db.partner.findFirst({
    where: { id: partnerId, companyId: ctx.company.id },
    select: { id: true, name: true },
  });
  if (!partner) return { error: "Cliente no encontrado." };

  const guide = await db.dispatchGuide.create({
    data: {
      companyId: ctx.company.id,
      guideNumber,
      date,
      partnerId,
      salespersonId: salespersonId || null,
      netAmount,
      note,
      createdById: ctx.user.id,
    },
  });

  await recordAudit(ctx, {
    action: "CREATE",
    entityType: "DispatchGuide",
    entityId: guide.id,
    summary: `Registró la guía N° ${guideNumber} de ${partner.name}${vendedorNombre ? ` por ${vendedorNombre}` : ""}.`,
  });

  revalidatePath("/facturas/comisiones");
  revalidatePath("/facturas/comisiones/asignaciones");
  return { ok: true, guideId: guide.id, message: `Guía N° ${guideNumber} registrada.` };
}

export async function registerGuideFromVentas(
  _prev: RegisterDispatchGuideState,
  formData: FormData,
): Promise<RegisterDispatchGuideState> {
  const ctx = await requireContext("ventas");
  if (!canWrite(ctx, "ventas")) return { error: "No tienes permiso." };

  // reuse same logic by delegating: convert and call registerDispatchGuide is not possible
  // because context differs. Duplicate minimal logic.
  const guideNumber = String(formData.get("guideNumber") ?? "").trim();
  const partnerId = String(formData.get("partnerId") ?? "").trim();
  const salespersonId = String(formData.get("salespersonId") ?? "").trim();
  const dateRaw = String(formData.get("date") ?? "").trim();
  const netAmount = parseInt(String(formData.get("netAmount") ?? ""), 10);
  const note = String(formData.get("note") ?? "").trim() || null;

  if (!guideNumber) return { error: "Indica el número de guía." };
  if (!partnerId) return { error: "Selecciona el cliente." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateRaw)) return { error: "Fecha inválida. Usa AAAA-MM-DD." };
  if (!Number.isFinite(netAmount) || netAmount <= 0) return { error: "El neto debe ser un número positivo." };

  const date = new Date(dateRaw + "T00:00:00Z");
  const existing = await db.dispatchGuide.findFirst({ where: { companyId: ctx.company.id, guideNumber }, select: { id: true } });
  if (existing) return { error: `Ya existe una guía con número «${guideNumber}».` };

  const partner = await db.partner.findFirst({ where: { id: partnerId, companyId: ctx.company.id }, select: { id: true, name: true } });
  if (!partner) return { error: "Cliente no encontrado." };

  let vendedorNombre: string | null = null;
  if (salespersonId) {
    const salesperson = await db.salesperson.findFirst({ where: { id: salespersonId, companyId: ctx.company.id }, select: { id: true, name: true } });
    if (!salesperson) return { error: "Vendedor no encontrado." };
    vendedorNombre = salesperson.name;
  }

  const guide = await db.dispatchGuide.create({
    data: {
      companyId: ctx.company.id,
      guideNumber,
      date,
      partnerId,
      salespersonId: salespersonId || null,
      netAmount,
      note,
      createdById: ctx.user.id,
    },
  });

  await recordAudit(ctx, {
    action: "CREATE",
    entityType: "DispatchGuide",
    entityId: guide.id,
    summary: `Registró la guía N° ${guideNumber} de ${partner.name}${vendedorNombre ? ` por ${vendedorNombre}` : ""}.`,
  });

  await setFlash("success", "Guía registrada", `N° ${guideNumber}`);
  revalidatePath("/facturas/ventas/guias");
  redirect("/facturas/ventas/guias");
  return { ok: true, guideId: guide.id, message: `Guía N° ${guideNumber} registrada.` };
}

export type AssignGuideState = CommissionActionState;

/**
 * Asigna una guía de despacho registrada a un mes de comisión. Es el paso
 * final después de registrar la guía: ahora sí entra en el cálculo.
 */
export async function assignDispatchGuide(
  _prev: AssignGuideState,
  formData: FormData,
): Promise<AssignGuideState> {
  const ctx = await requireContext("comisiones");
  if (!canWrite(ctx, "comisiones")) {
    return { error: "No tienes permiso." };
  }

  const period = String(formData.get("period") ?? "").trim();
  const salespersonId = String(formData.get("salespersonId") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim() || null;
  const guideId = String(formData.get("guideId") ?? "").trim();

  if (!/^\d{4}-\d{2}$/.test(period)) return { error: "Período inválido." };
  if (!salespersonId) return { error: "Selecciona el vendedor." };
  if (!guideId) return { error: "Guía no indicada." };

  const closed = await db.commissionClose.findUnique({
    where: { companyId_period: { companyId: ctx.company.id, period } },
  });
  if (closed) return { error: `El período ${formatPeriod(period)} ya está cerrado.` };

  const guide = await db.dispatchGuide.findFirst({
    where: { id: guideId, companyId: ctx.company.id },
    select: { id: true, guideNumber: true, netAmount: true, salespersonId: true, assignment: { select: { id: true } }, entries: { select: { period: true } } },
  });
  if (!guide) return { error: "Guía no encontrada." };
  if (guide.assignment) return { error: "Esa guía ya tiene asignación." };
  if (guide.entries.length > 0) {
    return { error: "Esa guía ya comisionó en un mes cerrado." };
  }

  const person = await db.salesperson.findFirst({
    where: { id: salespersonId, companyId: ctx.company.id },
    select: { id: true, name: true },
  });
  if (!person) return { error: "Vendedor no encontrado." };

  await db.commissionAssignment.create({
    data: {
      companyId: ctx.company.id,
      dispatchGuideId: guide.id,
      period,
      salespersonId,
      note,
      createdById: ctx.user.id,
    },
  });

  await recordAudit(ctx, {
    action: "CREATE",
    entityType: "CommissionAssignment",
    summary: `Asignó la guía N° ${guide.guideNumber} a ${formatPeriod(period)} para ${person.name}.`,
  });

  revalidatePath("/facturas/comisiones");
  revalidatePath("/facturas/comisiones/asignaciones");
  return { ok: true, assigned: 1, message: `Guía N° ${guide.guideNumber} asignada a ${formatPeriod(period)}.` };
}

export type UnassignGuideState = CommissionActionState;

/** Quita la asignación de una guía. Vuelve a estar disponible para reasignar. */
export async function unassignDispatchGuide(
  _prev: UnassignGuideState,
  formData: FormData,
): Promise<UnassignGuideState> {
  const ctx = await requireContext("comisiones");
  if (!canWrite(ctx, "comisiones")) {
    return { error: "No tienes permiso." };
  }

  const guideId = String(formData.get("guideId") ?? "").trim();
  if (!guideId) return { error: "Guía no indicada." };

  const assignment = await db.commissionAssignment.findFirst({
    where: { dispatchGuideId: guideId, companyId: ctx.company.id },
    include: { dispatchGuide: { select: { guideNumber: true } } },
  });
  if (!assignment) return { error: "Esa guía no tiene asignación activa." };

  if (assignment.period) {
    const closed = await db.commissionClose.findUnique({
      where: { companyId_period: { companyId: ctx.company.id, period: assignment.period } },
    });
    if (closed) {
      return { error: `No se puede quitar: ${formatPeriod(assignment.period)} ya está cerrado.` };
    }
  }

  await db.commissionAssignment.delete({ where: { id: assignment.id } });

  await recordAudit(ctx, {
    action: "DELETE",
    entityType: "CommissionAssignment",
    entityId: assignment.id,
    summary: `Quitó la asignación de la guía N° ${assignment.dispatchGuide?.guideNumber}.`,
  });

  revalidatePath("/facturas/comisiones");
  revalidatePath("/facturas/comisiones/asignaciones");
  return { ok: true, message: "Asignación eliminada." };
}

