import { renderToBuffer } from "@react-pdf/renderer";

import type { InvoiceData } from "./vendor/easy-invoice-pdf/schema";
import { InvoicePdfTemplate } from "./vendor/easy-invoice-pdf/templates/default";
import { LayoutInvoiceTemplate } from "./layout-template";

/**
 * Genera el PDF de un documento.
 * 
 * Si invoiceData.erpPlantilla?.configuracion._layout existe, usa el template
 * Option A (LayoutInvoiceTemplate) con coordenadas absolutas desde Excel.
 * Si no, usa el template estándar (InvoicePdfTemplate).
 */
export async function renderPdfDocumento(
  invoiceData: InvoiceData,
): Promise<Buffer> {
  const layout = (invoiceData.erpPlantilla?.configuracion as Record<string, unknown> | null)?._layout as Record<string, { row: number; col: number }> | undefined;
  
  if (layout && Object.keys(layout).length > 0) {
    // Modo Option A: layout personalizado desde Excel
    return renderToBuffer(
      <LayoutInvoiceTemplate
        invoiceData={invoiceData}
        layout={layout}
      />
    );
  }
  
  // Modo estándar: template fijo
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
  const numero = (folio ?? "sin-folio").replaceAll(/[\\/]/g, "-");
  return `${tipo}-${numero}.pdf`;
}