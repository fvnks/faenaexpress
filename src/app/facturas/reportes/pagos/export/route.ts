import { requireContext } from "@/lib/auth";
import { csvDate } from "@/lib/csv";
import { currentPeriod, formatPeriod, monthRange } from "@/lib/money";
import { paymentsSummary } from "@/lib/reports";
import { createWorkbook, addStyledSheet, xlsxResponse } from "@/lib/xlsx";

export async function GET(request: Request) {
  const ctx = await requireContext("reportes");
  const raw = new URL(request.url).searchParams.get("periodo") ?? "";
  const period = monthRange(raw) ? raw : currentPeriod();
  const range = monthRange(period) ?? { from: new Date(), to: new Date() };

  const data = await paymentsSummary(ctx.company.id, range);

  const workbook = createWorkbook("Pagos y deudas");

  addStyledSheet(workbook, "Resumen", {
    title: `${ctx.company.name} - Resumen de pagos`,
    subtitle: `Período: ${formatPeriod(period)} · CLP`,
    columns: [
      { header: "Indicador", width: 30, style: "text" },
      { header: "Total", width: 18, style: "currency" },
      { header: "Pagado/Cobrado", width: 18, style: "currency" },
      { header: "Pendiente", width: 18, style: "currency" },
    ],
    rows: [
      ["Compras", data.purchases.total, data.purchases.paid, data.purchases.pending],
      ["Ventas", data.sales.total, data.sales.collected, data.sales.pending],
      ["Gastos", data.expenses.total, data.expenses.reimbursed, data.expenses.pending],
    ],
  });

  addStyledSheet(workbook, "Compras por pagar", {
    title: "Compras por pagar",
    subtitle: `Período: ${formatPeriod(period)}`,
    columns: [
      { header: "Contraparte", width: 34, style: "text" },
      { header: "Documento", width: 14, style: "text" },
      { header: "Fecha", width: 12, style: "text" },
      { header: "Vencimiento", width: 12, style: "text" },
      { header: "Monto", width: 16, style: "currency" },
    ],
    rows: data.purchases.pendingList.map((item) => [
      item.partnerName,
      item.documentNumber ?? "",
      csvDate(item.date),
      item.dueDate ? csvDate(item.dueDate) : "",
      item.total,
    ]),
    totalRow: ["Total", "", "", "", data.purchases.pending],
  });

  addStyledSheet(workbook, "Compras pagadas", {
    title: "Compras pagadas",
    subtitle: `Período: ${formatPeriod(period)}`,
    columns: [
      { header: "Contraparte", width: 34, style: "text" },
      { header: "Documento", width: 14, style: "text" },
      { header: "Fecha", width: 12, style: "text" },
      { header: "Pago", width: 12, style: "text" },
      { header: "Monto", width: 16, style: "currency" },
    ],
    rows: data.purchases.paidList.map((item) => [
      item.partnerName,
      item.documentNumber ?? "",
      csvDate(item.date),
      item.paymentDate ? csvDate(item.paymentDate) : "",
      item.total,
    ]),
    totalRow: ["Total", "", "", "", data.purchases.paid],
  });

  addStyledSheet(workbook, "Ventas por cobrar", {
    title: "Ventas por cobrar",
    subtitle: `Período: ${formatPeriod(period)}`,
    columns: [
      { header: "Contraparte", width: 34, style: "text" },
      { header: "Documento", width: 14, style: "text" },
      { header: "Fecha", width: 12, style: "text" },
      { header: "Vencimiento", width: 12, style: "text" },
      { header: "Monto", width: 16, style: "currency" },
    ],
    rows: data.sales.pendingList.map((item) => [
      item.partnerName,
      item.documentNumber ?? "",
      csvDate(item.date),
      item.dueDate ? csvDate(item.dueDate) : "",
      item.total,
    ]),
    totalRow: ["Total", "", "", "", data.sales.pending],
  });

  addStyledSheet(workbook, "Ventas cobradas", {
    title: "Ventas cobradas",
    subtitle: `Período: ${formatPeriod(period)}`,
    columns: [
      { header: "Contraparte", width: 34, style: "text" },
      { header: "Documento", width: 14, style: "text" },
      { header: "Fecha", width: 12, style: "text" },
      { header: "Cobro", width: 12, style: "text" },
      { header: "Monto", width: 16, style: "currency" },
    ],
    rows: data.sales.collectedList.map((item) => [
      item.partnerName,
      item.documentNumber ?? "",
      csvDate(item.date),
      item.paymentDate ? csvDate(item.paymentDate) : item.confirmingAt ? csvDate(item.confirmingAt) : "",
      item.total,
    ]),
    totalRow: ["Total", "", "", "", data.sales.collected],
  });

  addStyledSheet(workbook, "Reembolsos pend", {
    title: "Gastos por reembolsar",
    subtitle: `Período: ${formatPeriod(period)}`,
    columns: [
      { header: "Pagado por", width: 24, style: "text" },
      { header: "Descripción", width: 44, style: "text" },
      { header: "Fecha", width: 12, style: "text" },
      { header: "Monto", width: 16, style: "currency" },
    ],
    rows: data.expenses.pendingList.map((item) => [
      item.paidByName,
      item.description,
      csvDate(item.date),
      item.total,
    ]),
    totalRow: ["Total", "", "", data.expenses.pending],
  });

  addStyledSheet(workbook, "Por pagador", {
    title: "Gastos por pagador",
    subtitle: `Período: ${formatPeriod(period)}`,
    columns: [
      { header: "Pagador", width: 30, style: "text" },
      { header: "Total", width: 18, style: "currency" },
      { header: "Reembolsado", width: 18, style: "currency" },
      { header: "Pendiente", width: 18, style: "currency" },
    ],
    rows: data.expenses.byPayer.map((item) => [item.name, item.total, item.reimbursed, item.pending]),
    totalRow: [
      "Total",
      data.expenses.total,
      data.expenses.reimbursed,
      data.expenses.pending,
    ],
  });

  return xlsxResponse(`pagos-${period}.xlsx`, workbook);
}
