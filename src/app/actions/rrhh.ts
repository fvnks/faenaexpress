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
import { remunerationSchema, rrhhWorkerSchema } from "@/lib/validation";

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

  revalidatePath("/dashboard/rrhh");
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

  revalidatePath("/dashboard/rrhh");
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

  revalidatePath("/dashboard/rrhh");
  revalidatePath("/dashboard/gastos");
  revalidatePath("/dashboard");
  return { ok: true };
}

/** Elimina el pago y su gasto automático asociado. */
export async function deleteRemuneration(formData: FormData): Promise<void> {
  const ctx = await requireContext("rrhh");
  if (!canWrite(ctx, "rrhh")) {
    await setFlash("error", "No se pudo eliminar el pago", "No tienes permiso para gestionar RRHH.");
    redirect("/dashboard/rrhh");
  }

  const id = String(formData.get("id") ?? "");
  const remuneration = await db.remuneration.findFirst({
    where: { id, companyId: ctx.company.id },
    include: { worker: { select: { name: true } } },
  });
  if (!remuneration) redirect("/dashboard/rrhh");

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
  revalidatePath("/dashboard/rrhh");
  revalidatePath("/dashboard/gastos");
  redirect("/dashboard/rrhh");
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

  revalidatePath("/dashboard/rrhh");
  revalidatePath("/dashboard/gastos");
  revalidatePath("/dashboard");
  return { ok: true };
}

// --- Busca las remuneraciones por trabajador en src/lib/rrhh.ts ----------------
