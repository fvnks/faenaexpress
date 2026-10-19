import type { DocumentType } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { documentSign, formatPeriod } from "@/lib/money";

export type Period = { from: Date; to: Date };

export type Totals = { net: number; iva: number; total: number };

type SumRow = { documentType: string; netAmount: number; ivaAmount: number; totalAmount: number };

function sumSigned(rows: SumRow[], extraKey?: "retentionAmount"): Totals & { retention: number } {
  const totals = { net: 0, iva: 0, total: 0, retention: 0 };
  for (const row of rows) {
    const sign = documentSign(row.documentType);
    totals.net += sign * row.netAmount;
    totals.iva += sign * row.ivaAmount;
    totals.total += sign * row.totalAmount;
    if (extraKey) totals.retention += sign * (row as unknown as { retentionAmount: number }).retentionAmount;
  }
  return totals;
}

// --- Resumen de IVA del período (preparación del F29) ------------------------

export async function ivaSummary(companyId: string, period: Period) {
  const where = { companyId, date: { gte: period.from, lt: period.to } };

  const [sales, purchases, expenses] = await Promise.all([
    db.sale.findMany({
      where,
      select: {
        documentType: true,
        netAmount: true,
        ivaAmount: true,
        totalAmount: true,
        retentionAmount: true,
      },
    }),
    db.purchase.findMany({
      where,
      select: { documentType: true, netAmount: true, ivaAmount: true, totalAmount: true },
    }),
    db.expense.findMany({
      where,
      select: { netAmount: true, ivaAmount: true, totalAmount: true },
    }),
  ]);

  const salesTotals = sumSigned(sales, "retentionAmount");

  const purchasesTotals: Totals = { net: 0, iva: 0, total: 0 };
  for (const row of purchases) {
    const sign = documentSign(row.documentType);
    purchasesTotals.net += sign * row.netAmount;
    purchasesTotals.iva += sign * row.ivaAmount;
    purchasesTotals.total += sign * row.totalAmount;
  }

  const expensesTotals: Totals = { net: 0, iva: 0, total: 0 };
  for (const row of expenses) {
    expensesTotals.net += row.netAmount;
    expensesTotals.iva += row.ivaAmount;
    expensesTotals.total += row.totalAmount;
  }

  const debitoFiscal = salesTotals.iva;
  const creditoFiscal = purchasesTotals.iva + expensesTotals.iva;

  return {
    sales: salesTotals,
    purchases: purchasesTotals,
    expenses: expensesTotals,
    debitoFiscal,
    creditoFiscal,
    // Positivo: IVA a pagar. Negativo: remanente de crédito.
    ivaResultado: debitoFiscal - creditoFiscal,
  };
}

// --- Libros de compras y ventas ----------------------------------------------

export async function libroCompras(companyId: string, period: Period, documentType?: DocumentType | null) {
  const purchases = await db.purchase.findMany({
    where: { companyId, date: { gte: period.from, lt: period.to }, ...(documentType ? { documentType } : {}) },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    include: { partner: { select: { name: true, rut: true } }, category: { select: { name: true } } },
  });

  const rows = purchases.map((purchase) => {
    const sign = documentSign(purchase.documentType);
    return {
      id: purchase.id,
      date: purchase.date,
      documentType: purchase.documentType,
      documentNumber: purchase.documentNumber,
      referenceDocumentNumber: purchase.referenceDocumentNumber,
      partnerName: purchase.partner.name,
      partnerRut: purchase.partner.rut,
      categoryName: purchase.category?.name ?? null,
      net: sign * purchase.netAmount,
      iva: sign * purchase.ivaAmount,
      total: sign * purchase.totalAmount,
    };
  });

  const totals = rows.reduce(
    (acc, row) => ({ net: acc.net + row.net, iva: acc.iva + row.iva, total: acc.total + row.total }),
    { net: 0, iva: 0, total: 0 },
  );

  return { rows, totals };
}

