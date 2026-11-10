import type { DocumentType } from "@/generated/prisma/client";

import { requireContext } from "@/lib/auth";
import { documentTypeLabel } from "@/lib/labels";
import { csvDate } from "@/lib/csv";
import { formatPeriod } from "@/lib/money";
import { currentPeriod, monthRange } from "@/lib/money";
import { libroCompras } from "@/lib/reports";
import { ESTADOS_COMPRA, parseFiltrosLibro } from "@/lib/report-filters";
import { createWorkbook, addStyledSheet, xlsxResponse } from "@/lib/xlsx";

export async function GET(request: Request) {
  const ctx = await requireContext("reportes");
  const params = new URL(request.url).searchParams;

  const raw = params.get("periodo") ?? "";
  const period = monthRange(raw) ? raw : currentPeriod();
  const range = monthRange(period) ?? { from: new Date(), to: new Date() };

  // El export lee los mismos filtros que la pantalla: lo que se ve en la
  // tabla es exactamente lo que baja el archivo.
  const filtros = parseFiltrosLibro(params, ESTADOS_COMPRA);

  const { rows, totals, saldo } = await libroCompras(ctx.company.id, range, filtros);

  const detalle: string[] = [];
  if (filtros.q) detalle.push(`Búsqueda: ${filtros.q}`);
  if (filtros.tipos.length > 0) {
    detalle.push(`Tipo: ${filtros.tipos.map((tipo) => documentTypeLabel(tipo)).join(", ")}`);
  }
  if (filtros.estados.length > 0) {
    const etiqueta = (valor: string) =>
      ESTADOS_COMPRA.find((estado) => estado.value === valor)?.label ?? valor;
    detalle.push(`Estado: ${filtros.estados.map(etiqueta).join(", ")}`);
  }

  const workbook = createWorkbook("Libro de compras");

  addStyledSheet(workbook, "Libro de compras", {
    title: `${ctx.company.name} - Libro de compras`,
    subtitle: [
      formatPeriod(period),
      ...detalle,
      "CLP",
    ].join(" · "),
    columns: [
      { header: "Fecha", width: 12, style: "text" },
      { header: "Tipo", width: 22, style: "text" },
      { header: "Folio", width: 12, style: "text" },
      { header: "Folio referencia", width: 16, style: "text" },
      { header: "RUT", width: 14, style: "text" },
      { header: "Proveedor", width: 34, style: "text" },
      { header: "Categoría", width: 22, style: "text" },
      { header: "Área", width: 22, style: "text" },
      { header: "Neto", width: 14, style: "currency" },
      { header: "IVA", width: 14, style: "currency" },
      { header: "Total", width: 14, style: "currency" },
      { header: "Estado", width: 18, style: "text" },
      { header: "Saldo", width: 14, style: "currency" },
    ],
    rows: rows.map((row) => [
      csvDate(row.date),
      documentTypeLabel(row.documentType as DocumentType),
      row.documentNumber ?? "",
      row.referenceDocumentNumber ?? "",
      row.partnerRut ?? "",
      row.partnerName,
      row.categoryName ?? "",
      row.areaName ?? "",
      row.net,
      row.iva,
      row.total,
      ESTADOS_COMPRA.find((estado) => estado.value === row.status)?.label ?? row.status,
      row.saldo,
    ]),
    totalRow: [
      "",
      "Totales",
      "",
      "",
      "",
      `${rows.length} documentos`,
      "",
      "",
      totals.net,
      totals.iva,
      totals.total,
      "",
      saldo,
    ],
  });

  return xlsxResponse(`libro-compras-${period}.xlsx`, workbook);
}
