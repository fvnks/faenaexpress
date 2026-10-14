import type { DocumentType } from "@/generated/prisma/client";
import { requireContext } from "@/lib/auth";
import { csvResponse, csvDate, toCsv } from "@/lib/csv";
import { documentTypeLabel } from "@/lib/labels";
import { currentPeriod, monthRange } from "@/lib/money";
import { libroVentas } from "@/lib/reports";
import { documentTypeValues } from "@/lib/validation";

export async function GET(request: Request) {
  const ctx = await requireContext("reportes");
  const raw = new URL(request.url).searchParams.get("periodo") ?? "";
  const period = monthRange(raw) ? raw : currentPeriod();
  const range = monthRange(period) ?? { from: new Date(), to: new Date() };

  const rawTipo = new URL(request.url).searchParams.get("tipo");
  const tipo = documentTypeValues.find((v) => v === rawTipo) ?? null;

  const { rows } = await libroVentas(ctx.company.id, range, tipo);

  const csv = toCsv(
    [
      "Fecha",
      "Tipo",
      "Folio",
      "Folio referencia",
      "RUT",
      "Cliente",
      "Vendedor",
      "Neto",
      "IVA",
      "Total",
      "Retención",
    ],
    rows.map((row) => [
      csvDate(row.date),
      documentTypeLabel(row.documentType as DocumentType),
      row.documentNumber ?? "",
      row.referenceDocumentNumber ?? "",
      row.partnerRut ?? "",
      row.partnerName,
      row.salespersonName ?? "",
      row.net,
      row.iva,
      row.total,
      row.retention,
    ]),
  );

  return csvResponse(`libro-ventas-${period}.csv`, csv);
}
