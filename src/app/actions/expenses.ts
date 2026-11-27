"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { diffChanges, recordAudit } from "@/lib/audit";
import { canWrite, requireContext } from "@/lib/auth";
import { resolverCentroGasto } from "@/lib/centros-costo";
import { db } from "@/lib/db";
import { setFlash } from "@/lib/flash";
import { computeTotal, formatCLP } from "@/lib/money";
import { checkPlanLimit, incrementUsage } from "@/lib/plans";
import {
  descripcionGasto,
  obraEsImputable,
  sincronizarCostoObra,
} from "@/lib/obra-imputacion";
import { expenseSchema, type ExpenseInput } from "@/lib/validation";

export type ExpenseFormState = { error?: string } | undefined;

function readForm(formData: FormData) {
  return {
    date: formData.get("date"),
    description: formData.get("description"),
    categoryId: formData.get("categoryId"),
    centroCostoId: formData.get("centroCostoId"),
    areaId: formData.get("areaId"),
    workerId: formData.get("workerId"),
    documentNumber: formData.get("documentNumber"),
    paymentMethod: formData.get("paymentMethod"),
    netAmount: formData.get("netAmount"),
    ivaAmount: formData.get("ivaAmount"),
    paidById: formData.get("paidById"),
    reimbursed: formData.get("reimbursed"),
    reimbursedAt: formData.get("reimbursedAt"),
    // Solo se acepta si el formulario ofrecía el selector: un POST de un
    // cliente sin módulo Obras no debe adivinar una imputación.
    obraId: formData.get("obraCampo") === "1" ? formData.get("obraId") : null,
    notes: formData.get("notes"),
  };
}

function toData(input: ExpenseInput) {
  return {
    date: input.date,
    description: input.description,
    categoryId: input.categoryId ?? null,
    centroCostoId: input.centroCostoId ?? null,
    areaId: input.areaId ?? null,
    workerId: input.workerId ?? null,
    documentNumber: input.documentNumber ?? null,
    paymentMethod: input.paymentMethod,
    netAmount: input.netAmount,
    ivaAmount: input.ivaAmount,
    // El total siempre se recalcula en el servidor.
    totalAmount: computeTotal(input.netAmount, input.ivaAmount),
    paidById: input.paidById,
    reimbursed: input.reimbursed,
    reimbursedAt: input.reimbursed ? (input.reimbursedAt ?? new Date()) : null,
    obraId: input.obraId ?? null,
    notes: input.notes ?? null,
  };
}

function describe(input: { description: string; netAmount: number; ivaAmount: number }) {
  return `gasto «${input.description}» por ${formatCLP(computeTotal(input.netAmount, input.ivaAmount))}`;
}

