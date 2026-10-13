import type { DocumentType } from "@/generated/prisma/client";
import { requireContext } from "@/lib/auth";
import { csvResponse, csvDate, toCsv } from "@/lib/csv";
import { documentTypeLabel } from "@/lib/labels";
import { currentPeriod, monthRange } from "@/lib/money";
import { libroCompras } from "@/lib/reports";

export async function GET(request: Request) {
  const ctx = await requireContext("reportes");
  const raw = new URL(request.url).searchParams.get("periodo") ?? "";
  const period = monthRange(raw) ? raw : currentPeriod();
  const range = monthRange(period) ?? { from: new Date(), to: new Date() };

  const { rows } = await libroCompras(ctx.company.id, range);

  const csv = toCsv(
    ["Fecha", "Tipo", "Folio", "Folio referencia", "RUT", "Proveedor", "Categoría", "Neto", "IVA", "Total"],
    rows.map((row) => [
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
  );

  return csvResponse(`libro-compras-${period}.csv`, csv);
}
