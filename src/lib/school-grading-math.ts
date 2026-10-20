// La matemática de las calificaciones, sin base de datos.
//
// Vive aparte de `school-grades.ts` porque el cliente la necesita: mientras el
// docente escribe las notas, el promedio se calcula al tiro en pantalla, y esa
// cifra tiene que salir de la misma función que usa el servidor. Si fueran dos
// cálculos distintos, el promedio de la pantalla y el del acta terminarían
// discrepando, que es exactamente el tipo de problema que hace desconfiar de
// un sistema.

/** Nota mínima de aprobación (Art. 8 del Decreto 67/2018). */
export const NOTA_APROBACION = 4.0;

/** Porcentaje mínimo de asistencia para promover (Art. 10.2). */
export const ASISTENCIA_MINIMA = 85;

/** Promedio final anual mínimo si se reprobó una asignatura (Art. 10.1.b). */
export const PROMEDIO_CON_UNA_REPROBADA = 4.5;

/** Promedio final anual mínimo si se reprobaron dos (Art. 10.1.c). */
export const PROMEDIO_CON_DOS_REPROBADAS = 5.0;

/** Redondea a un decimal, como pide el Art. 8. */
export function unDecimal(valor: number): number {
  return Math.round(valor * 10) / 10;
}

/**
 * Promedio ponderado de una lista de (nota, peso).
 *
 * Si ninguna tiene peso, todas pesan lo mismo (el caso normal cuando el
 * docente no pondera). Si alguna lo tiene, manda el peso: las que quedaron en
 * cero no cuentan, porque una ponderación a medias es un error de la
 * planificación y tiene que verse, no compensarse en silencio.
 */
export function promedioPonderado(items: { nota: number; peso: number }[]): number | null {
  if (items.length === 0) return null;
  const conPeso = items.filter((i) => i.peso > 0);
  if (conPeso.length === 0) {
    return unDecimal(items.reduce((acc, i) => acc + i.nota, 0) / items.length);
  }
  const suma = conPeso.reduce((acc, i) => acc + i.nota * i.peso, 0);
  const pesos = conPeso.reduce((acc, i) => acc + i.peso, 0);
  if (pesos === 0) return null;
  return unDecimal(suma / pesos);
}

/** La nota se escribe con un decimal (Art. 8). */
export function formatearNota(valor: number | null | undefined): string {
  if (valor === null || valor === undefined) return "—";
  return valor.toFixed(1);
}