function parseDate(value: FormDataEntryValue | null): Date {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T00:00:00.000Z`)
    : new Date();
}

/**
 * A dónde volver después de guardar. Se llega desde la bandeja del banco cuando
 * el gasto se registra a partir de un movimiento; solo se aceptan rutas del
 * panel, así que un `volver` armado a mano no puede redirigir a otro sitio.
 */
function returnTo(formData: FormData): string {
  const raw = String(formData.get("volver") ?? "");
  return raw.startsWith("/facturas/") ? raw : "/facturas/gastos";
}

export async function createExpense(
  _prev: ExpenseFormState,
  formData: FormData,
): Promise<ExpenseFormState> {
  const ctx = await requireContext();
  if (!canWrite(ctx, "gastos")) return { error: "No tienes permiso para registrar gastos." };

  // El corte va en la acción, no en el botón: un POST directo lo saltaría.
  const organizationId = ctx.user.orgMembership?.organizationId ?? null;
  const bloqueado = await checkPlanLimit(organizationId, "documents");
  if (bloqueado) return { error: bloqueado };

  const parsed = expenseSchema.safeParse(readForm(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revisa los datos." };
  if (parsed.data.obraId && !(await obraEsImputable(parsed.data.obraId))) {
    return { error: "No tienes acceso a esa obra." };
  }

  const centro = await resolverCentroGasto(
    ctx.company.id,
    parsed.data.categoryId,
    parsed.data.centroCostoId,
  );
  if (centro.error) return { error: centro.error };
  const data = { ...toData(parsed.data), centroCostoId: centro.centroCostoId };
  const expense = await db.$transaction(async (tx) => {
    const creado = await tx.expense.create({
      data: { ...data, companyId: ctx.company.id, createdById: ctx.user.id },
    });
    await sincronizarCostoObra(tx, {
      sourceType: "EXPENSE",
      sourceId: creado.id,
      obraId: data.obraId ?? null,
      habilitado: formData.get("obraCampo") === "1",
      monto: data.totalAmount,
      fecha: data.date,
      descripcion: descripcionGasto(data.description),
    });
    return creado;
  });

  // El contador de documentos del mes.
  if (organizationId) {
    await incrementUsage(organizationId, { documents: 1 });
  }

  await recordAudit(ctx, {
    action: "CREATE",
    entityType: "Expense",
    entityId: expense.id,
    summary: `Registró un ${describe(data)}.`,
  });

  await setFlash("success", "Gasto guardado", describe(data));
  const back = returnTo(formData);
  revalidatePath("/facturas/gastos");
  revalidatePath("/facturas/reportes/centros-costo");
  revalidatePath("/facturas");
  if (back.startsWith("/facturas/banco")) revalidatePath("/facturas/banco");
  for (const ruta of ["/obras", "/obras/gastos", "/obras/presupuesto", "/obras/reportes"]) {
    revalidatePath(ruta);
  }
  redirect(back);
}

export async function updateExpense(
  id: string,
  _prev: ExpenseFormState,
  formData: FormData,
): Promise<ExpenseFormState> {
  const ctx = await requireContext();
  if (!canWrite(ctx, "gastos")) return { error: "No tienes permiso para editar gastos." };

  const parsed = expenseSchema.safeParse(readForm(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revisa los datos." };
  if (parsed.data.obraId && !(await obraEsImputable(parsed.data.obraId))) {
    return { error: "No tienes acceso a esa obra." };
  }

  const before = await db.expense.findFirst({ where: { id, companyId: ctx.company.id } });
  if (!before) return { error: "El gasto no existe." };

  const centro = await resolverCentroGasto(
    ctx.company.id,
    parsed.data.categoryId,
    parsed.data.centroCostoId,
  );
  if (centro.error) return { error: centro.error };
  const data = { ...toData(parsed.data), centroCostoId: centro.centroCostoId };
  await db.$transaction(async (tx) => {
    await tx.expense.update({ where: { id, companyId: ctx.company.id }, data });
    await sincronizarCostoObra(tx, {
      sourceType: "EXPENSE",
      sourceId: id,
      obraId: data.obraId ?? null,
      habilitado: formData.get("obraCampo") === "1",
      monto: data.totalAmount,
      fecha: data.date,
      descripcion: descripcionGasto(data.description),
    });
  });

  await recordAudit(ctx, {
    action: "UPDATE",
    entityType: "Expense",
    entityId: id,
    summary: `Editó un ${describe(data)}.`,
    changes: diffChanges(before, data),
  });

  await setFlash("success", "Gasto actualizado", describe(data));
  revalidatePath("/facturas/gastos");
  revalidatePath(`/facturas/gastos/${id}`);
  revalidatePath("/facturas/reportes/centros-costo");
  for (const ruta of ["/obras", "/obras/gastos", "/obras/presupuesto", "/obras/reportes"]) {
    revalidatePath(ruta);
  }
  redirect(`/facturas/gastos/${id}`);
}

export async function markExpenseReimbursed(formData: FormData): Promise<void> {
  const ctx = await requireContext();
  if (!canWrite(ctx, "gastos")) redirect("/facturas/gastos");

  const id = String(formData.get("id") ?? "");
  const expense = await db.expense.findFirst({ where: { id, companyId: ctx.company.id } });
  if (!expense) redirect("/facturas/gastos");

  await db.expense.update({
    where: { id, companyId: ctx.company.id },
    data: { reimbursed: true, reimbursedAt: parseDate(formData.get("reimbursedAt")) },
  });

  await recordAudit(ctx, {
    action: "UPDATE",
    entityType: "Expense",
    entityId: id,
    summary: `Marcó como reembolsado el ${describe(expense)}.`,
    changes: { reimbursed: { before: expense.reimbursed, after: true } },
  });

  await setFlash("success", "Gasto marcado como reembolsado");
  revalidatePath("/facturas/gastos");
  revalidatePath(`/facturas/gastos/${id}`);
  redirect(`/facturas/gastos/${id}`);
}

export async function markExpensePending(formData: FormData): Promise<void> {
  const ctx = await requireContext();
  if (!canWrite(ctx, "gastos")) redirect("/facturas/gastos");

  const id = String(formData.get("id") ?? "");
  const expense = await db.expense.findFirst({ where: { id, companyId: ctx.company.id } });
  if (!expense) redirect("/facturas/gastos");

  await db.expense.update({
    where: { id, companyId: ctx.company.id },
    data: { reimbursed: false, reimbursedAt: null },
  });

  await recordAudit(ctx, {
    action: "UPDATE",
    entityType: "Expense",
    entityId: id,
    summary: `Marcó como pendiente de reembolso el ${describe(expense)}.`,
    changes: { reimbursed: { before: expense.reimbursed, after: false } },
  });

  await setFlash("success", "Gasto marcado como pendiente de reembolso");
  revalidatePath("/facturas/gastos");
  revalidatePath(`/facturas/gastos/${id}`);
  redirect(`/facturas/gastos/${id}`);
}

export async function deleteExpense(formData: FormData): Promise<void> {
  const ctx = await requireContext();
  if (!canWrite(ctx, "gastos")) redirect("/facturas/gastos");

  const id = String(formData.get("id") ?? "");
  if (id) {
    const expense = await db.expense.findFirst({ where: { id, companyId: ctx.company.id } });
    if (expense) {
      await db.expense.delete({ where: { id, companyId: ctx.company.id } });
      await recordAudit(ctx, {
        action: "DELETE",
        entityType: "Expense",
        entityId: id,
        summary: `Eliminó el ${describe(expense)}.`,
      });
      await setFlash("success", "Gasto eliminado", expense.description);
    }
  }
  revalidatePath("/facturas/gastos");
  redirect("/facturas/gastos");
}