export async function libroVentas(companyId: string, period: Period, documentType?: DocumentType | null) {
  const sales = await db.sale.findMany({
    where: { companyId, date: { gte: period.from, lt: period.to }, ...(documentType ? { documentType } : {}) },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    include: {
      partner: { select: { name: true, rut: true } },
      category: { select: { name: true } },
      salesperson: { select: { name: true } },
    },
  });

  const rows = sales.map((sale) => {
    const sign = documentSign(sale.documentType);
    return {
      id: sale.id,
      date: sale.date,
      documentType: sale.documentType,
      documentNumber: sale.documentNumber,
      referenceDocumentNumber: sale.referenceDocumentNumber,
      partnerName: sale.partner.name,
      partnerRut: sale.partner.rut,
      categoryName: sale.category?.name ?? null,
      salespersonName: sale.salesperson?.name ?? null,
      net: sign * sale.netAmount,
      iva: sign * sale.ivaAmount,
      total: sign * sale.totalAmount,
      retention: sign * sale.retentionAmount,
    };
  });

  const totals = rows.reduce(
    (acc, row) => ({
      net: acc.net + row.net,
      iva: acc.iva + row.iva,
      total: acc.total + row.total,
      retention: acc.retention + row.retention,
    }),
    { net: 0, iva: 0, total: 0, retention: 0 },
  );

  return { rows, totals };
}

// --- Pagado vs adeudado (con detalle) ----------------------------------------

function sumAmounts<T extends { documentType: string; totalAmount: number }>(rows: T[]): number {
  return rows.reduce((acc, row) => acc + documentSign(row.documentType) * row.totalAmount, 0);
}

