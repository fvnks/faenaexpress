"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { recordAudit } from "@/lib/audit";
import { canWrite, requireContext } from "@/lib/auth";
import { closePayrollPeriod, generatePayrollEntries, getOrCreatePayrollPeriod, reopenPayrollPeriod, updatePayrollEntry } from "@/lib/payroll";

export async function createPayrollPeriodAction(formData: FormData): Promise<void> {
  const ctx = await requireContext("rrhh");
  if (!canWrite(ctx, "rrhh")) redirect("/dashboard/rrhh/nomina");

  const year = Number(formData.get("year") ?? new Date().getFullYear());
  const month = Number(formData.get("month") ?? new Date().getMonth() + 1);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    redirect("/dashboard/rrhh/nomina?error=" + encodeURIComponent("Año o mes inválido."));
  }

  let error: string | null = null;
  try {
    const period = await getOrCreatePayrollPeriod(ctx.company.id, Math.round(year), Math.round(month), ctx.user.id);
    await recordAudit(ctx, {
      action: "CREATE",
      entityType: "PayrollPeriod",
      entityId: period.id,
      summary: `Creó el período de nómina ${period.year}-${String(period.month).padStart(2, "0")}.`,
    });
    revalidatePath("/dashboard/rrhh/nomina");
    redirect(`/dashboard/rrhh/nomina/${period.id}`);
  } catch (thrown) {
    if (thrown && typeof thrown === "object" && "digest" in thrown) throw thrown;
    error = thrown instanceof Error ? thrown.message : "No se pudo crear el período.";
  }

  revalidatePath("/dashboard/rrhh/nomina");
  redirect("/dashboard/rrhh/nomina?error=" + encodeURIComponent(error ?? "No se pudo crear el período."));
}

export async function generatePayrollEntriesAction(formData: FormData): Promise<void> {
  const ctx = await requireContext("rrhh");
  if (!canWrite(ctx, "rrhh")) redirect("/dashboard/rrhh/nomina");
  const periodId = String(formData.get("periodId") ?? "");

  let error: string | null = null;
  try {
    await generatePayrollEntries(ctx.company.id, periodId);
    await recordAudit(ctx, {
      action: "UPDATE",
      entityType: "PayrollPeriod",
      entityId: periodId,
      summary: `Generó liquidaciones del período.`,
    });
  } catch (thrown) {
    if (thrown && typeof thrown === "object" && "digest" in thrown) throw thrown;
    error = thrown instanceof Error ? thrown.message : "No se pudieron generar las liquidaciones.";
  }

  revalidatePath(`/dashboard/rrhh/nomina/${periodId}`);
  if (error) {
    redirect(`/dashboard/rrhh/nomina/${periodId}?error=` + encodeURIComponent(error));
  }
  redirect(`/dashboard/rrhh/nomina/${periodId}`);
}

export async function updatePayrollEntryAction(formData: FormData): Promise<void> {
  const ctx = await requireContext("rrhh");
  if (!canWrite(ctx, "rrhh")) redirect("/dashboard/rrhh/nomina");
  const periodId = String(formData.get("periodId") ?? "");
  const entryId = String(formData.get("entryId") ?? "");
  const baseAmount = Number(formData.get("baseAmount") ?? "0");
  const allowances = Number(formData.get("allowances") ?? "0");
  const overtime = Number(formData.get("overtime") ?? "0");
  const otherDeductions = Number(formData.get("otherDeductions") ?? "0");

  let error: string | null = null;
  try {
    await updatePayrollEntry(ctx.company.id, periodId, entryId, {
      baseAmount: Number.isFinite(baseAmount) ? baseAmount : 0,
      allowances: Number.isFinite(allowances) ? allowances : 0,
      overtime: Number.isFinite(overtime) ? overtime : 0,
      otherDeductions: Number.isFinite(otherDeductions) ? otherDeductions : 0,
    });
  } catch (thrown) {
    if (thrown && typeof thrown === "object" && "digest" in thrown) throw thrown;
    error = thrown instanceof Error ? thrown.message : "No se pudo actualizar la liquidación.";
  }

  revalidatePath(`/dashboard/rrhh/nomina/${periodId}`);
  if (error) {
    redirect(`/dashboard/rrhh/nomina/${periodId}?error=` + encodeURIComponent(error));
  }
  redirect(`/dashboard/rrhh/nomina/${periodId}`);
}

export async function closePayrollPeriodAction(formData: FormData): Promise<void> {
  const ctx = await requireContext("rrhh");
  if (!canWrite(ctx, "rrhh")) redirect("/dashboard/rrhh/nomina");
  const periodId = String(formData.get("periodId") ?? "");
  const createExpenses = formData.get("createExpenses") === "on";

  let error: string | null = null;
  try {
    await closePayrollPeriod(ctx.company.id, periodId, ctx.user.id, createExpenses);
    await recordAudit(ctx, {
      action: "UPDATE",
      entityType: "PayrollPeriod",
      entityId: periodId,
      summary: "Cerró el período de nómina.",
    });
  } catch (thrown) {
    if (thrown && typeof thrown === "object" && "digest" in thrown) throw thrown;
    error = thrown instanceof Error ? thrown.message : "No se pudo cerrar el período.";
  }

  revalidatePath(`/dashboard/rrhh/nomina/${periodId}`);
  if (error) {
    redirect(`/dashboard/rrhh/nomina/${periodId}?error=` + encodeURIComponent(error));
  }
  redirect(`/dashboard/rrhh/nomina/${periodId}`);
}

export async function reopenPayrollPeriodAction(formData: FormData): Promise<void> {
  const ctx = await requireContext("rrhh");
  if (!canWrite(ctx, "rrhh")) redirect("/dashboard/rrhh/nomina");
  const periodId = String(formData.get("periodId") ?? "");

  let error: string | null = null;
  try {
    await reopenPayrollPeriod(ctx.company.id, periodId);
  } catch (thrown) {
    if (thrown && typeof thrown === "object" && "digest" in thrown) throw thrown;
    error = thrown instanceof Error ? thrown.message : "No se pudo reabrir el período.";
  }

  revalidatePath(`/dashboard/rrhh/nomina/${periodId}`);
  if (error) {
    redirect(`/dashboard/rrhh/nomina/${periodId}?error=` + encodeURIComponent(error));
  }
  redirect(`/dashboard/rrhh/nomina/${periodId}`);
}