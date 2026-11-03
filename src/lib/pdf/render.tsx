import { renderToBuffer } from "@react-pdf/renderer";

import type { InvoiceData } from "./vendor/easy-invoice-pdf/schema";
import { InvoicePdfTemplate } from "./vendor/easy-invoice-pdf/templates/default";

/**
 * Genera el PDF de un documento.
 *
 * El render es en el servidor (no en el navegador): el archivo sale igual en cualquier
 * equipo y se puede mandar por correo o archivar tal cual.
 */
export async function renderPdfDocumento(
  invoiceData: InvoiceData,
): Promise<Buffer> {
  return renderToBuffer(<InvoicePdfTemplate invoiceData={invoiceData} />);
}

/** El nombre del archivo con el que se descarga el PDF. */
export function nombreArchivoPdf({
  tipo,
  folio,
}: {
  tipo: string;
  folio: string | null;
}): string {
  const numero = (folio ?? "sin-folio").replaceAll(/[/\\]/g, "-");
  return `${tipo}-${numero}.pdf`;
}
