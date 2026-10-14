import { requireContext } from "@/lib/auth";
import { currentPeriod, formatPeriod, monthRange } from "@/lib/money";
import { expensesBreakdown, purchasesBreakdown } from "@/lib/reports";
import { createWorkbook, addStyledSheet, xlsxResponse } from "@/lib/xlsx";

function breakdownRows(rows: { name: string; total: number; count: number }[], total: number) {
  return rows.map((row) => [row.name, row.count, row.total, total > 0 ? Math.round((row.total / total) * 100) : 0]);
}

export async function GET(request: Request) {
  const ctx = await requireContext("reportes");
  const raw = new URL(request.url).searchParams.get("periodo") ?? "";
  const period = monthRange(raw) ? raw : currentPeriod();
  const range = monthRange(period) ?? { from: new Date(), to: new Date() };

  const data = await expensesBreakdown(ctx.company.id, range);
  const compras = await purchasesBreakdown(ctx.company.id, range);

  const workbook = createWorkbook("Gastos por categoría");

  addStyledSheet(workbook, "Gastos total", {
    title: `${ctx.company.name} - Gastos del período`,
    subtitle: `${formatPeriod(period)} · CLP`,
    columns: [
      { header: "Concepto", width: 34, style: "text" },
      { header: "Valor", width: 18, style: "currency" },
    ],
    rows: [
      ["Total gastos", data.total],
      ["Personal", data.totalPersonal],
      ["Total compras (centro de costo)", compras.total],
      ["Documentos compras", compras.count],
    ],
  });

  addStyledSheet(workbook, "Gastos categoría", {
    title: "Gastos por categoría",
    subtitle: formatPeriod(period),
    columns: [
      { header: "Categoría", width: 34, style: "text" },
      { header: "N°", width: 10, style: "number" },
      { header: "Total", width: 18, style: "currency" },
      { header: "Participación %", width: 16, style: "number" },
    ],
    rows: breakdownRows(data.byCategory, data.total),
    totalRow: ["Total", data.byCategory.reduce((a, b) => a + b.count, 0), data.total, 100],
  });

  addStyledSheet(workbook, "Gastos área", {
    title: "Gastos por área",
    subtitle: formatPeriod(period),
    columns: [
      { header: "Área", width: 34, style: "text" },
      { header: "N°", width: 10, style: "number" },
      { header: "Total", width: 18, style: "currency" },
      { header: "Participación %", width: 16, style: "number" },
    ],
    rows: breakdownRows(data.byArea, data.total),
    totalRow: ["Total", data.byArea.reduce((a, b) => a + b.count, 0), data.total, 100],
  });

  addStyledSheet(workbook, "Gastos trabajador", {
    title: "Gastos por trabajador",
    subtitle: formatPeriod(period),
    columns: [
      { header: "Trabajador", width: 34, style: "text" },
      { header: "N°", width: 10, style: "number" },
      { header: "Total", width: 18, style: "currency" },
      { header: "Participación %", width: 16, style: "number" },
    ],
    rows: breakdownRows(data.byWorker, data.totalPersonal),
    totalRow: ["Total", data.byWorker.reduce((a, b) => a + b.count, 0), data.totalPersonal, 100],
  });

  addStyledSheet(workbook, "Compras categoría", {
    title: "Compras por categoría",
    subtitle: formatPeriod(period),
    columns: [
      { header: "Categoría", width: 34, style: "text" },
      { header: "N°", width: 10, style: "number" },
      { header: "Total", width: 18, style: "currency" },
      { header: "Participación %", width: 16, style: "number" },
    ],
    rows: breakdownRows(compras.byCategory, compras.total),
    totalRow: ["Total", compras.byCategory.reduce((a, b) => a + b.count, 0), compras.total, 100],
  });

  addStyledSheet(workbook, "Compras área", {
    title: "Compras por área",
    subtitle: formatPeriod(period),
    columns: [
      { header: "Área", width: 34, style: "text" },
      { header: "N°", width: 10, style: "number" },
      { header: "Total", width: 18, style: "currency" },
      { header: "Participación %", width: 16, style: "number" },
    ],
    rows: breakdownRows(compras.byArea, compras.total),
    totalRow: ["Total", compras.byArea.reduce((a, b) => a + b.count, 0), compras.total, 100],
  });

  return xlsxResponse(`gastos-${period}.xlsx`, workbook);
}
