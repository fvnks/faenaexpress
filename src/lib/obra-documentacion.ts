// Vocabulario del control documental de una obra. Los tipos son texto (no un
// enum) para poder ampliarlos sin migrar: la lista canónica vive aquí y se
// valida en las Server Actions, igual que el catálogo de medios de pago.

export const TIPOS_DOCUMENTO_OBRA = [
  "CONTRATO",
  "PLANO",
  "PERMISO",
  "CERTIFICADO",
  "SEGURO",
  "FICHA_TECNICA",
  "MANUAL",
  "OTRO",
] as const;

export type TipoDocumentoObra = (typeof TIPOS_DOCUMENTO_OBRA)[number];

export const TIPO_DOCUMENTO_LABELS: Record<TipoDocumentoObra, string> = {
  CONTRATO: "Contrato",
  PLANO: "Plano",
  PERMISO: "Permiso",
  CERTIFICADO: "Certificado",
  SEGURO: "Seguro",
  FICHA_TECNICA: "Ficha técnica",
  MANUAL: "Manual",
  OTRO: "Otro",
};

export const ESTADOS_DOCUMENTO_OBRA = [
  "PENDIENTE",
  "EN_GESTION",
  "RECIBIDO",
  "APROBADO",
  "RECHAZADO",
] as const;

export type EstadoDocumentoObra = (typeof ESTADOS_DOCUMENTO_OBRA)[number];

export const ESTADO_DOCUMENTO_LABELS: Record<EstadoDocumentoObra, string> = {
  PENDIENTE: "Pendiente",
  EN_GESTION: "En gestión",
  RECIBIDO: "Recibido",
  APROBADO: "Aprobado",
  RECHAZADO: "Rechazado",
};

export function esTipoDocumentoObra(valor: string): valor is TipoDocumentoObra {
  return (TIPOS_DOCUMENTO_OBRA as readonly string[]).includes(valor);
}

export function esEstadoDocumentoObra(valor: string): valor is EstadoDocumentoObra {
  return (ESTADOS_DOCUMENTO_OBRA as readonly string[]).includes(valor);
}

/** Los documentos vencen a medianoche del día de su fecha (guardada al mediodía UTC). */
export function diasParaVencer(fecha: Date | null, hoy: Date = new Date()): number | null {
  if (!fecha) return null;
  const venc = Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), fecha.getUTCDate(), 12);
  const actual = Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate(), 12);
  return Math.round((venc - actual) / 86_400_000);
}

export type AlertaVencimiento = "SIN_FECHA" | "VENCIDO" | "POR_VENCER" | "AL_DIA";

export function alertaVencimiento(fecha: Date | null, hoy: Date = new Date()): AlertaVencimiento {
  const dias = diasParaVencer(fecha, hoy);
  if (dias === null) return "SIN_FECHA";
  if (dias < 0) return "VENCIDO";
  if (dias <= 15) return "POR_VENCER";
  return "AL_DIA";
}

/** Los estados terminales no se consideran urgentes aunque tengan fecha pasada. */
export function necesitaAtencion(estado: string, fecha: Date | null, hoy: Date = new Date()): boolean {
  if (estado === "APROBADO" || estado === "RECHAZADO") return false;
  return alertaVencimiento(fecha, hoy) === "VENCIDO";
}
