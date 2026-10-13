"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { diffChanges, recordAudit } from "@/lib/audit";
import { canWrite, requireContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { setFlash } from "@/lib/flash";
import { computeTotal, formatCLP } from "@/lib/money";
import { expenseSchema, type ExpenseInput } from "@/lib/validation";

export type ExpenseFormState = { error?: string } | undefined;

function readForm(formData: FormData) {
  return {
    date: formData.get("date"),
    description: formData.get("description"),
    categoryId: formData.get("categoryId"),
    areaId: formData.get("areaId"),
    workerId: formData.get("workerId"),
    documentNumber: formData.get("documentNumber"),
    paymentMethod: formData.get("paymentMethod"),
    netAmount: formData.get("netAmount"),
    ivaAmount: formData.get("ivaAmount"),
    paidById: formData.get("paidById"),
    reimbursed: formData.get("reimbursed"),
    reimbursedAt: formData.get("reimbursedAt"),
    notes: formData.get("notes"),
  };
}

function toData(input: ExpenseInput) {
  return {
    date: input.date,
    description: input.description,
    categoryId: input.categoryId ?? null,
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

export async function createExpense(
  _prev: ExpenseFormState,
  formData: FormData,
): Promise<ExpenseFormState> {
  const ctx = await requireContext();
  if (!canWrite(ctx, "gastos")) return { error: "No tienes permiso para registrar gastos." };

  const parsed = expenseSchema.safeParse(readForm(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revisa los datos." };

  const data = toData(parsed.data);
  const expense = await db.expense.create({
    data: { ...data, companyId: ctx.company.id, createdById: ctx.user.id },
  });

  await recordAudit(ctx, {
    action: "CREATE",
    entityType: "Expense",
    entityId: expense.id,
    summary: `Registró un ${describe(data)}.`,
  });

  await setFlash("success", "Gasto guardado", describe(data));
  revalidatePath("/dashboard/gastos");
  revalidatePath("/dashboard");
  redirect("/dashboard/gastos");
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

  const before = await db.expense.findFirst({ where: { id, companyId: ctx.company.id } });
  if (!before) return { error: "El gasto no existe." };

  const data = toData(parsed.data);
  await db.expense.update({ where: { id, companyId: ctx.company.id }, data });

  await recordAudit(ctx, {
    action: "UPDATE",
    entityType: "Expense",
    entityId: id,
    summary: `Editó un ${describe(data)}.`,
    changes: diffChanges(before, data),
  });

  await setFlash("success", "Gasto actualizado", describe(data));
  revalidatePath("/dashboard/gastos");
  revalidatePath(`/dashboard/gastos/${id}`);
  redirect(`/dashboard/gastos/${id}`);
}

export async function markExpenseReimbursed(formData: FormData): Promise<void> {
  const ctx = await requireContext();
  if (!canWrite(ctx, "gastos")) redirect("/dashboard/gastos");

  const id = String(formData.get("id") ?? "");
  const expense = await db.expense.findFirst({ where: { id, companyId: ctx.company.id } });
  if (!expense) redirect("/dashboard/gastos");

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
  revalidatePath("/dashboard/gastos");
  revalidatePath(`/dashboard/gastos/${id}`);
  redirect(`/dashboard/gastos/${id}`);
}

export async function markExpensePending(formData: FormData): Promise<void> {
  const ctx = await requireContext();
  if (!canWrite(ctx, "gastos")) redirect("/dashboard/gastos");

  const id = String(formData.get("id") ?? "");
  const expense = await db.expense.findFirst({ where: { id, companyId: ctx.company.id } });
  if (!expense) redirect("/dashboard/gastos");

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
  revalidatePath("/dashboard/gastos");
  revalidatePath(`/dashboard/gastos/${id}`);
  redirect(`/dashboard/gastos/${id}`);
}

export async function deleteExpense(formData: FormData): Promise<void> {
  const ctx = await requireContext();
  if (!canWrite(ctx, "gastos")) redirect("/dashboard/gastos");

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
  revalidatePath("/dashboard/gastos");
  redirect("/dashboard/gastos");
}
