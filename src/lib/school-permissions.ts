// Permisos del módulo Colegios.
//
// Es paralelo a `src/lib/permissions.ts` (que es de empresas) a propósito: un
// colegio y una empresa no se gobiernan igual, y mezclar los dos roles haría
// imposible de explicar quién ve qué.
//
// Los roles de un colegio:
//   DIRECTOR  la dirección: ve y decide todo
//   UTP       jefatura de estudios: lo académico
//   ADMIN     administración: secretaría, inspección, admisiones
//   TEACHER   docente: sus cursos y sus registros
//   STAFF     funcionario: asistencia y reemplazos
//   VIEWER    solo lectura

import type { SchoolLevel, SchoolRole } from "@/generated/prisma/client";

export const schoolSections = [
  "panel",
  "estudiantes",
  "apoderados",
  "cursos",
  "docentes",
  "equipo",
  "asistencia",
  "calificaciones",
  "promocion",
  "art11",
  "libro",
  "convivencia",
  "comunicacion",
  "cobranza",
  "administracion",
] as const;

export type SchoolSection = (typeof schoolSections)[number];

// Quién entra a cada sección.
const ACCESS: Record<SchoolSection, readonly SchoolRole[]> = {
  panel: ["DIRECTOR", "UTP", "ADMIN", "TEACHER", "STAFF", "VIEWER"],
  estudiantes: ["DIRECTOR", "UTP", "ADMIN", "VIEWER"],
  // El acceso de las familias: el código del portal se ve y se emite acá.
  apoderados: ["DIRECTOR", "UTP", "ADMIN", "VIEWER"],
  cursos: ["DIRECTOR", "UTP", "ADMIN", "TEACHER", "VIEWER"],
  docentes: ["DIRECTOR", "UTP", "ADMIN", "VIEWER"],
  // El equipo del colegio: quién entra y con qué rol. Lo ve la dirección, la
  // jefatura y la secretaría; el docente no necesita ver la lista de cuentas.
  equipo: ["DIRECTOR", "UTP", "ADMIN", "VIEWER"],
  // La asistencia la registra el docente; el resto la ve pero no la escribe.
  asistencia: ["DIRECTOR", "UTP", "ADMIN", "TEACHER", "STAFF", "VIEWER"],
  calificaciones: ["DIRECTOR", "UTP", "TEACHER", "VIEWER"],
  // El acta de promoción es una decisión del establecimiento (Art. 11 del
  // Decreto 67/2018): la ve la dirección y la jefatura de estudios, no el
  // docente.
  promocion: ["DIRECTOR", "UTP", "VIEWER"],
  // El análisis del Art. 11 lo resuelven la dirección y la UTP: es una decisión
  // del establecimiento, no del sistema. El docente no entra acá.
  art11: ["DIRECTOR", "UTP", "VIEWER"],
  libro: ["DIRECTOR", "UTP", "TEACHER", "VIEWER"],
  convivencia: ["DIRECTOR", "UTP", "ADMIN", "TEACHER", "VIEWER"],
  comunicacion: ["DIRECTOR", "UTP", "ADMIN", "STAFF", "VIEWER"],
  cobranza: ["DIRECTOR", "ADMIN", "VIEWER"],
  administracion: ["DIRECTOR", "ADMIN"],
};

// Quién puede escribir en cada sección.
const WRITE: Record<SchoolSection, readonly SchoolRole[]> = {
  panel: [],
  estudiantes: ["DIRECTOR", "UTP", "ADMIN"],
  // Emitir y rotar el código de acceso es de la secretaría y la dirección.
  apoderados: ["DIRECTOR", "UTP", "ADMIN"],
  cursos: ["DIRECTOR", "UTP", "ADMIN"],
  docentes: ["DIRECTOR", "UTP", "ADMIN"],
  // Sumar y sacar gente del equipo es de la dirección y de la secretaría: es
  // dar acceso a los datos de los alumnos.
  equipo: ["DIRECTOR", "ADMIN"],
  asistencia: ["DIRECTOR", "UTP", "TEACHER", "STAFF"],
  calificaciones: ["DIRECTOR", "UTP", "TEACHER"],
  // El acta se arma sola: nadie la escribe a mano en el sistema.
  promocion: [],
  // Acá sí se escribe: es la deliberación y la decisión del Art. 11.
  art11: ["DIRECTOR", "UTP"],
  libro: ["DIRECTOR", "UTP", "TEACHER"],
  convivencia: ["DIRECTOR", "UTP", "ADMIN"],
  comunicacion: ["DIRECTOR", "UTP", "ADMIN"],
  cobranza: ["DIRECTOR", "ADMIN"],
  administracion: ["DIRECTOR", "ADMIN"],
};

export function canAccessSchool(role: SchoolRole, section: SchoolSection): boolean {
  return ACCESS[section].includes(role);
}

export function canWriteSchool(role: SchoolRole, section: SchoolSection): boolean {
  return WRITE[section].includes(role);
}

/**
 * El alcance de escritura cuando el rol no basta para decidir.
 *
 * Un rol dice *qué puede hacer* una persona; el alcance dice *dónde*. La
 * dirección y la UTP escriben en cualquier curso del colegio (una nota mal
 * puesta o una clase sin registrar se corrige desde arriba), pero el docente
 * solo en los cursos y asignaturas que tiene asignados. Sin esta segunda
 * capa, un docente podía calificar el curso de otro: los datos de un menor
 * quedaban al alcance de quien no es su profesor.
 */
export const ALCANCE_ASISTENCIA: readonly SchoolRole[] = ["DIRECTOR", "UTP", "STAFF"];
export const ALCANCE_CALIFICACIONES: readonly SchoolRole[] = ["DIRECTOR", "UTP"];

/** Si el rol escribe en cualquier curso del colegio, sin mirar asignaciones. */
export function tieneAlcanceGlobal(role: SchoolRole, alcance: readonly SchoolRole[]): boolean {
  return alcance.includes(role);
}

const ROLE_LABELS: Record<SchoolRole, string> = {
  DIRECTOR: "Dirección",
  UTP: "Jefatura de estudios",
  ADMIN: "Administración",
  TEACHER: "Docente",
  STAFF: "Funcionario",
  VIEWER: "Solo lectura",
};

export function schoolRoleLabel(role: SchoolRole): string {
  return ROLE_LABELS[role];
}

/** Niveles de enseñanza, en orden. */
export const SCHOOL_LEVELS = [
  { value: "PARVULARIA", label: "Parvularia" },
  { value: "PREBASICA", label: "Pre-básica" },
  { value: "BASICA", label: "Básica" },
  { value: "MEDIA", label: "Media" },
  { value: "TECNICO", label: "Técnico-profesional" },
] as const;

export function schoolLevelLabel(level: SchoolLevel | string): string {
  return SCHOOL_LEVELS.find((l) => l.value === level)?.label ?? String(level);
}
