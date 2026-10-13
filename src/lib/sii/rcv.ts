import {
  authStatus,
  rcvListAll,
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
  raw?: Record<string, unknown>; // para depuración: todos los campos del SII
};

function toInt(value: number | null): number {
  return value ?? 0;
}

function projectDoc(doc: RcvDetalleAllDoc): RcvRow {
  return {
    tipoDoc: Number(doc.codigoTipoDoc) || 0,
    folio: doc.folio !== null ? String(doc.folio) : "",
    rut: doc.rutEmisor ?? "",
    nombre: doc.razonSocial ?? "(sin razón social)",
    fecha: doc.fechaEmision ?? "",
    // El exento entra al neto: no da crédito fiscal pero es parte del costo/venta.
    neto: toInt(doc.montoNeto) + toInt(doc.montoExento),
    iva: toInt(doc.montoIva),
    total: toInt(doc.montoTotal),
    evento: doc.eventoReceptorLeyenda ?? doc.eventoReceptor,
    raw: doc.raw as Record<string, unknown>,
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
export async function fetchRcvRows(input: {
  companyId: string;
  companyRut: string;
  periodo: string; // AAAA-MM
  side: RcvSide;
}): Promise<{ rows: RcvRow[]; sessionRut: string }> {
  const runtime = createAppRuntime(input.companyId);

  // ¿La sesión es la propia empresa o una persona que la representa?
  const status = await authStatus(runtime);
  const sessionRut = status.rut ?? "";
  const mismaEmpresa =
    sessionRut !== "" && normalizeRut(sessionRut) === normalizeRut(input.companyRut);

  const result = await rcvListAll(runtime, {
    periodo: input.periodo,
    side: input.side,
    ...(mismaEmpresa ? {} : { rut: input.companyRut }),
  });
  return {
    rows: result.docs.map(projectDoc).filter((row) => row.folio !== ""),
    sessionRut: result.rut,
  };
}
