import type { DocumentType } from "@/generated/prisma/client";

import { requireContext } from "@/lib/auth";
import { documentTypeLabel } from "@/lib/labels";
import { csvDate } from "@/lib/csv";
import { formatPeriod } from "@/lib/money";
import { currentPeriod, monthRange } from "@/lib/money";
import { libroCompras } from "@/lib/reports";
import { documentTypeValues } from "@/lib/validation";
import { createWorkbook, addStyledSheet, xlsxResponse } from "@/lib/xlsx";

export async function GET(request: Request) {
  const ctx = await requireContext("reportes");
  const raw = new URL(request.url).searchParams.get("periodo") ?? "";
  const period = monthRange(raw) ? raw : currentPeriod();
  const range = monthRange(period) ?? { from: new Date(), to: new Date() };

  const rawTipo = new URL(request.url).searchParams.get("tipo");
  const tipo = documentTypeValues.find((value) => value === rawTipo) ?? null;

  const { rows, totals } = await libroCompras(ctx.company.id, range, tipo);

  const workbook = createWorkbook("Libro de compras");

  addStyledSheet(workbook, "Libro de compras", {
    title: `${ctx.company.name} - Libro de compras`,
    subtitle: `${formatPeriod(period)}${tipo ? ` · Tipo: ${documentTypeLabel(tipo as DocumentType)}` : ""} · CLP`,
    columns: [
      { header: "Fecha", width: 12, style: "text" },
      { header: "Tipo", width: 22, style: "text" },
      { header: "Folio", width: 12, style: "text" },
      { header: "Folio referencia", width: 16, style: "text" },
      { header: "RUT", width: 14, style: "text" },
      { header: "Proveedor", width: 34, style: "text" },
      { header: "Categoría", width: 22, style: "text" },
      { header: "Neto", width: 14, style: "currency" },
      { header: "IVA", width: 14, style: "currency" },
      { header: "Total", width: 14, style: "currency" },
    ],
    rows: rows.map((row) => [
      csvDate(row.date),
      documentTypeLabel(row.documentType as DocumentType),
      row.documentNumber ?? "",
      row.referenceDocumentNumber ?? "",
      row.partnerRut ?? "",
      row.partnerName,
      row.categoryName ?? "",
      row.net,
      row.iva,
      row.total,
    ]),
    totalRow: [
      "",
      "Totales",
      "",
      "",
      "",
      `${rows.length} documentos`,
      "",
      totals.net,
      totals.iva,
      totals.total,
    ],
  });

  return xlsxResponse(`libro-compras-${period}.xlsx`, workbook);
}
