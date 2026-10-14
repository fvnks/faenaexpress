import { requireContext } from "@/lib/auth";
import { currentPeriod, formatPeriod, monthRange } from "@/lib/money";
import { ivaSummary } from "@/lib/reports";
import { createWorkbook, addStyledSheet, xlsxResponse } from "@/lib/xlsx";

export async function GET(request: Request) {
  const ctx = await requireContext("reportes");
  const raw = new URL(request.url).searchParams.get("periodo") ?? "";
  const period = monthRange(raw) ? raw : currentPeriod();
  const range = monthRange(period) ?? { from: new Date(), to: new Date() };

  const iva = await ivaSummary(ctx.company.id, range);

  const workbook = createWorkbook("IVA mensual");

  addStyledSheet(workbook, "IVA", {
    title: `${ctx.company.name} - IVA mensual`,
    subtitle: `Período ${formatPeriod(period)} · CLP`,
    columns: [
      { header: "Concepto", width: 30, style: "text" },
      { header: "Neto", width: 16, style: "currency" },
      { header: "IVA", width: 16, style: "currency" },
      { header: "Total", width: 16, style: "currency" },
      { header: "Retención", width: 16, style: "currency" },
    ],
    rows: [
      ["Ventas", iva.sales.net, iva.sales.iva, iva.sales.total, iva.sales.retention],
      ["Compras", iva.purchases.net, iva.purchases.iva, iva.purchases.total, 0],
      ["Gastos", iva.expenses.net, iva.expenses.iva, iva.expenses.total, 0],
      ["IVA débito fiscal", null, iva.debitoFiscal, null, null],
      ["IVA crédito fiscal", null, iva.creditoFiscal, null, null],
      [iva.ivaResultado >= 0 ? "IVA a pagar" : "Remanente IVA", null, Math.abs(iva.ivaResultado), null, null],
    ],
    totalRow: [
      "IVA resultado",
      iva.sales.net + iva.purchases.net + iva.expenses.net,
      iva.ivaResultado,
      iva.sales.total + iva.purchases.total + iva.expenses.total,
      iva.sales.retention,
    ],
  });

  return xlsxResponse(`iva-${period}.xlsx`, workbook);
}
