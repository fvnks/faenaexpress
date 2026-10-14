import { requireContext } from "@/lib/auth";
import { cashFlowProjection } from "@/lib/reports";
import { createWorkbook, addStyledSheet, xlsxResponse } from "@/lib/xlsx";

export async function GET() {
  const ctx = await requireContext("reportes");
  const flow = await cashFlowProjection(ctx.company.id);

  const workbook = createWorkbook("Flujo de caja");

  addStyledSheet(workbook, "Flujo de caja", {
    title: `${ctx.company.name} - Flujo de caja proyectado`,
    subtitle: "CLP · Fecha base de hoy",
    columns: [
      { header: "Período", width: 28, style: "text" },
      { header: "Entra (por cobrar)", width: 18, style: "currency" },
      { header: "Sale (por pagar)", width: 18, style: "currency" },
      { header: "Neto", width: 16, style: "currency" },
      { header: "Doc. entradas", width: 14, style: "number" },
      { header: "Doc. salidas", width: 14, style: "number" },
    ],
    rows: flow.buckets.map((bucket) => [
      bucket.label,
      bucket.entradas,
      bucket.salidas,
      bucket.entradas - bucket.salidas,
      bucket.countEntradas,
      bucket.countSalidas,
    ]),
    totalRow: ["Total", flow.totalEntradas, flow.totalSalidas, flow.netoProyectado, "", ""],
  });

  addStyledSheet(workbook, "Totales", {
    title: "Totales pendientes",
    columns: [
      { header: "Indicador", width: 28, style: "text" },
      { header: "Monto", width: 18, style: "currency" },
    ],
    rows: [
      ["Por cobrar", flow.totalEntradas],
      ["Por pagar", flow.totalSalidas],
      ["Vencido entradas", flow.vencidoEntradas],
      ["Vencido salidas", flow.vencidoSalidas],
      ["Vencido neto", flow.vencidoEntradas - flow.vencidoSalidas],
      ["Neto proyectado", flow.netoProyectado],
    ],
  });

  return xlsxResponse("flujo-de-caja.xlsx", workbook);
}
