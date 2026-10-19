import { requireContext } from "@/lib/auth";
import { currentPeriod, formatPeriod, monthRange } from "@/lib/money";
import { salesByClient } from "@/lib/reports";
import { createWorkbook, addStyledSheet, xlsxResponse } from "@/lib/xlsx";

export async function GET(request: Request) {
  const ctx = await requireContext("reportes");
  const raw = new URL(request.url).searchParams.get("periodo") ?? "";
  const period = monthRange(raw) ? raw : currentPeriod();
  const range = monthRange(period) ?? { from: new Date(), to: new Date() };

  const data = await salesByClient(ctx.company.id, range);

  const workbook = createWorkbook("Ventas por cliente");

  addStyledSheet(workbook, "Ventas por cliente", {
    title: `${ctx.company.name} - Ventas por cliente`,
    subtitle: `Período: ${formatPeriod(period)} · CLP`,
    columns: [
      { header: "Cliente", width: 44, style: "text" },
      { header: "Documentos", width: 14, style: "number" },
      { header: "Total firmado", width: 18, style: "currency" },
      { header: "Participación %", width: 16, style: "number" },
    ],
    rows: data.rows.map((row) => [
      row.name,
      row.count,
      row.total,
      data.total !== 0 ? Math.round((row.total / data.total) * 100) : 0,
    ]),
    totalRow: [
      "Total",
      data.rows.reduce((acc, row) => acc + row.count, 0),
      data.total,
      100,
    ],
  });

  return xlsxResponse(`ventas-por-cliente-${period}.xlsx`, workbook);
}
