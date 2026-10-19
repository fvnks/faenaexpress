import { requireContext } from "@/lib/auth";
import { currentPeriod, formatPeriod, monthRange } from "@/lib/money";
import { ivaSummary, pendingTotals, libroVentas, libroCompras, topClients, expensesBreakdown } from "@/lib/reports";
import { createWorkbook, addStyledSheet, xlsxResponse } from "@/lib/xlsx";

export async function GET(request: Request) {
  const ctx = await requireContext("reportes");
  const raw = new URL(request.url).searchParams.get("periodo") ?? "";
  const period = monthRange(raw) ? raw : currentPeriod();
  const range = monthRange(period) ?? { from: new Date(), to: new Date() };

  const [iva, pending, libroV, libroC, expenses, top5] = await Promise.all([
    ivaSummary(ctx.company.id, range),
    pendingTotals(ctx.company.id),
    libroVentas(ctx.company.id, range),
    libroCompras(ctx.company.id, range),
    expensesBreakdown(ctx.company.id, range),
    topClients(ctx.company.id, range, 5),
  ]);

  const workbook = createWorkbook("Resumen ejecutivo");

  addStyledSheet(workbook, "Resumen ejecutivo", {
    title: `${ctx.company.name} - Resumen ejecutivo`,
    subtitle: `Período: ${formatPeriod(period)} · Moneda CLP`,
    columns: [
      { header: "Concepto", width: 44, style: "text" },
      { header: "Valor", width: 18, style: "currency" },
    ],
    rows: [
      ["IVA débito fiscal (ventas)", iva.debitoFiscal],
      ["IVA crédito fiscal (compras + gastos)", iva.creditoFiscal],
      ["IVA resultado (a pagar / remanente)", iva.ivaResultado],
      ["Retención honorarios (ventas)", iva.sales.retention],
      ["Ventas netas", libroV.totals.net],
      ["Compras netas", libroC.totals.net],
      ["Gastos totales", expenses.total],
      ["Margen bruto", libroV.totals.net - libroC.totals.net - expenses.total],
      ["Por cobrar", pending.porCobrar],
      ["Por pagar", pending.porPagar],
      ["Reembolsos pendientes", pending.reembolsosPendientes],
    ],
  });

  addStyledSheet(workbook, "Top clientes", {
    title: `${ctx.company.name} - Top 5 clientes`,
    subtitle: `Período: ${formatPeriod(period)}`,
    columns: [
      { header: "Cliente", width: 42, style: "text" },
      { header: "Monto", width: 18, style: "currency" },
      { header: "Participación", width: 16, style: "number" },
    ],
    rows: top5.map((client) => {
      const share =
        libroV.totals.total !== 0 ? Math.round((client.total / libroV.totals.total) * 100) : 0;
      return [client.name, client.total, share];
    }),
    totalRow: [
      "Total top 5",
      top5.reduce((acc, item) => acc + item.total, 0),
      top5.reduce((acc, item) => {
        return acc + (libroV.totals.total !== 0 ? Math.round((item.total / libroV.totals.total) * 100) : 0);
      }, 0),
    ],
  });

  return xlsxResponse(`resumen-ejecutivo-${period}.xlsx`, workbook);
}
