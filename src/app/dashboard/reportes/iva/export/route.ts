import { requireContext } from "@/lib/auth";
import { csvResponse, toCsv } from "@/lib/csv";
import { currentPeriod, monthRange } from "@/lib/money";
import { ivaSummary } from "@/lib/reports";

export async function GET(request: Request) {
  const ctx = await requireContext("reportes");
  const raw = new URL(request.url).searchParams.get("periodo") ?? "";
  const period = monthRange(raw) ? raw : currentPeriod();
  const range = monthRange(period) ?? { from: new Date(), to: new Date() };

  const iva = await ivaSummary(ctx.company.id, range);

  const rows: (string | number)[][] = [
    ["Ventas", iva.sales.net, iva.sales.iva, iva.sales.total, iva.sales.retention],
    ["Compras", iva.purchases.net, iva.purchases.iva, iva.purchases.total, 0],
    ["Gastos", iva.expenses.net, iva.expenses.iva, iva.expenses.total, 0],
    ["Débito fiscal", "", iva.debitoFiscal, "", ""],
    ["Crédito fiscal", "", iva.creditoFiscal, "", ""],
    [iva.ivaResultado >= 0 ? "IVA a pagar" : "Remanente", "", Math.abs(iva.ivaResultado), "", ""],
  ];

  const csv = toCsv(
    ["Concepto", "Neto", "IVA", "Total", "Retención"],
    rows,
  );

  return csvResponse(`iva-${period}.csv`, csv);
}
