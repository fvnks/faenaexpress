import type { DocumentType } from "@/generated/prisma/client";
import { normalizeRut } from "../rut";

/**
 * Parámetros para construir el código QR del SII.
 *
 * El SII valida un documento electrónico con el RUT del emisor, el tipo de
 * documento, el folio, la fecha de emisión, el monto total y el RUT del
 * receptor. Esos mismos datos van codificados en el QR impreso en la
 * representación gráfica (factura, boleta, nota de crédito/débito).
 */
export type QrSiiParams = {
  rutEmisor: string; // RUT del emisor con puntos y DV, ej. "78.198.198-2"
  tipoDte: number; // 33 factura, 39 boleta, 61 nota crédito, 56 nota débito
  folio: number | string;
  fecha: Date; // fecha de emisión (día de calendario)
  monto: number; // monto total en CLP
  rutReceptor: string; // RUT del receptor con puntos y DV
};

/**
 * Mapea el `DocumentType` del ERP al código de tipo DTE del SII.
 */
export function tipoDocumentoASii(t: DocumentType): number {
  switch (t) {
    case "INVOICE":
      return 33; // Factura electrónica
    case "RECEIPT":
      return 39; // Boleta electrónica
    case "CREDIT_NOTE":
      return 61; // Nota de crédito
    case "DEBIT_NOTE":
      return 56; // Nota de débito
    default:
      return 33;
  }
}

/** Fecha AAAA-MM-DD → DDMMAAAA (el formato que usa el SII en la validación). */
function fechaDdMmAaaa(date: Date): string {
  const iso = date.toISOString().slice(0, 10); // "2026-10-15"
  return `${iso.slice(8, 10)}${iso.slice(5, 7)}${iso.slice(0, 4)}`; // "15102026"
}

/**
 * Construye la URL de validación del SII para un DTE.
 *
 * Usa el endpoint real de consulta de validez del SII:
 * `palena.sii.cl/cgi_dte/UPL/QEstadoDTE`. Los parámetros son los que el SII
 * exige para identificar un documento: RUT emisor (sin DV), tipo, folio,
 * fecha (DDMMAAAA), monto total y RUT receptor (con DV).
 */
export function qrSiiUrl(params: QrSiiParams): string {
  const emisor = normalizeRut(params.rutEmisor);
  const emisorBody = emisor.slice(0, -1); // sin dígito verificador
  const receptor = normalizeRut(params.rutReceptor); // con dígito verificador

  const qs = new URLSearchParams({
    p: emisorBody,
    t: String(params.tipoDte),
    f: String(params.folio),
    d: fechaDdMmAaaa(params.fecha),
    v: String(Math.round(params.monto)),
    c: receptor,
  });

  return `https://palena.sii.cl/cgi_dte/UPL/QEstadoDTE?${qs.toString()}`;
}