export async function paymentsSummary(companyId: string, period: Period) {
  const where = { companyId, date: { gte: period.from, lt: period.to } };

  const [purchases, sales, expenses] = await Promise.all([
    db.purchase.findMany({
      where,
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
      include: { partner: { select: { id: true, name: true } }, payments: { select: { amount: true } } },
    }),
    db.sale.findMany({
      where,
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
      include: { partner: { select: { id: true, name: true } }, payments: { select: { amount: true } } },
    }),
    db.expense.findMany({
      where,
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
      include: { paidBy: { select: { id: true, name: true } } },
    }),
  ]);

  const abonado = (rows: { amount: number }[]) => rows.reduce((acc, row) => acc + row.amount, 0);

  const paidPurchases = purchases.filter((purchase) => purchase.status === "PAID");
  // Parciales incluidas: siguen debiendo el saldo, así que pertenecen a "por pagar".
  const pendingPurchases = purchases.filter(
    (purchase) => purchase.status === "PENDING" || purchase.status === "PARTIAL",
  );
  // Cobrado incluye las ventas en confirming: en confirming la empresa de
  // confirming adelanta el pago, así que ya entró el dinero. Por lo mismo,
  // "por cobrar" excluye las que están en confirming.
  const collectedSales = sales.filter((sale) => sale.status === "PAID" || sale.confirmingAt !== null);
  const pendingSales = sales.filter(
    (sale) =>
      (sale.status === "PENDING" || sale.status === "PARTIAL" || sale.status === "OVERDUE") &&
      sale.confirmingAt === null,
  );

  const purchaseSaldo = (purchase: (typeof purchases)[number]) =>
    documentSign(purchase.documentType) * Math.max(purchase.totalAmount - abonado(purchase.payments), 0);
  const saleSaldo = (sale: (typeof sales)[number]) =>
    documentSign(sale.documentType) *
    Math.max(sale.totalAmount - sale.retentionAmount - abonado(sale.payments), 0);

  const reimbursedExpenses = expenses.filter((expense) => expense.reimbursed);
  const pendingExpenses = expenses.filter((expense) => !expense.reimbursed);

  const byPayer = new Map<string, { id: string; name: string; total: number; reimbursed: number; pending: number }>();
  for (const expense of expenses) {
    const entry = byPayer.get(expense.paidById) ?? {
      id: expense.paidById,
      name: expense.paidBy.name,
      total: 0,
      reimbursed: 0,
      pending: 0,
    };
    entry.total += expense.totalAmount;
    if (expense.reimbursed) entry.reimbursed += expense.totalAmount;
    else entry.pending += expense.totalAmount;
    byPayer.set(expense.paidById, entry);
  }

  const purchasesTotal = sumAmounts(purchases);
  const paidPurchasesTotal = sumAmounts(paidPurchases);
  const pendingPurchasesTotal = pendingPurchases.reduce((acc, purchase) => acc + purchaseSaldo(purchase), 0);
  const salesTotal = sumAmounts(sales);
  const collectedSalesTotal = sumAmounts(collectedSales);
  const pendingSalesTotal = pendingSales.reduce((acc, sale) => acc + saleSaldo(sale), 0);
  const expensesTotal = expenses.reduce((acc, expense) => acc + expense.totalAmount, 0);
  const reimbursedExpensesTotal = reimbursedExpenses.reduce((acc, expense) => acc + expense.totalAmount, 0);
  const pendingExpensesTotal = pendingExpenses.reduce((acc, expense) => acc + expense.totalAmount, 0);

  return {
    purchases: {
      total: purchasesTotal,
      paid: paidPurchasesTotal,
      pending: pendingPurchasesTotal,
      count: purchases.length,
      countPaid: paidPurchases.length,
      pendingList: pendingPurchases.map((purchase) => ({
        id: purchase.id,
        partnerName: purchase.partner.name,
        documentNumber: purchase.documentNumber,
        date: purchase.date,
        dueDate: purchase.dueDate,
        total: purchaseSaldo(purchase),
      })),
      paidList: paidPurchases.map((purchase) => ({
        id: purchase.id,
        partnerName: purchase.partner.name,
        documentNumber: purchase.documentNumber,
        date: purchase.date,
        paymentDate: purchase.paymentDate,
        total: documentSign(purchase.documentType) * purchase.totalAmount,
      })),
    },
    sales: {
      total: salesTotal,
      collected: collectedSalesTotal,
      pending: pendingSalesTotal,
      pendingList: pendingSales.map((sale) => ({
        id: sale.id,
        partnerName: sale.partner.name,
        documentNumber: sale.documentNumber,
        date: sale.date,
        dueDate: sale.dueDate,
        total: saleSaldo(sale),
      })),
      collectedList: collectedSales.map((sale) => ({
        id: sale.id,
        partnerName: sale.partner.name,
        documentNumber: sale.documentNumber,
        date: sale.date,
        paymentDate: sale.paymentDate,
        confirmingAt: sale.confirmingAt,
        dueDate: sale.dueDate,
        total: documentSign(sale.documentType) * sale.totalAmount,
      })),
    },
    expenses: {
      total: expensesTotal,
      reimbursed: reimbursedExpensesTotal,
      pending: pendingExpensesTotal,
      pendingList: pendingExpenses.map((expense) => ({
        id: expense.id,
        description: expense.description,
        date: expense.date,
        paidByName: expense.paidBy.name,
        total: expense.totalAmount,
      })),
      byPayer: [...byPayer.values()].sort((a, b) => b.total - a.total),
    },
  };
}

// --- Gastos por área y categoría ---------------------------------------------

export type Breakdown = { id: string | null; name: string; total: number; count: number };

function groupBy(
  rows: { totalAmount: number; key: string | null; name: string }[],
): Breakdown[] {
  const map = new Map<string, Breakdown>();
  for (const row of rows) {
    const key = row.key ?? "__none__";
    const entry = map.get(key) ?? { id: row.key, name: row.name, total: 0, count: 0 };
    entry.total += row.totalAmount;
    entry.count += 1;
    map.set(key, entry);
  }
  return [...map.values()].sort((a, b) => b.total - a.total);
}

