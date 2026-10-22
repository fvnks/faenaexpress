import type { DocumentType } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { calcularTotales } from "@/lib/ledger";
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

/**
 * Los folios de las notas de crédito que dejaron sin efecto a una factura
 * anulada.
 *
 * Esas notas no cuentan en ningún total: la factura anulada ya quedó fuera y
 * la nota es la otra cara de la misma operación. Si contaran las dos, el
 * mismo hecho aparecería dos veces con signo contrario.
 */
async function notasContrapartida(companyId: string): Promise<Set<string>> {
  const rows = await db.sale.findMany({
    where: { companyId, status: "CANCELLED", cancellationNoteNumber: { not: null } },
    select: { cancellationNoteNumber: true },
  });
  return new Set(rows.map((row) => row.cancellationNoteNumber!).filter(Boolean));
}

export async function ivaSummary(companyId: string, period: Period) {
  // Una cotización no es una venta: no genera IVA ni deuda, así que queda
  // fuera de todos los totales.
  //
  // Una factura anulada tampoco: en el F29 se declara la anulación, no el
  // documento. Y la nota de crédito que la dejó sin efecto tampoco cuenta, o
  // el mismo hecho entraría dos veces con signo contrario.
  const where = {
    companyId,
    date: { gte: period.from, lt: period.to },
    documentType: { not: "QUOTATION" as DocumentType },
  };

  const [sales, purchases, expenses, contraparte] = await Promise.all([
    db.sale.findMany({
      where: { ...where, status: { not: "CANCELLED" } },
      select: {
        documentType: true,
        documentNumber: true,
        netAmount: true,
        ivaAmount: true,
        totalAmount: true,
        retentionAmount: true,
        exento: true,
        ivaRecargo: true,
      },
    }),
    db.purchase.findMany({
      where,
      select: {
        documentType: true,
        netAmount: true,
        ivaAmount: true,
        totalAmount: true,
        exento: true,
        ivaRecargo: true,
      },
    }),
    db.expense.findMany({
      where: { companyId, date: { gte: period.from, lt: period.to } },
      select: { netAmount: true, ivaAmount: true, totalAmount: true },
    }),
    notasContrapartida(companyId),
  ]);

  // La nota de crédito que dejó sin efecto a una factura anulada no cuenta.
  const ventas = sales.filter(
    (row) =>
      !(
        row.documentType === "CREDIT_NOTE" &&
        row.documentNumber !== null &&
        contraparte.has(row.documentNumber)
      ),
  );

  const salesTotals = sumSigned(ventas, "retentionAmount");

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

  // Lo que hace que "neto + IVA" no dé el total del documento: las retenciones
  // (el total ya viene menos retenido) y los montos exentos o con recargo (que
  // no son gravados). El panel lo dice, para que el número se entienda.
  const retencionesVentas = ventas.reduce(
    (acc, row) => acc + documentSign(row.documentType) * row.retentionAmount,
    0,
  );
  const exentoVentas = ventas.reduce(
    (acc, row) => acc + documentSign(row.documentType) * row.exento,
    0,
  );
  const exentoCompras = purchases.reduce(
    (acc, row) => acc + documentSign(row.documentType) * row.exento,
    0,
  );
  const recargoVentas = ventas.reduce(
    (acc, row) => acc + documentSign(row.documentType) * row.ivaRecargo,
    0,
  );
  const recargoCompras = purchases.reduce(
    (acc, row) => acc + documentSign(row.documentType) * row.ivaRecargo,
    0,
  );

  return {
    sales: salesTotals,
    purchases: purchasesTotals,
    expenses: expensesTotals,
    debitoFiscal,
    creditoFiscal,
    // Positivo: IVA a pagar. Negativo: remanente de crédito.
    ivaResultado: debitoFiscal - creditoFiscal,
    ajustes: {
      retencionesVentas,
      exentoVentas,
      recargoVentas,
      exentoCompras,
      recargoCompras,
    },
  };
}

// --- Libros de compras y ventas ----------------------------------------------

