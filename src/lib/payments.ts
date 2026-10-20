// Abonos: pagos parciales (o totales) aplicados a una compra o a una venta.
//
// El estado del documento se deriva de sus abonos: sin abonos queda pendiente,
// con abonos sin cubrir el total queda parcial y al cubrirlo queda pagado. La
// fecha y el método del documento se toman del último abono al quedar saldado.
// Este archivo es la única fuente de ese cálculo: lo llaman las acciones al
// registrar o eliminar un abono.

import { db } from "@/lib/db";

export type PaymentKind = "purchase" | "sale";

export type PaymentView = {
  id: string;
  date: Date;
  amount: number;
  /** El nombre del catálogo de la empresa (o el valor antiguo, ya traducido). */
  method: string | null;
  notes: string | null;
  createdByName: string;
};

/** Abonos de un documento, del más reciente al más antiguo. */
export async function listPayments(
  companyId: string,
  kind: PaymentKind,
  documentId: string,
): Promise<PaymentView[]> {
  const rows = await db.payment.findMany({
    where: {
      companyId,
      ...(kind === "purchase" ? { purchaseId: documentId } : { saleId: documentId }),
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      date: true,
      amount: true,
      method: true,
      notes: true,
      createdBy: { select: { name: true } },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    date: row.date,
    amount: row.amount,
    method: row.method,
    notes: row.notes,
    createdByName: row.createdBy.name,
  }));
}

export function sumPayments(payments: { amount: number }[]): number {
  return payments.reduce((total, payment) => total + payment.amount, 0);
}

// Monto a cubrir de una venta: el total menos la retención (lo retenido no se
// cobra al cliente, así que no es parte del saldo).
export function saleSettleTotal(totalAmount: number, retentionAmount: number): number {
  return Math.max(totalAmount - retentionAmount, 0);
}

async function recomputePurchase(companyId: string, purchaseId: string): Promise<void> {
  const purchase = await db.purchase.findFirst({
    where: { id: purchaseId, companyId },
    select: { totalAmount: true },
  });
  if (!purchase) return;

  const [aggregate, last] = await Promise.all([
    db.payment.aggregate({ where: { companyId, purchaseId }, _sum: { amount: true } }),
    db.payment.findFirst({
      where: { companyId, purchaseId },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      select: { date: true, method: true },
    }),
  ]);

  const paid = aggregate._sum.amount ?? 0;
  const status = paid <= 0 ? "PENDING" : paid >= purchase.totalAmount ? "PAID" : "PARTIAL";
  const settled = status === "PAID";

  await db.purchase.update({
    where: { id: purchaseId, companyId },
    data: {
      status,
      paymentDate: settled ? (last?.date ?? null) : null,
      paymentMethod: settled ? (last?.method ?? null) : null,
    },
  });
}

async function recomputeSale(companyId: string, saleId: string): Promise<void> {
  const sale = await db.sale.findFirst({
    where: { id: saleId, companyId },
    select: { totalAmount: true, retentionAmount: true, status: true },
  });
  if (!sale) return;

  // Una venta anulada no vuelve a un estado de cobro.
  if (sale.status === "CANCELLED") return;

  const [aggregate, last] = await Promise.all([
    db.payment.aggregate({ where: { companyId, saleId }, _sum: { amount: true } }),
    db.payment.findFirst({
      where: { companyId, saleId },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      select: { date: true, method: true },
    }),
  ]);

  const paid = aggregate._sum.amount ?? 0;
  const total = saleSettleTotal(sale.totalAmount, sale.retentionAmount);
  const status = paid <= 0 ? "PENDING" : total > 0 && paid >= total ? "PAID" : "PARTIAL";
  const settled = status === "PAID";

  await db.sale.update({
    where: { id: saleId, companyId },
    data: {
      status,
      paymentDate: settled ? (last?.date ?? null) : null,
      paymentMethod: settled ? (last?.method ?? null) : null,
    },
  });
}

/** Recalcula el estado del documento según sus abonos. */
export async function recomputeStatus(
  companyId: string,
  kind: PaymentKind,
  documentId: string,
): Promise<void> {
  if (kind === "purchase") {
    await recomputePurchase(companyId, documentId);
  } else {
    await recomputeSale(companyId, documentId);
  }
}
