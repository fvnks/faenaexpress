import { FileDown } from "lucide-react";

import { secondaryButtonClass } from "@/lib/ui";

/**
 * Botón para descargar la factura en PDF (la versión comercial, con la plantilla de
 * easy-invoice-pdf). No es la carta DTE: esa se descarga desde el menú de acciones.
 *
 * Es un Server Component: el enlace lo resuelve el navegador y no hace falta estado.
 */
export function PdfFacturaButton({
  href,
  label = "Descargar factura (PDF)",
}: {
  href: string;
  label?: string;
}) {
  return (
    <a
      href={href}
      download
      className={secondaryButtonClass + " inline-flex items-center gap-2"}
    >
      <FileDown className="size-4 shrink-0" aria-hidden="true" />
      {label}
    </a>
  );
}
