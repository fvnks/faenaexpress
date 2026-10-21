// El flujo de excepciones del Art. 11 del Decreto 67/2018.
//
// El Art. 10 fija la regla general de promoción; quien no la cumple NO queda
// repitente: el Art. 11 obliga al establecimiento a hacer un análisis
// deliberativo, con un informe del jefe técnico-pedagógico (en colaboración con
// el profesor jefe) y la visión del estudiante y su apoderado. La decisión final
// es de la dirección con la UTP: el sistema no la toma, la registra.
//
// Este archivo es puro (sin base de datos) porque el cliente lo necesita: la
// pantalla del caso muestra el mismo estado que calcula el servidor. La parte
// que toca la base está en `school-promotion-store.ts`.
//
// Lo que la norma exige antes de resolver un caso (los tres mínimos):
//   1. El informe del jefe técnico-pedagógico.
//   2. La audiencia al estudiante y a su apoderado.
//   3. La decisión de la dirección con la UTP, fundada.
//
// Y aparte, la autorización de excepción al 85% de asistencia (Art. 10.2):
// la dirección y la UTP pueden autorizar la promoción de quien no alcanza el
// mínimo, con fundamento. Es un caso distinto del análisis: acá la regla no se
// cumple por asistencia, no por notas.

import { ASISTENCIA_MINIMA } from "@/lib/school-grading-math";

export type PromotionOutcomeValue = "PENDING" | "PROMOTED" | "NOT_PROMOTED";

/** Lo que se sabe de la deliberación de un caso. */
export type DeliberationState = {
  utpReport: string | null;
  utpReportedAt: Date | null;
  hearingHeldAt: Date | null;
  hearingNotes: string | null;
  outcome: PromotionOutcomeValue;
  decision: string | null;
  decidedAt: Date | null;
  attendanceException: boolean;
  attendanceExceptionReason: string | null;
};

/** Qué falta para poder resolver el caso, según la norma. */
export function faltantesDeliberacion(state: {
  utpReport: string | null;
  hearingHeldAt: Date | string | null;
  outcome: PromotionOutcomeValue;
  decision: string | null;
}): string[] {
  const faltan: string[] = [];
  if (!state.utpReport || state.utpReport.trim().length === 0) {
    faltan.push("El informe del jefe técnico-pedagógico (Art. 11).");
  }
  if (!state.hearingHeldAt) {
    faltan.push("La audiencia al estudiante y su apoderado (Art. 11).");
  }
  if (state.outcome === "PENDING" || !state.decision || state.decision.trim().length === 0) {
    faltan.push("La decisión de la dirección con la UTP, con su fundamento (Art. 11).");
  }
  return faltan;
}

/** Un caso queda resuelto cuando tiene su decisión tomada. */
export function estaResuelto(state: { outcome: PromotionOutcomeValue }): boolean {
  return state.outcome !== "PENDING";
}

/**
 * Si la asistencia es la que dejó al alumno fuera de la regla (el caso del
 * Art. 10.2), la vía natural es la autorización de excepción. Si el problema
 * fueron las notas, no: ahí corresponde el análisis.
 */
export function excepcionAplica(asistencia: number | null, cumpleAsistencia: boolean): boolean {
  return !cumpleAsistencia && asistencia !== null && asistencia < ASISTENCIA_MINIMA;
}

/** Etiqueta de la decisión, para la pantalla y el acta. */
export function outcomeLabel(outcome: PromotionOutcomeValue): string {
  switch (outcome) {
    case "PROMOTED":
      return "Promover";
    case "NOT_PROMOTED":
      return "No promover";
    default:
      return "Pendiente";
  }
}

/**
 * El estado del caso, en una palabra, para listarlo.
 *
 * "Resuelto" y "pendiente" son distintos de la SITUACIÓN de promoción que
 * calcula el Art. 10: un caso puede seguir marcado "requiere análisis" para el
 * Art. 10 y ya tener su decisión del Art. 11.
 */
export type CasoEstado = "RESUELTO" | "PENDIENTE";

export function casoEstado(state: { outcome: PromotionOutcomeValue }): CasoEstado {
  return estaResuelto(state) ? "RESUELTO" : "PENDIENTE";
}
