import { requireContext } from "@/lib/auth";
import { csvResponse, toCsv } from "@/lib/csv";
import { currentPeriod, monthRange } from "@/lib/money";
import { ivaSummary, pendingTotals, libroVentas, libroCompras, topClients, expensesBreakdown } from "@/lib/reports";

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

  const csv = toCsv(
    ["Concepto", "Valor"],
    [
      ["Período", period],
      ["IVA débito fiscal (ventas)", iva.debitoFiscal],
      ["IVA crédito fiscal (compras+gastos)", iva.creditoFiscal],
      ["IVA a pagar / remanente", iva.ivaResultado],
      ["Retención de honorarios (ventas)", iva.sales.retention],
      ["Ventas netas", libroV.totals.net],
      ["Compras netas", libroC.totals.net],
      ["Gastos totales", expenses.total],
      ["Margen bruto", libroV.totals.net - libroC.totals.net - expenses.total],
      ["Por cobrar", pending.porCobrar],
      ["Por pagar", pending.porPagar],
      ["Reembolsos pendientes", pending.reembolsosPendientes],
      ...top5.map((c) => [`Top cliente: ${c.name}`, c.total]),
    ],
  );

  return csvResponse(`resumen-ejecutivo-${period}.csv`, csv);
}
