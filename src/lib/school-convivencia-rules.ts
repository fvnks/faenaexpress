// Las reglas de convivencia, sin base de datos.
//
// Van aparte de `school-convivencia.ts` (que sí consulta) porque los
// componentes de cliente necesitan las etiquetas y los plazos: si importaran
// desde el módulo de la base, el bundler se metería al cliente los módulos de
// Node y el build se caería.

/** Días que tiene la investigación interna de un caso de alumno (Ley 21.809). */
export const DIAS_INVESTIGACION = 60;

/** Meses para la entrega del plan y la actualización del reglamento (9 meses). */
export const MESES_PLAN = 9;

/** Años entre revisiones participativas del plan y del reglamento. */
export const ANIOS_REVISION = 4;

/** Los tipos de caso, con su etiqueta. */
export const TIPOS_CASO = {
  CONDUCTA: "Conducta disruptiva",
  ACOSO_ESCOLAR: "Acoso escolar",
  AGRESION: "Agresión",
  MALTRATO_INFANTIL: "Sospecha de maltrato",
  DISCRIMINACION: "Discriminación",
  ACOSO_LABORAL: "Acoso laboral",
  SALUD_MENTAL: "Bienestar socioemocional",
  OTRO: "Otro",
} as const;

/** Las etapas del protocolo, con su etiqueta. */
export const TIPOS_ACCION = {
  RECEPCION: "Recepción de la denuncia",
  INVESTIGACION: "Investigación",
  ENTREVISTA: "Entrevista",
  CITACION: "Citación a la familia",
  MEDIACION: "Mediación",
  INFORME_COMISION: "Informe de la comisión",
  SANCTION: "Sanción",
  SUSPENSION: "Suspensión",
  EXPULSION: "Expulsión",
  DERIVACION: "Derivación",
  REPOSICION: "Reposición",
  CIERRE: "Cierre del caso",
} as const;

export const ETIQUETA_ESTADO_CASO = {
  ABIERTO: "Abierto",
  EN_INVESTIGACION: "En investigación",
  MEDIACION: "En mediación",
  RESUELTO: "Resuelto",
  CERRADO: "Cerrado",
} as const;

/**
 * Las áreas del plan de gestión: son las que la ley menciona (participación,
 * igualdad, resolución pacífica, mediación, cuidados y responsabilidades
 * digitales, desarrollo socioemocional y salud mental).
 */
export const AREAS_PLAN = {
  PARTICIPACION: "Participación y comunidad",
  IGUALDAD: "Igualdad y no discriminación",
  RESOLUCION_PACIFICA: "Resolución pacífica de conflictos",
  MEDIACION: "Mediación",
  CUIDADOS_DIGITALES: "Cuidados y responsabilidades digitales",
  SOCIOEMOCIONAL: "Desarrollo socioemocional",
  SALUD_MENTAL: "Salud mental",
} as const;

/** La fecha en que se vence la investigación de un caso abierto hoy. */
export function fechaVenceInvestigacion(desde: Date = new Date()): Date {
  const fecha = new Date(desde);
  fecha.setDate(fecha.getDate() + DIAS_INVESTIGACION);
  return fecha;
}

/** El plazo de revisión participativa del plan (4 años). */
export function fechaRevisionPlan(desde: Date = new Date()): Date {
  const fecha = new Date(desde);
  fecha.setFullYear(fecha.getFullYear() + ANIOS_REVISION);
  return fecha;
}
