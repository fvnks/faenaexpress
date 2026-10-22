import {
  authStatus,
  rcvListAll,
  rcvSummary,
  type RcvDetalleAllDoc,
  type RcvSide,
} from "@albertomarturelo/sii-core";

import { normalizeRut } from "@/lib/rut";
import { createAppRuntime } from "./runtime";

/**
 * Consultas RCV (Registro de Compras y Ventas) del SII para importar
 * facturas de compra y de venta. Solo lectura; la sesión la crea la CLI
 * (`sii auth login`) y vive en ~/.sii/session.json.
 */

export type { RcvSide };

export type SessionStatus = {
  authenticated: boolean;
  rut: string | null;
};

/** Estado LOCAL de la sesión (sin tocar el SII): existe el cookie jar y de quién es. */
export async function readSessionStatus(companyId?: string): Promise<SessionStatus> {
  try {
    const status = await authStatus(createAppRuntime(companyId));
    return { authenticated: status.authenticated, rut: status.rut };
  } catch {
    return { authenticated: false, rut: null };
  }
}

/** Fila del RCV proyectada para la vista previa y la importación. */
export type RcvRow = {
  tipoDoc: number;
  folio: string;
  rut: string;
  nombre: string;
  fecha: string; // AAAA-MM-DD
  neto: number; // incluye exento (sin crédito fiscal)
  iva: number;
  total: number;
  evento: string | null;
  purchaseOrder: string | null; // OC (Orden de Compra) extraída del raw
  hesNumber: string | null; // HES (Orden de Servicio) extraída del raw
  /** Con quién se despacha (una guía la emite la empresa y la recibe el cliente). */
  receptorRut: string | null;
  receptorNombre: string | null;
  /** El documento que la guía despacha: su tipo y su folio. */
  documentoRelacionadoTipo: number | null;
  documentoRelacionadoFolio: string | null;
  raw?: Record<string, unknown>; // para depuración: todos los campos del SII
};

function toInt(value: number | null): number {
  return value ?? 0;
}

/** Busca el primer valor presente entre varios nombres de campo del SII. */
function primeroDe(raw: Record<string, unknown>, claves: string[]): unknown {
  for (const clave of claves) {
    const valor = raw[clave];
    if (valor !== null && valor !== undefined && valor !== "") return valor;
  }
  return undefined;
}

function aTexto(valor: unknown): string | null {
  if (valor === null || valor === undefined || valor === "") return null;
  return String(valor).trim() || null;
}

function aNumero(valor: unknown): number | null {
  if (valor === null || valor === undefined || valor === "") return null;
  const n = Number(valor);
  return Number.isFinite(n) ? n : null;
}

/**
 * El receptor del documento: con quién se despacha.
 *
 * En una factura de venta es el cliente, y el SII lo trae en los mismos
 * campos que el resto. En una guía de despacho el emisor es la empresa y el
 * receptor es el cliente: por eso se busca con alias propios de guía y, si no
 * aparecen, se cae al emisor de la fila.
 */
function extractReceptor(raw: Record<string, unknown>, fallbackRut: string, fallbackNombre: string) {
  const rut = aTexto(
    primeroDe(raw, [
      "detRutRec",
      "detRutReceptor",
      "detRutRecDoc",
      "rutReceptor",
      "rutRec",
      "detRutDoc",
      "detRutEmisor",
    ]),
  );
  const nombre = aTexto(
    primeroDe(raw, [
      "detRznSocRec",
      "detRznSocReceptor",
      "detRznSocRecDoc",
      "razonSocialReceptor",
      "rznSocRec",
      "detRznSoc",
    ]),
  );
  return {
    receptorRut: rut ?? (fallbackRut ? fallbackRut : null),
    receptorNombre: nombre ?? (fallbackNombre ? fallbackNombre : null),
  };
}

/**
 * El documento que la guía despacha.
 *
 * La guía de despacho (tipo 50) viene en el RCV con el tipo y el folio del
 * documento que se está despachando. Con eso se puede enlazar la guía con su
 * factura de venta.
 */
function extractDocumentoRelacionado(raw: Record<string, unknown>) {
  const tipo = aNumero(
    primeroDe(raw, [
      "detTipoDocAso",
      "detTipoDocRel",
      "detTipoDocumentoAsociado",
      "tipoDocAsociado",
      "tipoDocumentoAsociado",
      "detTipoDTE",
      "detCodTipoDoc",
      "codTipoDoc",
      "tipoDocAso",
    ]),
  );
  const folio = aTexto(
    primeroDe(raw, [
      "detNroDocAso",
      "detNroDocRel",
      "detNroDocumentoAsociado",
      "nroDocAsociado",
      "nroDocumentoAsociado",
      "detFolioAso",
      "folioDoc",
      "detFolioDoc",
      "nroDocAso",
    ]),
  );
  return { documentoRelacionadoTipo: tipo, documentoRelacionadoFolio: folio };
}

/**
 * Extrae la OC (Orden de Compra) del raw del RCV.
 * El SII puede usar diferentes nombres de campo según el tipo de documento.
 */
function extractPurchaseOrder(raw: Record<string, unknown>): string | null {
  // Posibles nombres de campo para OC en el RCV del SII
  const keys = ["RUT_OC", "RUT_OC_Nro", "NroOC", "OC_Nro", "ordenCompra", "OC"];
  for (const key of keys) {
    const value = raw[key];
    if (value !== null && value !== undefined && value !== "") {
      return String(value);
    }
  }
  return null;
}

/**
 * Extrae la HES (Orden de Servicio) del raw del RCV.
 * El SII puede usar diferentes nombres de campo según el tipo de documento.
 */
