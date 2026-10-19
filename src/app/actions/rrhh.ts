"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { recordAudit } from "@/lib/audit";
import { canWrite, requireContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { remunerationTypeLabel } from "@/lib/labels";
import { formatCLP } from "@/lib/money";
import { normalizeRut } from "@/lib/rut";
import { setFlash } from "@/lib/flash";
import { partnerRutExists } from "@/lib/rrhh";
import { remunerationSchema, rrhhAbsenceSchema, rrhhWorkerSchema } from "@/lib/validation";

export type RrhhFormState = { error?: string; ok?: boolean } | undefined;

// --- Trabajadores -----------------------------------------------------------

export async function createRrhhWorker(_prev: RrhhFormState, formData: FormData): Promise<RrhhFormState> {
  const ctx = await requireContext("rrhh");
  if (!canWrite(ctx, "rrhh")) return { error: "No tienes permiso para gestionar RRHH." };

  const parsed = rrhhWorkerSchema.safeParse({
    name: formData.get("name"),
    rut: formData.get("rut"),
    active: formData.get("active") ?? "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revisa los datos." };

  const rut = parsed.data.rut ? normalizeRut(parsed.data.rut) : null;
  if (rut) {
    const clash = await db.worker.findFirst({ where: { companyId: ctx.company.id, rut } });
    if (clash) return { error: "Ya existe un trabajador con ese RUT." };
    // Un cliente o proveedor no se convierte en trabajador: mantén los RUT
    // separados entre Terceros y RRHH.
    if (await partnerRutExists(ctx.company.id, rut)) {
      return { error: "Ese RUT ya está registrado como cliente o proveedor. Los trabajadores llevan RUT propios, separados de Terceros." };
    }
  }
  const clashName = await db.worker.findFirst({
    where: { companyId: ctx.company.id, name: parsed.data.name },
  });
  if (clashName) return { error: "Ya existe un trabajador con ese nombre." };

  const worker = await db.worker.create({
    data: {
      companyId: ctx.company.id,
      name: parsed.data.name,
      rut,
      active: parsed.data.active,
      position: parsed.data.position ?? null,
      areaId: parsed.data.areaId ?? null,
      email: parsed.data.email ?? null,
      phone: parsed.data.phone ?? null,
      address: parsed.data.address ?? null,
      city: parsed.data.city ?? null,
      birthDate: parsed.data.birthDate ?? null,
      hireDate: parsed.data.hireDate ?? null,
      terminationDate: parsed.data.terminationDate ?? null,
      contractType: parsed.data.contractType ?? null,
      status: parsed.data.status ?? null,
      baseAmount: parsed.data.baseAmount ?? null,
      bankName: parsed.data.bankName ?? null,
      bankAccount: parsed.data.bankAccount ?? null,
      afp: parsed.data.afp ?? null,
      healthPlan: parsed.data.healthPlan ?? null,
      notes: parsed.data.notes ?? null,
    },
  });
  await recordAudit(ctx, {
    action: "CREATE",
    entityType: "Worker",
    entityId: worker.id,
    summary: `Creó al trabajador «${worker.name}»${worker.rut ? ` (${worker.rut})` : ""}.`,
  });

  revalidatePath("/facturas/rrhh");
  return { ok: true };
}

export async function updateRrhhWorker(
  id: string,
  _prev: RrhhFormState,
  formData: FormData,
): Promise<RrhhFormState> {
  const ctx = await requireContext("rrhh");
  if (!canWrite(ctx, "rrhh")) return { error: "No tienes permiso para gestionar RRHH." };

  const parsed = rrhhWorkerSchema.safeParse({
    name: formData.get("name"),
    rut: formData.get("rut"),
    active: formData.get("active") ?? "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revisa los datos." };

  const rut = parsed.data.rut ? normalizeRut(parsed.data.rut) : null;
  if (rut) {
    const clash = await db.worker.findFirst({ where: { companyId: ctx.company.id, rut } });
    if (clash && clash.id !== id) return { error: "Ya existe otro trabajador con ese RUT." };
    if (await partnerRutExists(ctx.company.id, rut)) {
      return { error: "Ese RUT ya está registrado como cliente o proveedor. Los trabajadores llevan RUT propios, separados de Terceros." };
    }
  }
  const clashName = await db.worker.findFirst({
    where: { companyId: ctx.company.id, name: parsed.data.name },
  });
  if (clashName && clashName.id !== id) return { error: "Ya existe otro trabajador con ese nombre." };

  await db.worker.update({
    where: { id, companyId: ctx.company.id },
    data: {
      name: parsed.data.name,
      rut,
      active: parsed.data.active,
      position: parsed.data.position ?? null,
      areaId: parsed.data.areaId ?? null,
      email: parsed.data.email ?? null,
      phone: parsed.data.phone ?? null,
      address: parsed.data.address ?? null,
      city: parsed.data.city ?? null,
      birthDate: parsed.data.birthDate ?? null,
      hireDate: parsed.data.hireDate ?? null,
      terminationDate: parsed.data.terminationDate ?? null,
      contractType: parsed.data.contractType ?? null,
      status: parsed.data.status ?? null,
      baseAmount: parsed.data.baseAmount ?? null,
      bankName: parsed.data.bankName ?? null,
      bankAccount: parsed.data.bankAccount ?? null,
      afp: parsed.data.afp ?? null,
      healthPlan: parsed.data.healthPlan ?? null,
      notes: parsed.data.notes ?? null,
    },
  });
  await recordAudit(ctx, {
    action: "UPDATE",
    entityType: "Worker",
    entityId: id,
    summary: `Editó al trabajador «${parsed.data.name}».`,
  });

  revalidatePath("/facturas/rrhh");
  return { ok: true };
}

// --- Remuneraciones ---------------------------------------------------------

function remunerationDescription(input: {
  type: string;
  workerName: string;
  period?: string | null;
}) {
  const periodo = input.period ? ` — ${input.period}` : "";
  return `${remunerationTypeLabel(input.type)} de ${input.workerName}${periodo}`;
}

/**
 * Registra un pago (sueldo, aguinaldo, bono, adelanto) y crea automáticamente
 * el gasto asociado: con el trabajador, sin IVA (las remuneraciones no dan
 * crédito fiscal) y con el pagador elegido. Así el desembolso fluye a los
 * reportes y al desglose por trabajador sin duplicar registro.
 */
export async function createRemuneration(
  _prev: RrhhFormState,
  formData: FormData,
): Promise<RrhhFormState> {
  const ctx = await requireContext("rrhh");
  if (!canWrite(ctx, "rrhh")) return { error: "No tienes permiso para gestionar RRHH." };

  const parsed = remunerationSchema.safeParse({
    workerId: formData.get("workerId"),
    type: formData.get("type"),
    period: formData.get("period"),
    date: formData.get("date"),
    amount: formData.get("amount"),
    paidById: formData.get("paidById"),
    paymentMethod: formData.get("paymentMethod"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revisa los datos." };

  const worker = await db.worker.findFirst({
    where: { id: parsed.data.workerId, companyId: ctx.company.id },
  });
  if (!worker) return { error: "El trabajador no existe en esta empresa." };

  const description = remunerationDescription({
    type: parsed.data.type,
    workerName: worker.name,
    period: parsed.data.period,
  });

  // Gasto automático: categoría "Remuneraciones" si existe, sin IVA.
  const category = await db.category.findFirst({
    where: { companyId: ctx.company.id, active: true, name: "Remuneraciones" },
    select: { id: true },
  });

  const { expense, remuneration } = await db.$transaction(async (tx) => {
    const expense = await tx.expense.create({
      data: {
        companyId: ctx.company.id,
        createdById: ctx.user.id,
        date: parsed.data.date,
        description,
        categoryId: category?.id ?? null,
        workerId: worker.id,
        netAmount: parsed.data.amount,
        ivaAmount: 0,
        totalAmount: parsed.data.amount,
        paymentMethod: parsed.data.paymentMethod,
        paidById: parsed.data.paidById,
        reimbursed: false,
        notes: parsed.data.notes ?? null,
      },
    });

    const remuneration = await tx.remuneration.create({
      data: {
        companyId: ctx.company.id,
        workerId: worker.id,
        type: parsed.data.type,
        period: parsed.data.period ?? null,
        date: parsed.data.date,
        amount: parsed.data.amount,
        paidById: parsed.data.paidById,
        expenseId: expense.id,
        notes: parsed.data.notes ?? null,
        createdById: ctx.user.id,
      },
    });

    return { expense, remuneration };
  });

  await recordAudit(ctx, {
    action: "CREATE",
    entityType: "Remuneration",
    entityId: remuneration.id,
    summary: `Registró ${description.toLowerCase()} por ${formatCLP(parsed.data.amount)} (genera gasto automático).`,
  });

  revalidatePath("/facturas/rrhh");
  revalidatePath("/facturas/gastos");
  revalidatePath("/facturas");
  return { ok: true };
}

/** Elimina el pago y su gasto automático asociado. */
export async function deleteRemuneration(formData: FormData): Promise<void> {
  const ctx = await requireContext("rrhh");
  if (!canWrite(ctx, "rrhh")) {
    await setFlash("error", "No se pudo eliminar el pago", "No tienes permiso para gestionar RRHH.");
    redirect("/facturas/rrhh");
  }

  const id = String(formData.get("id") ?? "");
  const remuneration = await db.remuneration.findFirst({
    where: { id, companyId: ctx.company.id },
    include: { worker: { select: { name: true } } },
  });
  if (!remuneration) redirect("/facturas/rrhh");

  // Borra primero la remuneración (referencia al gasto) y luego el gasto.
  await db.remuneration.delete({ where: { id, companyId: ctx.company.id } });
  if (remuneration.expenseId) {
    await db.expense.deleteMany({ where: { id: remuneration.expenseId, companyId: ctx.company.id } });
  }

  await recordAudit(ctx, {
    action: "DELETE",
    entityType: "Remuneration",
    entityId: id,
    summary: `Eliminó el pago a ${remuneration.worker.name} por ${formatCLP(remuneration.amount)} (y su gasto asociado).`,
  });

  await setFlash("success", "Pago eliminado", remuneration.worker.name);
  revalidatePath("/facturas/rrhh");
  revalidatePath("/facturas/gastos");
  redirect("/facturas/rrhh");
}

// --- Pagos por lote ----------------------------------------------------------

export async function createBulkRemuneration(
  _prev: RrhhFormState,
  formData: FormData,
): Promise<RrhhFormState> {
  const ctx = await requireContext("rrhh");
  if (!canWrite(ctx, "rrhh")) return { error: "No tienes permiso para gestionar RRHH." };

  const dateRaw = formData.get("date");
  const typeRaw = formData.get("type");
  const paidById = String(formData.get("paidById") ?? "");
  const periodRaw = formData.get("period");
  const notesRaw = formData.get("notes");

  const common = remunerationSchema.safeParse({
    workerId: "temp",
    type: typeRaw,
    period: periodRaw,
    date: dateRaw,
    amount: 1,
    paidById: paidById,
    paymentMethod: formData.get("paymentMethod"),
    notes: notesRaw,
  });
  if (!common.success) {
    const first = common.error.issues.filter((i) => i.path[0] !== "workerId" && i.path[0] !== "amount")[0];
    return { error: first?.message ?? "Revisa los datos comunes del pago por lote." };
  }

  const workerIds = formData.getAll("workerId").map(String);
  const amounts = formData.getAll("amount").map(String);
  const selected = new Set(formData.getAll("selected").map(String));

  const entries: { workerId: string; amount: number }[] = [];
  for (let i = 0; i < workerIds.length; i += 1) {
    const id = workerIds[i];
    if (!selected.has(id)) continue;
    const amount = Number(amounts[i] ?? "0");
    if (!Number.isFinite(amount) || amount <= 0) {
      return { error: `Monto inválido para el trabajador #${i + 1}.` };
    }
    entries.push({ workerId: id, amount: Math.round(amount) });
  }
  if (entries.length === 0) return { error: "Selecciona al menos un trabajador." };

  const workers = await db.worker.findMany({
    where: { companyId: ctx.company.id, id: { in: entries.map((entry) => entry.workerId) } },
    select: { id: true, name: true },
  });
  if (workers.length !== entries.length) return { error: "Algún trabajador no existe en esta empresa." };

  const category = await db.category.findFirst({
    where: { companyId: ctx.company.id, active: true, name: "Remuneraciones" },
    select: { id: true },
  });

  const total = entries.reduce((acc, entry) => acc + entry.amount, 0);
  const created = await db.$transaction(async (tx) => {
    const createdIds: string[] = [];
    for (const entry of entries) {
      const worker = workers.find((item) => item.id === entry.workerId)!;
      const description = remunerationDescription({
        type: common.data.type,
        workerName: worker.name,
        period: common.data.period ?? null,
      });
      const expense = await tx.expense.create({
        data: {
          companyId: ctx.company.id,
          createdById: ctx.user.id,
          date: common.data.date,
          description,
          categoryId: category?.id ?? null,
          workerId: worker.id,
          netAmount: entry.amount,
          ivaAmount: 0,
          totalAmount: entry.amount,
          paymentMethod: common.data.paymentMethod,
          paidById: common.data.paidById,
          reimbursed: false,
          notes: common.data.notes ?? null,
        },
      });
      const remuneration = await tx.remuneration.create({
        data: {
          companyId: ctx.company.id,
          workerId: worker.id,
          type: common.data.type,
          period: common.data.period ?? null,
          date: common.data.date,
          amount: entry.amount,
          paidById: common.data.paidById,
          expenseId: expense.id,
          notes: common.data.notes ?? null,
          createdById: ctx.user.id,
        },
      });
      createdIds.push(remuneration.id);
    }
    return createdIds;
  });

  await recordAudit(ctx, {
    action: "CREATE",
    entityType: "Remuneration",
    entityId: created[0] ?? ctx.company.id,
    summary: `Registró pago por lote: ${entries.length} trabajador(es), total ${formatCLP(total)}.`,
  });

  revalidatePath("/facturas/rrhh");
  revalidatePath("/facturas/gastos");
  revalidatePath("/facturas");
  return { ok: true };
}

// --- Ausencias y licencias ----------------------------------------------------

export async function createAbsence(
  _prev: RrhhFormState,
  formData: FormData,
): Promise<RrhhFormState> {
  const ctx = await requireContext("rrhh");
  if (!canWrite(ctx, "rrhh")) return { error: "No tienes permiso para gestionar RRHH." };

  const parsed = rrhhAbsenceSchema.safeParse({
    workerId: formData.get("workerId"),
    type: formData.get("type"),
    status: formData.get("status"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    paid: formData.get("paid"),
    reason: formData.get("reason"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revisa los datos." };

  const worker = await db.worker.findFirst({ where: { id: parsed.data.workerId, companyId: ctx.company.id } });
  if (!worker) return { error: "Trabajador no encontrado." };
  if (parsed.data.endDate < parsed.data.startDate) return { error: "La fecha de término no puede ser anterior al inicio." };

  const absence = await db.absence.create({
    data: {
      companyId: ctx.company.id,
      workerId: worker.id,
      type: parsed.data.type,
      status: parsed.data.status,
      startDate: parsed.data.startDate,
      endDate: parsed.data.endDate,
      paid: parsed.data.paid,
      reason: parsed.data.reason ?? null,
      notes: parsed.data.notes ?? null,
      approvedById: (parsed.data.status === "APPROVED" || parsed.data.status === "REJECTED") ? ctx.user.id : null,
    },
  });
  await recordAudit(ctx, {
    action: "CREATE",
    entityType: "Absence",
    entityId: absence.id,
    summary: `Registró ${parsed.data.type} para ${worker.name}.`,
  });
  revalidatePath("/facturas/rrhh");
  revalidatePath(`/facturas/rrhh/trabajadores/${worker.id}`);
  return { ok: true };
}

export async function deleteAbsence(formData: FormData): Promise<void> {
  const ctx = await requireContext("rrhh");
  if (!canWrite(ctx, "rrhh")) {
    await setFlash("error", "No se pudo eliminar la ausencia", "Sin permiso.");
    redirect("/facturas/rrhh");
  }
  const id = String(formData.get("id") ?? "");
  const absence = await db.absence.findFirst({ where: { id, companyId: ctx.company.id }, include: { worker: { select: { name: true } } } });
  if (!absence) redirect("/facturas/rrhh");
  await db.absence.delete({ where: { id, companyId: ctx.company.id } });
  await recordAudit(ctx, {
    action: "DELETE",
    entityType: "Absence",
    entityId: id,
    summary: `Eliminó una ausencia de ${absence.worker.name}.`,
  });
  revalidatePath(`/facturas/rrhh/trabajadores/${absence.workerId}`);
  redirect(`/facturas/rrhh/trabajadores/${absence.workerId}`);
}

// --- Documentos adjuntos ------------------------------------------------------

const workerDocumentTypeValues = ["CONTRACT", "ANNEX", "CERTIFICATE", "OTHER"] as const;

export async function uploadWorkerDocument(
  _prev: RrhhFormState,
  formData: FormData,
): Promise<RrhhFormState> {
  const ctx = await requireContext("rrhh");
  if (!canWrite(ctx, "rrhh")) return { error: "No tienes permiso para gestionar RRHH." };

  const workerId = String(formData.get("workerId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const type = (formData.get("type") ?? "OTHER") as (typeof workerDocumentTypeValues)[number];
  const descriptionRaw = formData.get("description");
  const file = formData.get("file");

  if (!workerId) return { error: "Trabajador requerido." };
  if (title.length < 1 || title.length > 120) return { error: "Ingresa un título (1-120)." };
  if (!(file instanceof File) || file.size === 0) return { error: "Selecciona un archivo." };
  if (file.size > 5 * 1024 * 1024) return { error: "El archivo supera 5 MB." };

  const worker = await db.worker.findFirst({ where: { id: workerId, companyId: ctx.company.id } });
  if (!worker) return { error: "Trabajador no encontrado." };

  const buffer = Buffer.from(await file.arrayBuffer());
  const doc = await db.workerDocument.create({
    data: {
      companyId: ctx.company.id,
      workerId,
      title,
      type,
      description: descriptionRaw ? String(descriptionRaw).trim().slice(0, 500) : null,
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: file.size,
      fileData: buffer,
      uploadedById: ctx.user.id,
    },
  });
  await recordAudit(ctx, {
    action: "CREATE",
    entityType: "WorkerDocument",
    entityId: doc.id,
    summary: `Adjuntó «${title}» a ${worker.name}.`,
  });
  revalidatePath(`/facturas/rrhh/trabajadores/${workerId}`);
  return { ok: true };
}

export async function deleteWorkerDocument(formData: FormData): Promise<void> {
  const ctx = await requireContext("rrhh");
  if (!canWrite(ctx, "rrhh")) {
    await setFlash("error", "No se pudo eliminar el documento", "Sin permiso.");
    redirect("/facturas/rrhh");
  }
  const id = String(formData.get("id") ?? "");
  const workerId = String(formData.get("workerId") ?? "");
  const doc = await db.workerDocument.findFirst({ where: { id, companyId: ctx.company.id } });
  if (!doc) redirect("/facturas/rrhh");
  await db.workerDocument.delete({ where: { id, companyId: ctx.company.id } });
  await recordAudit(ctx, {
    action: "DELETE",
    entityType: "WorkerDocument",
    entityId: id,
    summary: `Eliminó un documento adjunto.`,
  });
  revalidatePath(`/facturas/rrhh/trabajadores/${workerId}`);
  redirect(`/facturas/rrhh/trabajadores/${workerId}`);
}

// --- Descarga de documentos --------------------------------------------------
// (la descarga se sirve directamente desde la tabla; no requiere ruta extra)
