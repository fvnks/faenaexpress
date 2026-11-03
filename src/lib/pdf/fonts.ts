import path from "node:path";

/**
 * Tipografías del PDF.
 *
 * La plantilla vendorizada de easy-invoice-pdf usaba Open Sans y la bajaba de
 * `static.easyinvoicepdf.com` en cada generación. Acá la fuente se sirve desde
 * `/public/fonts` (SIL OFL 1.1, licencia en `public/fonts/OpenSans-OFL.txt`): el PDF no
 * depende de un tercero y no se cae si ese servidor no está disponible.
 */

export const PDF_FONT_FAMILY = "Open Sans";

const FUENTES_DIR = path.join(process.cwd(), "public", "fonts");

export const PDF_FONT_FILES = {
  regular: path.join(FUENTES_DIR, "open-sans-regular.ttf"),
  bold: path.join(FUENTES_DIR, "open-sans-700.ttf"),
} as const;
