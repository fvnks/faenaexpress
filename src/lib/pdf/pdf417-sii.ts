import type { DocumentType } from "@/generated/prisma/client";

/**
 * Datos para construir el PDF417 del timbre electrónico del SII.
 *
 * El PDF417 del DTE chileno codifica los mismos datos que valida el SII:
 * RUT emisor, tipo de documento, folio, fecha de emisión, RUT receptor y
 * monto total. Ese mismo string usa la plantilla del SII
 * (`src/lib/sii/pdf-template.ts`) para dibujar el timbre en el canvas.
 */
export type Pdf417SiiParams = {
  rutEmisor: string; // con puntos y DV, ej. "78.198.198-2"
  tipoDte: string; // "33" factura, "39" boleta, "61" nota crédito, "56" nota débito
  folio: string | number;
  fecha: Date; // fecha de emisión (día de calendario)
  monto: number; // monto total en CLP
  rutReceptor: string; // con puntos y DV
};

/** Mapea el `DocumentType` del ERP al código de tipo DTE del SII. */
export function tipoDocumentoASii(t: DocumentType): string {
  switch (t) {
    case "INVOICE":
      return "33"; // Factura electrónica
    case "RECEIPT":
      return "39"; // Boleta electrónica
    case "CREDIT_NOTE":
      return "61"; // Nota de crédito
    case "DEBIT_NOTE":
      return "56"; // Nota de débito
    default:
      return "33";
  }
}

/** Fecha AAAA-MM-DD (el formato que usa el TED/PDF417 del SII). */
function fechaIso(date: Date): string {
  return date.toISOString().slice(0, 10); // "2026-10-15"
}

/** String que se codifica en el PDF417 del SII. */
export function pdf417SiiString(params: Pdf417SiiParams): string {
  return [
    `RE:${params.rutEmisor}`,
    `TD:${params.tipoDte}`,
    `F:${params.folio}`,
    `FE:${fechaIso(params.fecha)}`,
    `RR:${params.rutReceptor}`,
    `MNT:${Math.round(params.monto)}`,
  ].join("|");
}

interface Pdf417MockContext {
  scale: (...args: unknown[]) => void;
  fillStyle: string;
  fillRect: (x: number, y: number, w: number, h: number) => void;
}

interface Pdf417MockCanvas {
  width: number;
  height: number;
  getContext: () => Pdf417MockContext;
}

/**
 * Genera el PDF417 del SII como una imagen SVG en formato data URL.
 *
 * Se reusa la librería `pdf417-generator` (ya dependencia del proyecto) para
 * codificar los datos y se renderiza la matriz de bits a SVG en el servidor,
 * sin depender de un canvas de navegador.
 */
export async function pdf417SiiDataUrl(params: Pdf417SiiParams): Promise<string> {
  const mod = await import("pdf417-generator");
  const PDF417 = mod.default?.PDF417 ?? mod.PDF417;
  if (!PDF417?.draw) {
    return "";
  }

  const code = pdf417SiiString(params);

  // Canvas ficticio que captura los fillRect de pdf417-generator para
  // reconstruir la matriz de bits como SVG en el servidor.
  const rects: { x: number; y: number; w: number; h: number }[] = [];
  const canvas: Pdf417MockCanvas = {
    width: 0,
    height: 0,
    getContext(): Pdf417MockContext {
      return {
        scale: () => {},
        fillStyle: "#000",
        fillRect(x: number, y: number, w: number, h: number) {
          rects.push({
            x: Math.round(x),
            y: Math.round(y),
            w: Math.round(w),
            h: Math.round(h),
          });
        },
      };
    },
  };

  PDF417.draw(code, canvas, 3, 3, 1, "#000");

  const W = canvas.width || 1;
  const H = canvas.height || 1;
  const parts = rects.map(
    (r) =>
      `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="#000"/>`,
  );
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${parts.join(
    "",
  )}</svg>`;

  return "data:image/svg+xml;base64," + Buffer.from(svg).toString("base64");
}