export async function libroCompras(companyId: string, period: Period, documentType?: DocumentType | null) {
  const purchases = await db.purchase.findMany({
    where: {
      companyId,
      date: { gte: period.from, lt: period.to },
      documentType: documentType ?? { not: "QUOTATION" },
    },
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
  const [sales, contraparte] = await Promise.all([
    db.sale.findMany({
      where: {
        companyId,
        date: { gte: period.from, lt: period.to },
        documentType: documentType ?? { not: "QUOTATION" },
      },
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
      include: {
        partner: { select: { name: true, rut: true } },
        category: { select: { name: true } },
        salesperson: { select: { name: true } },
      },
    }),
    notasContrapartida(companyId),
  ]);

  // Las mismas reglas que el resumen de IVA, para que el cuadre del libro
  // contra el IVA dé cero: una factura anulada no se facturó, y la nota de
  // crédito que la dejó sin efecto es la otra cara de esa anulación.
  const rows = sales
    .filter((sale) => sale.status !== "CANCELLED")
    .filter(
      (sale) =>
        !(
          sale.documentType === "CREDIT_NOTE" &&
          sale.documentNumber !== null &&
          contraparte.has(sale.documentNumber)
        ),
    )
    .map((sale) => {
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

export async function paymentsSummary(companyId: string, period: Period) {
  const where = { companyId, date: { gte: period.from, lt: period.to } };

  const [purchases, sales, expenses, anuladasConNota] = await Promise.all([
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
    // Las notas de crédito que dejaron sin efecto a una factura anulada: la
    // factura ya no cuenta y la nota tampoco.
    db.sale.findMany({
      where: { companyId, status: "CANCELLED", cancellationNoteNumber: { not: null } },
      select: { cancellationNoteNumber: true },
    }),
  ]);

  const notasContrapartida = new Set(
    anuladasConNota.map((row) => row.cancellationNoteNumber!).filter(Boolean),
  );

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

  // Los totales salen de las MISMAS reglas que usan las listas de ventas y
  // compras: una nota de crédito resta, una factura anulada no cuenta y el
  // saldo es el total menos lo abonado. Así el reporte, el panel y las listas
  // no se contradicen entre sí.
  const purchaseTotals = calcularTotales(
    purchases.map((purchase) => ({
      documentType: purchase.documentType,
      documentNumber: purchase.documentNumber,
      status: purchase.status,
      totalAmount: purchase.totalAmount,
      abonado: abonado(purchase.payments),
    })),
  );
  const salesTotals = calcularTotales(
    sales.map((sale) => ({
      documentType: sale.documentType,
      documentNumber: sale.documentNumber,
      status: sale.status,
      totalAmount: sale.totalAmount,
      retentionAmount: sale.retentionAmount,
      abonado: abonado(sale.payments),
      confirming: sale.confirmingAt !== null,
      contrapartidaAnulada:
        sale.documentType === "CREDIT_NOTE" &&
        sale.documentNumber !== null &&
        notasContrapartida.has(sale.documentNumber),
    })),
  );

  const purchasesTotal = purchaseTotals.total;
  const paidPurchasesTotal = purchaseTotals.movido;
  const pendingPurchasesTotal = purchaseTotals.pendiente;
  const salesTotal = salesTotals.total;
  const collectedSalesTotal = salesTotals.movido;
  const pendingSalesTotal = salesTotals.pendiente;
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
  // Esto se calcula con SQL y no con un findMany + reduce: son miles de
  // documentos pendientes y traerlos todos a memoria en cada carga del panel
  // era un desperdicio (1.379 filas en producción, y crece con el negocio).
  //
  // El saldo pendiente es el total menos los abonos: una compra parcial ya no
  // debe el total completo, solo lo que falta.
  //
  // Las notas de crédito RESTAN: son abonos, no deudas. Y la nota que dejó sin
  // efecto a una factura anulada no cuenta, porque la factura anulada ya quedó
  // fuera: si contaran las dos, el mismo hecho se contaría dos veces.
  const [porPagar, porCobrar, expenses] = await Promise.all([
    db.$queryRaw<{ total: number | null }[]>`
      SELECT COALESCE(SUM(
        GREATEST(p."totalAmount" - COALESCE(pay.abonado, 0), 0)
        * (CASE WHEN p."documentType" = 'CREDIT_NOTE' THEN -1 ELSE 1 END)
      ), 0) AS total
      FROM "Purchase" p
      LEFT JOIN (
        SELECT "purchaseId", SUM(amount) AS abonado
        FROM "Payment" WHERE "purchaseId" IS NOT NULL
        GROUP BY "purchaseId"
      ) pay ON pay."purchaseId" = p.id
      WHERE p."companyId" = ${companyId}
        AND p.status IN ('PENDING', 'PARTIAL')
    `,
    db.$queryRaw<{ total: number | null }[]>`
      SELECT COALESCE(SUM(
        GREATEST(s."totalAmount" - s."retentionAmount" - COALESCE(pay.abonado, 0), 0)
        * (CASE WHEN s."documentType" = 'CREDIT_NOTE' THEN -1 ELSE 1 END)
      ), 0) AS total
      FROM "Sale" s
      LEFT JOIN (
        SELECT "saleId", SUM(amount) AS abonado
        FROM "Payment" WHERE "saleId" IS NOT NULL
        GROUP BY "saleId"
      ) pay ON pay."saleId" = s.id
      WHERE s."companyId" = ${companyId}
        AND s."confirmingAt" IS NULL
        AND s.status IN ('PENDING', 'PARTIAL', 'OVERDUE')
        AND s."documentType" IN ('INVOICE', 'RECEIPT', 'CREDIT_NOTE')
        AND NOT EXISTS (
          SELECT 1 FROM "Sale" c
          WHERE c."companyId" = s."companyId"
            AND c.status = 'CANCELLED'
            AND c."cancellationNoteNumber" = s."documentNumber"
        )
    `,
    db.expense.aggregate({
      where: { companyId, reimbursed: false },
      _sum: { totalAmount: true },
    }),
  ]);

  return {
    porPagar: Number(porPagar[0]?.total ?? 0),
    porCobrar: Number(porCobrar[0]?.total ?? 0),
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

  const [sales, purchases, expenses, contraparte] = await Promise.all([
    db.sale.findMany({
      where: { companyId, date: { gte: from }, documentType: { not: "QUOTATION" } },
      select: { date: true, totalAmount: true, documentType: true, documentNumber: true, status: true },
    }),
    db.purchase.findMany({
      where: { companyId, date: { gte: from }, documentType: { not: "QUOTATION" } },
      select: { date: true, totalAmount: true, documentType: true },
    }),
    db.expense.findMany({
      where: { companyId, date: { gte: from } },
      select: { date: true, totalAmount: true },
    }),
    notasContrapartida(companyId),
  ]);

  const buckets: MonthlyBucket[] = [];
  for (let i = months - 1; i >= 0; i -= 1) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    buckets.push({ key: monthKeyOf(d), label: MES_ABREV[d.getUTCMonth()], ventas: 0, compras: 0, gastos: 0 });
  }
  const index = new Map(buckets.map((bucket) => [bucket.key, bucket]));

  for (const row of sales) {
    // Una factura anulada no se facturó, y la nota de crédito que la dejó sin
    // efecto tampoco cuenta.
    if (row.status === "CANCELLED") continue;
    if (
      row.documentType === "CREDIT_NOTE" &&
      row.documentNumber !== null &&
      contraparte.has(row.documentNumber)
    ) {
      continue;
    }
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
  const [sales, contraparte] = await Promise.all([
    db.sale.findMany({
      where: {
        companyId,
        date: { gte: period.from, lt: period.to },
        documentType: { not: "QUOTATION" },
      },
      select: {
        partnerId: true,
        totalAmount: true,
        documentType: true,
        documentNumber: true,
        status: true,
        partner: { select: { name: true } },
      },
    }),
    notasContrapartida(companyId),
  ]);

  const map = new Map<string, { name: string; total: number }>();
  for (const sale of sales) {
    // Una factura anulada no se facturó, y la nota de crédito que la dejó sin
    // efecto tampoco cuenta.
    if (sale.status === "CANCELLED") continue;
    if (
      sale.documentType === "CREDIT_NOTE" &&
      sale.documentNumber !== null &&
      contraparte.has(sale.documentNumber)
    ) {
      continue;
    }
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
    where: {
      companyId,
      date: { gte: period.from, lt: period.to },
      documentType: { not: "QUOTATION" },
    },
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
    where: {
      companyId,
      date: { gte: period.from, lt: period.to },
      documentType: { not: "QUOTATION" },
    },
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
