import { requireContext } from "@/lib/auth";
import { documentTypeLabel } from "@/lib/labels";
import { currentPeriod, formatPeriod, monthRange } from "@/lib/money";
import { salesByArea, salesMonthlyByArea } from "@/lib/reports";
import { ESTADOS_VENTA, parseFiltrosLibro } from "@/lib/report-filters";
import { createWorkbook, addStyledSheet, xlsxResponse } from "@/lib/xlsx";

export async function GET(request: Request) {
  const ctx = await requireContext("reportes");
  const params = new URL(request.url).searchParams;

  const raw = params.get("periodo") ?? "";
  const period = monthRange(raw) ? raw : currentPeriod();
  const range = monthRange(period) ?? { from: new Date(), to: new Date() };

  // El export lee los mismos filtros que la pantalla.
  const filtros = parseFiltrosLibro(params, ESTADOS_VENTA);

  const [porArea, matriz] = await Promise.all([
    salesByArea(ctx.company.id, range, filtros),
    salesMonthlyByArea(ctx.company.id, 12, filtros),
  ]);

  const detalle: string[] = [];
  if (filtros.q) detalle.push(`Búsqueda: ${filtros.q}`);
  if (filtros.tipos.length > 0) {
    detalle.push(`Tipo: ${filtros.tipos.map((tipo) => documentTypeLabel(tipo)).join(", ")}`);
  }
  if (filtros.estados.length > 0) {
    const etiqueta = (valor: string) =>
      ESTADOS_VENTA.find((estado) => estado.value === valor)?.label ?? valor;
    detalle.push(`Estado: ${filtros.estados.map(etiqueta).join(", ")}`);
  }
  const subtitulo = [formatPeriod(period), ...detalle].join(" · ");

  const workbook = createWorkbook("Ventas por área");

  addStyledSheet(workbook, "Ventas por área", {
    title: `${ctx.company.name} - Ventas por área`,
    subtitle: `${subtitulo} · CLP`,
    columns: [
      { header: "Área", width: 34, style: "text" },
      { header: "Documentos", width: 12, style: "number" },
      { header: "Neto", width: 16, style: "currency" },
      { header: "IVA", width: 16, style: "currency" },
      { header: "Retención", width: 16, style: "currency" },
      { header: "Total", width: 16, style: "currency" },
      { header: "Participación %", width: 16, style: "number" },
    ],
    rows: porArea.rows.map((row) => [
      row.name,
      row.count,
      row.net,
      row.iva,
      row.retention,
      row.total,
      porArea.total > 0 ? Math.round((row.total / porArea.total) * 1000) / 10 : 0,
    ]),
    totalRow: [
      "Total",
      porArea.rows.reduce((acc, row) => acc + row.count, 0),
      porArea.rows.reduce((acc, row) => acc + row.net, 0),
      porArea.rows.reduce((acc, row) => acc + row.iva, 0),
      porArea.rows.reduce((acc, row) => acc + row.retention, 0),
      porArea.total,
      100,
    ],
  });

  // La matriz área × mes: la misma lectura del heatmap, en números.
  addStyledSheet(workbook, "Ventas por área y mes", {
    title: "Ventas por área y mes",
    subtitle: `Últimos 12 meses · CLP`,
    columns: [
      { header: "Área", width: 34, style: "text" },
      ...matriz.months.map((month) => ({ header: month, width: 14, style: "currency" as const })),
      { header: "Total 12 meses", width: 18, style: "currency" },
    ],
    rows: matriz.rows.map((row) => [
      row.name,
      ...matriz.months.map((month) => row.byMonth[month] ?? 0),
      row.periodTotal,
    ]),
    totalRow: [
      "Total",
      ...matriz.months.map(
        (month) => matriz.rows.reduce((acc, row) => acc + (row.byMonth[month] ?? 0), 0),
      ),
      matriz.grandTotal,
    ],
  });

  return xlsxResponse(`ventas-por-area-${period}.xlsx`, workbook);
}
