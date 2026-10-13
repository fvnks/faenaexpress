import { requireContext } from "@/lib/auth";
import { csvResponse, csvDate, toCsv } from "@/lib/csv";
import { currentPeriod, monthRange } from "@/lib/money";
import { paymentsSummary } from "@/lib/reports";

export async function GET(request: Request) {
  const ctx = await requireContext("reportes");
  const raw = new URL(request.url).searchParams.get("periodo") ?? "";
  const period = monthRange(raw) ? raw : currentPeriod();
  const range = monthRange(period) ?? { from: new Date(), to: new Date() };

  const data = await paymentsSummary(ctx.company.id, range);

  const rows: (string | number)[][] = [];

  for (const item of data.purchases.pendingList) {
    rows.push([
      "Compra por pagar",
      item.partnerName,
      item.documentNumber ?? "",
      csvDate(item.date),
      item.dueDate ? csvDate(item.dueDate) : "",
      "",
      item.total,
    ]);
  }
  for (const item of data.purchases.paidList) {
    rows.push([
      "Compra pagada",
      item.partnerName,
      item.documentNumber ?? "",
      csvDate(item.date),
      "",
      item.paymentDate ? csvDate(item.paymentDate) : "",
      item.total,
    ]);
  }
  for (const item of data.sales.pendingList) {
    rows.push([
      "Venta por cobrar",
      item.partnerName,
      item.documentNumber ?? "",
      csvDate(item.date),
      item.dueDate ? csvDate(item.dueDate) : "",
      "",
      item.total,
    ]);
  }
  for (const item of data.sales.collectedList) {
    rows.push([
      "Venta cobrada",
      item.partnerName,
      item.documentNumber ?? "",
      csvDate(item.date),
      "",
      item.paymentDate ? csvDate(item.paymentDate) : "",
      item.total,
    ]);
  }
  for (const item of data.expenses.pendingList) {
    rows.push([
      "Gasto por reembolsar",
      item.paidByName,
      item.description,
      csvDate(item.date),
      "",
      "",
      item.total,
    ]);
  }

  const csv = toCsv(
    ["Estado", "Contraparte", "Documento", "Fecha", "Vencimiento", "Pago/Cobro", "Monto"],
    rows,
  );

  return csvResponse(`pagos-${period}.csv`, csv);
}