export async function expensesBreakdown(companyId: string, period: Period) {
  const expenses = await db.expense.findMany({
    where: { companyId, date: { gte: period.from, lt: period.to } },
    select: {
      totalAmount: true,
      category: { select: { id: true, name: true } },
      area: { select: { id: true, name: true } },
      worker: { select: { id: true, name: true } },
    },
  });

  const byCategory = groupBy(
    expenses.map((expense) => ({
      totalAmount: expense.totalAmount,
      key: expense.category?.id ?? null,
      name: expense.category?.name ?? "Sin categoría",
    })),
  );

  const byArea = groupBy(
    expenses.map((expense) => ({
      totalAmount: expense.totalAmount,
      key: expense.area?.id ?? null,
      name: expense.area?.name ?? "Sin área",
    })),
  );

  // Solo los gastos con trabajador asociado (sueldos, aguinaldos, etc.).
  const conTrabajador = expenses.filter((expense) => expense.worker);
  const byWorker = groupBy(
    conTrabajador.map((expense) => ({
      totalAmount: expense.totalAmount,
      key: expense.worker!.id,
      name: expense.worker!.name,
    })),
  );

  const total = expenses.reduce((acc, expense) => acc + expense.totalAmount, 0);
  const totalPersonal = conTrabajador.reduce((acc, expense) => acc + expense.totalAmount, 0);

  return { total, byCategory, byArea, byWorker, totalPersonal };
}

// --- Compras por categoría (centro de costo) ---------------------------------
//
// Las compras (facturas de proveedor) son gasto de capital, no del día a día.
// Se separan de `expenses` porque se quieren ver por separado: cuánto se gasta
// en cada categoría de compra es la pregunta de centro de costo.
export async function purchasesBreakdown(companyId: string, period: Period) {
  const purchases = await db.purchase.findMany({
    where: { companyId, date: { gte: period.from, lt: period.to } },
    select: {
      totalAmount: true,
      documentType: true,
      category: { select: { id: true, name: true } },
      area: { select: { id: true, name: true } },
    },
  });

  const total = purchases.reduce(
    (acc, purchase) => acc + documentSign(purchase.documentType) * purchase.totalAmount,
    0,
  );

  const byCategory = groupBy(
    purchases.map((purchase) => ({
      totalAmount: documentSign(purchase.documentType) * purchase.totalAmount,
      key: purchase.category?.id ?? null,
      name: purchase.category?.name ?? "Sin categoría",
    })),
  );

  const byArea = groupBy(
    purchases.map((purchase) => ({
      totalAmount: documentSign(purchase.documentType) * purchase.totalAmount,
      key: purchase.area?.id ?? null,
      name: purchase.area?.name ?? "Sin área",
    })),
  );

  return { total, byCategory, byArea, count: purchases.length };
}

// --- KPIs del panel ----------------------------------------------------------

export async function pendingTotals(companyId: string) {
  const [purchases, sales, expenses] = await Promise.all([
    db.purchase.findMany({
      where: { companyId, status: { in: ["PENDING", "PARTIAL"] } },
      select: { documentType: true, totalAmount: true, payments: { select: { amount: true } } },
    }),
    db.sale.findMany({
      where: {
        companyId,
        confirmingAt: null,
        status: { in: ["PENDING", "PARTIAL", "OVERDUE"] },
        documentType: { in: ["INVOICE", "RECEIPT"] },
      },
      select: {
        documentType: true,
        totalAmount: true,
        retentionAmount: true,
        payments: { select: { amount: true } },
      },
    }),
    db.expense.aggregate({
      where: { companyId, reimbursed: false },
      _sum: { totalAmount: true },
    }),
  ]);

  // El saldo pendiente es el total menos los abonos: una compra parcial ya no
  // debe el total completo, solo lo que falta.
  const porPagar = purchases.reduce((acc, purchase) => {
    const abonado = purchase.payments.reduce((sum, payment) => sum + payment.amount, 0);
    return acc + documentSign(purchase.documentType) * Math.max(purchase.totalAmount - abonado, 0);
  }, 0);
  const porCobrar = sales.reduce((acc, sale) => {
    const abonado = sale.payments.reduce((sum, payment) => sum + payment.amount, 0);
    const aCobrar = Math.max(sale.totalAmount - sale.retentionAmount - abonado, 0);
    return acc + documentSign(sale.documentType) * aCobrar;
  }, 0);

  return {
    porPagar,
    porCobrar,
    reembolsosPendientes: expenses._sum.totalAmount ?? 0,
  };
}