function extractHesNumber(raw: Record<string, unknown>): string | null {
  // Posibles nombres de campo para HES en el RCV del SII
  const keys = ["NroHES", "HES_Nro", "hesNumber", "HES", "ordenServicio", "OS"];
  for (const key of keys) {
    const value = raw[key];
    if (value !== null && value !== undefined && value !== "") {
      return String(value);
    }
  }
  return null;
}

// El SII a veces manda la fecha con hora ("AAAA-MM-DD HH:MM:SS"); nos quedamos
// solo con el día porque el resto del sistema trabaja con fechas simples.
function soloFecha(value: string): string {
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(value);
  return match ? match[1] : value;
}

function projectDoc(doc: RcvDetalleAllDoc): RcvRow {
  const raw = doc.raw as Record<string, unknown>;
  const rut = doc.rutEmisor ?? "";
  const nombre = doc.razonSocial ?? "(sin razón social)";
  const receptor = extractReceptor(raw, rut, nombre);
  const relacionado = extractDocumentoRelacionado(raw);
  return {
    tipoDoc: Number(doc.codigoTipoDoc) || 0,
    folio: doc.folio !== null ? String(doc.folio) : "",
    rut,
    nombre,
    fecha: soloFecha(doc.fechaEmision ?? ""),
    // El exento entra al neto: no da crédito fiscal pero es parte del costo/venta.
    neto: toInt(doc.montoNeto) + toInt(doc.montoExento),
    iva: toInt(doc.montoIva),
    total: toInt(doc.montoTotal),
    evento: doc.eventoReceptorLeyenda ?? doc.eventoReceptor,
    purchaseOrder: extractPurchaseOrder(raw),
    hesNumber: extractHesNumber(raw),
    ...receptor,
    ...relacionado,
    raw,
  };
}

/**
 * Trae todos los documentos del RCV de un período y lado (COMPRA/VENTA)
 * para el RUT de la empresa activa.
 *
 * Si la sesión pertenece a la propia empresa (cuenta empresa), NO se pasa
 * el override de RUT: el SII lo rechaza ("una cuenta empresa no puede operar
 * a nombre de otra") aunque sea su propio RUT. El override solo se usa con
 * cuentas persona que representan a varias empresas.
 */
/**
 * Cotejo entre lo que el SII DECLARA para un período (el resumen, que es su
 * propio agregado) y lo que devolvió el detalle fila por fila.
 *
 * Es la única forma de detectar que faltan documentos: si el resumen dice que
 * hay 150 facturas del mes y el detalle devuelve 148, hay dos que no llegaron,
 * y ningún filtro de la app lo cuenta. Sin esto, una factura ausente es
 * indistinguible de una bien importada.
 */
export type RcvCotejo = {
  /** Por tipo de documento: cuántos declara el SII y cuántos trajo el detalle. */
  tipos: { tipoDoc: number; declarado: number; recibido: number }[];
  /** Totales del período que declara el SII, sumados sobre esos tipos. */
  declarado: { neto: number; iva: number; total: number };
  /** Si el resumen no se pudo leer, se avisa y el cotejo queda vacío. */
  error: string | null;
};

export async function fetchRcvRows(input: {
  companyId: string;
  companyRut: string;
  periodo: string; // AAAA-MM
  side: RcvSide;
}): Promise<{
  rows: RcvRow[];
  sessionRut: string;
  incomplete: boolean;
  rejectedTypes: readonly string[];
  cotejo: RcvCotejo;
}> {
  const runtime = createAppRuntime(input.companyId);

  // ¿La sesión es la propia empresa o una persona que la representa?
  const status = await authStatus(runtime);
  const sessionRut = status.rut ?? "";
  const mismaEmpresa =
    sessionRut !== "" && normalizeRut(sessionRut) === normalizeRut(input.companyRut);
  const overrideRut = mismaEmpresa ? {} : { rut: input.companyRut };

  const result = await rcvListAll(runtime, {
    periodo: input.periodo,
    side: input.side,
    ...overrideRut,
  });

  const rows = result.docs.map(projectDoc).filter((row) => row.folio !== "");

  // El resumen se pide aparte: rcvListAll lo usa por dentro pero no lo expone.
  // Es una sola petición más y da los conteos oficiales del SII.
  let cotejo: RcvCotejo;
  try {
    const resumen = await rcvSummary(runtime, {
      periodo: input.periodo,
      side: input.side,
      ...overrideRut,
    });
    const recibidos = new Map<number, number>();
    for (const row of rows) recibidos.set(row.tipoDoc, (recibidos.get(row.tipoDoc) ?? 0) + 1);

    const tipos: RcvCotejo["tipos"] = [];
    const declarado = { neto: 0, iva: 0, total: 0 };
    for (const fila of resumen.rows) {
      const tipoDoc = Number(fila.codigoTipoDoc);
      if (!Number.isFinite(tipoDoc)) continue;
      tipos.push({ tipoDoc, declarado: fila.totalDocumentos ?? 0, recibido: recibidos.get(tipoDoc) ?? 0 });
      declarado.neto += fila.montoNeto ?? 0;
      declarado.iva += fila.montoIva ?? 0;
      declarado.total += fila.montoTotal ?? 0;
    }
    cotejo = { tipos, declarado, error: null };
  } catch (error) {
    cotejo = {
      tipos: [],
      declarado: { neto: 0, iva: 0, total: 0 },
      error: error instanceof Error ? error.message.split("\n")[0] : String(error),
    };
  }

  return {
    rows,
    sessionRut: result.rut,
    // El SII puede rechazar el detalle de un tipo de documento (p. ej. exentas)
    // mientras devuelve el resto. Sin esto, esos folios desaparecían en silencio.
    incomplete: result.incomplete,
    rejectedTypes: result.rejectedTypes ?? [],
    cotejo,
  };
}
