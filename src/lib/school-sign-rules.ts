// Reglas puras de la firma del libro de clases: sin acceso a base de datos.
//
// Se usan tanto en Server Components (para mostrar estado) como en Client
// Components (a través de la Server Action) sin traer dependencias de servidor.
import type { SchoolRole } from "@/generated/prisma/client";
import { formatRut, normalizeRut } from "@/lib/rut";

/** Lo que el exportador del EDE necesita de cada firma. */
export type FirmaExportable = {
  sessionId: string;
  otp: string;
  verificadoEn: Date;
  firmadoPorId: string;
  firmadoPor: string;
  runFirmante: string;
  asistencias: number;
};

/** Una firma, con lo que la UI muestra para decir quién firmó y cuándo. */
export type FirmaVisible = FirmaExportable & { id: string };

/**
 * ¿Puede esta persona firmar esta sesión?
 *
 * El criterio es el rol más quién registró: el docente firma lo suyo, la
 * dirección y la UTP firman lo pendiente de cualquiera.
 */
export function puedeFirmarSesion(
  role: SchoolRole,
  userId: string,
  registradoPor: string,
): { ok: true } | { ok: false; mensaje: string } {
  if (role === "DIRECTOR" || role === "UTP") return { ok: true };

  if (role !== "TEACHER") {
    return {
      ok: false,
      mensaje: "Tu rol no permite firmar el libro de clases. Lo hacen el docente que registró, la dirección o la UTP.",
    };
  }

  if (registradoPor !== userId) {
    return {
      ok: false,
      mensaje:
        "Esta clase la registró otra persona. Firma la que la registró, o la dirección o la UTP si quedó pendiente.",
    };
  }
  return { ok: true };
}

/**
 * Una firma cubre la sesión mientras cuadre con lo que hay hoy.
 *
 * Comprueba la cantidad de asistencias que cubrió: si alguien agregó o borró
 * un alumno por fuera de los caminos que invalidan la firma, esto lo detecta.
 */
export function firmaCuadra(
  firma: { id: string; attendances: number },
  asistenciasDeLaSesion: number,
): boolean {
  return firma.attendances === asistenciasDeLaSesion;
}

/** El RUN del firmante, en el formato en que lo guarda la base. */
export function runFirmante(rut: string): string {
  return formatRut(normalizeRut(rut));
}