// Conteo de ventas por cobrar para el badge del sidebar (solo ventas:
// las compras no llevan número, por decisión de producto). Las ventas en
// confirming ya se cobraron, así que no cuentan como pendientes.
export async function pendingCounts(companyId: string) {
  const sales = await db.sale.count({
    where: { companyId, confirmingAt: null, status: { in: ["PENDING", "PARTIAL", "OVERDUE"] }, documentType: { not: "QUOTATION" } },
  });
  return { sales };
}

// --- Series para los gráficos del panel ---------------------------------------

const MES_ABREV = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

export type MonthlyBucket = {
  key: string; // AAAA-MM
  label: string; // Ene, Feb…
  ventas: number;
  compras: number;
  gastos: number;
};

function monthKeyOf(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Totales por mes de los últimos N meses (para el gráfico del panel). */
export async function monthlyTotals(companyId: string, months = 12): Promise<MonthlyBucket[]> {
  const now = new Date();
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1), 1));

  const [sales, purchases, expenses] = await Promise.all([
    db.sale.findMany({
      where: { companyId, date: { gte: from } },
      select: { date: true, totalAmount: true, documentType: true },
    }),
    db.purchase.findMany({
      where: { companyId, date: { gte: from } },
      select: { date: true, totalAmount: true, documentType: true },
    }),
    db.expense.findMany({
      where: { companyId, date: { gte: from } },
      select: { date: true, totalAmount: true },
    }),
  ]);

  const buckets: MonthlyBucket[] = [];
  for (let i = months - 1; i >= 0; i -= 1) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    buckets.push({ key: monthKeyOf(d), label: MES_ABREV[d.getUTCMonth()], ventas: 0, compras: 0, gastos: 0 });
  }
  const index = new Map(buckets.map((bucket) => [bucket.key, bucket]));

  for (const row of sales) {
    const bucket = index.get(monthKeyOf(row.date));
    if (bucket) bucket.ventas += documentSign(row.documentType) * row.totalAmount;
  }
  for (const row of purchases) {
    const bucket = index.get(monthKeyOf(row.date));
    if (bucket) bucket.compras += documentSign(row.documentType) * row.totalAmount;
  }
  for (const row of expenses) {
    const bucket = index.get(monthKeyOf(row.date));
    if (bucket) bucket.gastos += row.totalAmount;
  }

  return buckets;
}

