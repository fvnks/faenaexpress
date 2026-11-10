import { requireContext } from "@/lib/auth";
import { currentPeriod, formatPeriod, monthRange } from "@/lib/money";
import { expensesBreakdown, purchasesBreakdown } from "@/lib/reports";
import { parseFiltrosGastos } from "@/lib/report-filters";
import {
  listAreasForFilter,
  listCategoriesForFilter,
  listWorkersForFilter,
} from "@/lib/catalogs";
import { createWorkbook, addStyledSheet, xlsxResponse } from "@/lib/xlsx";

function breakdownRows(rows: { name: string; total: number; count: number }[], total: number) {
  return rows.map((row) => [row.name, row.count, row.total, total > 0 ? Math.round((row.total / total) * 100) : 0]);
}

export async function GET(request: Request) {
  const ctx = await requireContext("reportes");
  const params = new URL(request.url).searchParams;
  const raw = params.get("periodo") ?? "";
  const period = monthRange(raw) ? raw : currentPeriod();
  const range = monthRange(period) ?? { from: new Date(), to: new Date() };

  // El export lee los mismos filtros que la pantalla: lo que se ve en los
  // gráficos es exactamente lo que baja el archivo.
  const filtros = parseFiltrosGastos(params);

  const [data, compras, areas, categorias, trabajadores] = await Promise.all([
    expensesBreakdown(ctx.company.id, range, filtros),
    purchasesBreakdown(ctx.company.id, range, filtros),
    listAreasForFilter(ctx.company.id),
    listCategoriesForFilter(ctx.company.id),
    listWorkersForFilter(ctx.company.id),
  ]);

  // El subtítulo del archivo dice con qué filtros se armó: el Excel se puede
  // archivar y leer más tarde sin adivinar.
  const detalle: string[] = [];
  if (filtros.q) detalle.push(`Búsqueda: ${filtros.q}`);
  if (filtros.areaId) {
    detalle.push(`Área: ${areas.find((area) => area.id === filtros.areaId)?.name ?? "—"}`);
  }
  if (filtros.categoriaId) {
    detalle.push(
      `Categoría: ${categorias.find((categoria) => categoria.id === filtros.categoriaId)?.name ?? "—"}`,
    );
  }
  if (filtros.trabajadorId) {
    detalle.push(
      `Trabajador: ${trabajadores.find((trabajador) => trabajador.id === filtros.trabajadorId)?.name ?? "—"}`,
    );
  }
  const subtitulo = [formatPeriod(period), ...detalle].join(" · ");

  const workbook = createWorkbook("Gastos por área");

  addStyledSheet(workbook, "Gastos total", {
    title: `${ctx.company.name} - Gastos del período`,
    subtitle: `${subtitulo} · CLP`,
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
    subtitle: subtitulo,
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
    subtitle: subtitulo,
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
    subtitle: subtitulo,
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
    subtitle: subtitulo,
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
    subtitle: subtitulo,
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
