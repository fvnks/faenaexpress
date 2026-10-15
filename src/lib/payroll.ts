import type { PayrollStatus } from "@/generated/prisma/client";

import { db } from "@/lib/db";

export const payrollStatusLabels: Record<PayrollStatus, string> = {
  DRAFT: "Borrador",
  CLOSED: "Cerrado",
};

export function calcPayrollEntry(input: {
  grossAmount: number;
  allowances: number;
  overtime: number;
  otherDeductions: number;
  company: { afpRate: number; healthRate: number; unemploymentRate: number; anualBonusRate: number };
}) {
  const grossAmount = Math.max(0, input.grossAmount);
  const allowances = Math.max(0, input.allowances);
  const overtime = Math.max(0, input.overtime);
  const otherDeductions = Math.max(0, input.otherDeductions);
  const gross = grossAmount + allowances + overtime;
  const afpAmount = Math.round((gross * input.company.afpRate) / 100);
  const healthAmount = Math.round((gross * input.company.healthRate) / 100);
  const unemploymentAmount = Math.round((gross * input.company.unemploymentRate) / 100);
  const taxAmount = 0;
  const deductionsTotal = afpAmount + healthAmount + unemploymentAmount + taxAmount + otherDeductions;
  const netAmount = Math.max(0, gross - deductionsTotal);
  return {
    gross,
    afpAmount,
    healthAmount,
    unemploymentAmount,
    taxAmount,
    deductionsTotal,
    netAmount,
  };
}

export async function getOrCreatePayrollPeriod(companyId: string, year: number, month: number, createdById: string) {
  const existing = await db.payrollPeriod.findUnique({
    where: { companyId_year_month: { companyId, year, month } },
  });
  if (existing) return existing;
  return db.payrollPeriod.create({ data: { companyId, year, month, createdById } });
}

export async function generatePayrollEntries(companyId: string, periodId: string) {
  const period = await db.payrollPeriod.findFirst({ where: { id: periodId, companyId } });
  if (!period) throw new Error("Periodo no existe.");
  if (period.status !== "DRAFT") throw new Error("El periodo esta cerrado.");
  const existing = await db.payrollEntry.count({ where: { periodId } });
  if (existing > 0) return existing;

  const company = await db.company.findUnique({
    where: { id: companyId },
    select: { afpRate: true, healthRate: true, unemploymentRate: true, anualBonusRate: true },
  });
  if (!company) throw new Error("Empresa no existe.");

  const workers = await db.worker.findMany({
    where: { companyId, active: true },
    orderBy: { name: "asc" },
  });

  await db.$transaction(async (tx) => {
    for (const worker of workers) {
      const baseAmount = worker.baseAmount ?? 0;
      const computed = calcPayrollEntry({
        grossAmount: baseAmount,
        allowances: 0,
        overtime: 0,
        otherDeductions: 0,
        company,
      });
      await tx.payrollEntry.create({
        data: {
          periodId,
          workerId: worker.id,
          baseAmount,
          allowances: 0,
          overtime: 0,
          grossAmount: computed.gross,
          afpAmount: computed.afpAmount,
          healthAmount: computed.healthAmount,
          unemploymentAmount: computed.unemploymentAmount,
          taxAmount: computed.taxAmount,
          otherDeductions: 0,
          deductionsTotal: computed.deductionsTotal,
          netAmount: computed.netAmount,
        },
      });
    }
  });

  return workers.length;
}

export async function updatePayrollEntry(
  companyId: string,
  periodId: string,
  entryId: string,
  input: { baseAmount: number; allowances: number; overtime: number; otherDeductions: number },
) {
  const entry = await db.payrollEntry.findFirst({ where: { id: entryId, periodId } });
  if (!entry) throw new Error("Liquidación no existe.");
  const period = await db.payrollPeriod.findFirst({ where: { id: periodId, companyId, status: "DRAFT" } });
  if (!period) throw new Error("Periodo no editable.");
  const company = await db.company.findUnique({
    where: { id: companyId },
    select: { afpRate: true, healthRate: true, unemploymentRate: true, anualBonusRate: true },
  });
  if (!company) throw new Error("Empresa no existe.");
  const computed = calcPayrollEntry({
    grossAmount: input.baseAmount,
    allowances: input.allowances,
    overtime: input.overtime,
    otherDeductions: input.otherDeductions,
    company,
  });
  await db.payrollEntry.update({
    where: { id: entryId },
    data: {
      baseAmount: Math.max(0, input.baseAmount),
      allowances: Math.max(0, input.allowances),
      overtime: Math.max(0, input.overtime),
      otherDeductions: Math.max(0, input.otherDeductions),
      grossAmount: computed.gross,
      afpAmount: computed.afpAmount,
      healthAmount: computed.healthAmount,
      unemploymentAmount: computed.unemploymentAmount,
      taxAmount: computed.taxAmount,
      deductionsTotal: computed.deductionsTotal,
      netAmount: computed.netAmount,
    },
  });
}

export async function closePayrollPeriod(companyId: string, periodId: string, userId: string, createExpenses: boolean) {
  const period = await db.payrollPeriod.findFirst({ where: { id: periodId, companyId } });
  if (!period) throw new Error("Periodo no existe.");
  if (period.status !== "DRAFT") throw new Error("El periodo ya esta cerrado.");

  await db.$transaction(async (tx) => {
    if (createExpenses) {
      const entries = await tx.payrollEntry.findMany({ where: { periodId } });
      const category = await tx.category.findFirst({ where: { companyId, active: true, name: "Remuneraciones" }, select: { id: true } });
      const payer = await tx.payer.findFirst({ where: { companyId } });
      if (!payer) throw new Error("Configura al menos un pagador antes de cerrar la nomina.");
      for (const entry of entries) {
        if (entry.expenseId) continue;
        const worker = await tx.worker.findUnique({ where: { id: entry.workerId }, select: { name: true } });
        const expense = await tx.expense.create({
          data: {
            companyId,
            createdById: userId,
            date: new Date(),
            description: `Nomina ${period.year}-${String(period.month).padStart(2, "0")} - ${worker?.name ?? entry.workerId}`,
            categoryId: category?.id ?? null,
            workerId: entry.workerId,
            netAmount: entry.netAmount,
            ivaAmount: 0,
            totalAmount: entry.netAmount,
            paymentMethod: "TRANSFER",
            paidById: payer?.id ?? "",
            reimbursed: false,
            notes: "Liquidacion cerrada",
          },
        });
        await tx.payrollEntry.update({ where: { id: entry.id }, data: { expenseId: expense.id, paidAt: new Date() } });
      }
    }
    await tx.payrollPeriod.update({ where: { id: periodId }, data: { status: "CLOSED" } });
  });
}

export async function reopenPayrollPeriod(companyId: string, periodId: string) {
  await db.payrollPeriod.updateMany({ where: { id: periodId, companyId, status: "CLOSED" }, data: { status: "DRAFT" } });
}