/** Top clientes por total facturado en el período. */
export async function topClients(companyId: string, period: Period, limit = 5) {
  const sales = await db.sale.findMany({
    where: { companyId, date: { gte: period.from, lt: period.to } },
    select: { partnerId: true, totalAmount: true, documentType: true, partner: { select: { name: true } } },
  });

  const map = new Map<string, { name: string; total: number }>();
  for (const sale of sales) {
    const entry = map.get(sale.partnerId) ?? { name: sale.partner.name, total: 0 };
    entry.total += documentSign(sale.documentType) * sale.totalAmount;
    map.set(sale.partnerId, entry);
  }

  return [...map.values()]
    .filter((entry) => entry.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}

// --- Ventas por vendedor (drill-down) ----------------------------------------
export type SalesByDimension = { id: string | null; name: string; count: number; total: number };

export async function salesBySalesperson(companyId: string, period: Period) {
  const sales = await db.sale.findMany({
    where: { companyId, date: { gte: period.from, lt: period.to } },
    select: { salespersonId: true, totalAmount: true, documentType: true, salesperson: { select: { name: true } } },
  });

  const map = new Map<string, SalesByDimension>();
  for (const sale of sales) {
    const key = sale.salespersonId ?? "__none__";
    const entry = map.get(key) ?? { id: sale.salespersonId, name: sale.salesperson?.name ?? "Sin vendedor", count: 0, total: 0 };
    entry.count += 1;
    entry.total += documentSign(sale.documentType) * sale.totalAmount;
    map.set(key, entry);
  }

  const rows = [...map.values()].sort((a, b) => b.total - a.total);
  const total = rows.reduce((acc, r) => acc + r.total, 0);
  return { rows, total };
}

// --- Ventas por cliente (drill-down) ------------------------------------------
export async function salesByClient(companyId: string, period: Period) {
  const sales = await db.sale.findMany({
    where: { companyId, date: { gte: period.from, lt: period.to } },
    select: { partnerId: true, totalAmount: true, documentType: true, partner: { select: { id: true, name: true } } },
  });

  const map = new Map<string, SalesByDimension>();
  for (const sale of sales) {
    const key = sale.partnerId;
    const entry = map.get(key) ?? { id: sale.partner.id, name: sale.partner.name, count: 0, total: 0 };
    entry.count += 1;
    entry.total += documentSign(sale.documentType) * sale.totalAmount;
    map.set(key, entry);
  }

  const rows = [...map.values()].sort((a, b) => b.total - a.total);
  const total = rows.reduce((acc, r) => acc + r.total, 0);
  return { rows, total };
}

// --- Flujo de caja proyectado --------------------------------------------------

export type CashBucket = { key: string; label: string; entradas: number; salidas: number; countEntradas: number; countSalidas: number };

/**
 * Cuándo entra y sale dinero: ventas por cobrar y compras por pagar,
 * agrupadas por la fecha de vencimiento (o la fecha del documento si no tiene).
 */
export async function cashFlowProjection(companyId: string) {
  const today = new Date();
  const startToday = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const endMonth = (offset: number) => {
    const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + offset + 1, 1));
    return d;
  };

  const [ventas, compras] = await Promise.all([
    db.sale.findMany({
      where: { companyId, confirmingAt: null, status: { in: ["PENDING", "PARTIAL", "OVERDUE"] }, documentType: { not: "QUOTATION" } },
      select: { documentType: true, totalAmount: true, dueDate: true, date: true },
    }),
    db.purchase.findMany({
      where: { companyId, status: "PENDING", documentType: { not: "QUOTATION" } },
      select: { documentType: true, totalAmount: true, dueDate: true, date: true },
    }),
  ]);

  const buckets: CashBucket[] = [
    { key: "vencido", label: "Vencido", entradas: 0, salidas: 0, countEntradas: 0, countSalidas: 0 },
    { key: "mes0", label: formatPeriod(`${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, "0")}`), entradas: 0, salidas: 0, countEntradas: 0, countSalidas: 0 },
    { key: "mes1", label: formatPeriod(`${endMonth(0).getUTCFullYear()}-${String(endMonth(0).getUTCMonth() + 1).padStart(2, "0")}`), entradas: 0, salidas: 0, countEntradas: 0, countSalidas: 0 },
    { key: "mes2", label: formatPeriod(`${endMonth(1).getUTCFullYear()}-${String(endMonth(1).getUTCMonth() + 1).padStart(2, "0")}`), entradas: 0, salidas: 0, countEntradas: 0, countSalidas: 0 },
    { key: "futuro", label: "Más adelante", entradas: 0, salidas: 0, countEntradas: 0, countSalidas: 0 },
  ];
  const index = new Map(buckets.map((bucket) => [bucket.key, bucket]));

  const bucketFor = (due: Date | null, fallback: Date): CashBucket => {
    const date = due ?? fallback;
    if (date < startToday) return index.get("vencido")!;
    if (date < endMonth(0)) return index.get("mes0")!;
    if (date < endMonth(1)) return index.get("mes1")!;
    if (date < endMonth(2)) return index.get("mes2")!;
    return index.get("futuro")!;
  };

  for (const venta of ventas) {
    const bucket = bucketFor(venta.dueDate, venta.date);
    bucket.entradas += documentSign(venta.documentType) * venta.totalAmount;
    bucket.countEntradas += 1;
  }
  for (const compra of compras) {
    const bucket = bucketFor(compra.dueDate, compra.date);
    bucket.salidas += documentSign(compra.documentType) * compra.totalAmount;
    bucket.countSalidas += 1;
  }

  const totalEntradas = buckets.reduce((acc, bucket) => acc + bucket.entradas, 0);
  const totalSalidas = buckets.reduce((acc, bucket) => acc + bucket.salidas, 0);
  const vencido = index.get("vencido")!;

  return {
    buckets,
    totalEntradas,
    totalSalidas,
    netoProyectado: totalEntradas - totalSalidas,
    vencidoEntradas: vencido.entradas,
    vencidoSalidas: vencido.salidas,
  };
}
