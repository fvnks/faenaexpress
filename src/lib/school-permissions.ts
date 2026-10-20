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
  "cursos",
  "docentes",
  "asistencia",
  "calificaciones",
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
  cursos: ["DIRECTOR", "UTP", "ADMIN", "TEACHER", "VIEWER"],
  docentes: ["DIRECTOR", "UTP", "ADMIN", "VIEWER"],
  // La asistencia la registra el docente; el resto la ve pero no la escribe.
  asistencia: ["DIRECTOR", "UTP", "ADMIN", "TEACHER", "STAFF", "VIEWER"],
  calificaciones: ["DIRECTOR", "UTP", "TEACHER", "VIEWER"],
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
  cursos: ["DIRECTOR", "UTP", "ADMIN"],
  docentes: ["DIRECTOR", "UTP", "ADMIN"],
  asistencia: ["DIRECTOR", "UTP", "TEACHER", "STAFF"],
  calificaciones: ["DIRECTOR", "UTP", "TEACHER"],
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
