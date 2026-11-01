// El equipo del colegio y el alcance de cada persona.
//
// Aquí viven dos cosas que antes no existían:
//
// 1. **Quién entra al colegio.** `SchoolMembership` es el equivalente escolar
//    de `Membership` (el de empresas) y se crea desde acá: la dirección suma
//    a su gente, con un rol y una contraseña provisional.
//
// 2. **Qué puede tocar cada quien.** El docente escribe solo en los cursos y
//    asignaturas que tiene asignados (`TeachingAssignment`). La dirección, la
//    UTP y el funcionario que cubre reemplazos escriben en todo el colegio.
//
// El alcance vive acá y no en las pantallas: las Server Actions son alcanzables
// por POST directo, así que el corte tiene que estar en el servidor.

import type { SchoolRole } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import {
  ALCANCE_ASISTENCIA,
  ALCANCE_CALIFICACIONES,
  tieneAlcanceGlobal,
} from "@/lib/school-permissions";

/**
 * Lo mínimo del contexto que hace falta para decidir el alcance.
 *
 * Es estructural a propósito: no importa `SchoolContext` entero, y así esta
 * capa se puede probar sin levantar la sesión.
 */
export type ContextoAlcance = {
  user: { id: string };
  school: { id: string };
  role: SchoolRole;
};

/** Una asignatura que imparte el docente de esa persona, en su curso. */
export type AsignacionDocente = {
  courseId: string;
  courseName: string;
  courseYear: number;
  subjectId: string;
  subjectName: string;
  teacherId: string;
};

/** La ficha de docente de una persona en este colegio, si la tiene. */
export async function docenteDeUsuario(userId: string, schoolId: string) {
  return db.teacher.findFirst({
    where: { userId, schoolId },
    select: { id: true, name: true, rut: true },
  });
}

/** Las asignaturas (curso × asignatura) que imparte el docente de esa persona. */
export async function asignacionesDeDocente(
  userId: string,
  schoolId: string,
): Promise<AsignacionDocente[]> {
  const docente = await docenteDeUsuario(userId, schoolId);
  if (!docente) return [];

  const filas = await db.teachingAssignment.findMany({
    where: { teacherId: docente.id, course: { schoolId } },
    include: {
      course: { select: { id: true, name: true, year: true } },
      subject: { select: { id: true, name: true } },
    },
  });

  return filas
    .map((f) => ({
      courseId: f.course.id,
      courseName: f.course.name,
      courseYear: f.course.year,
      subjectId: f.subject.id,
      subjectName: f.subject.name,
      teacherId: docente.id,
    }))
    .sort(
      (a, b) =>
        b.courseYear - a.courseYear ||
        a.courseName.localeCompare(b.courseName, "es") ||
        a.subjectName.localeCompare(b.subjectName, "es"),
    );
}

/** ¿La persona imparte esa asignatura en ese curso? */
export async function esDocenteDeAsignatura(
  userId: string,
  schoolId: string,
  courseId: string,
  subjectId: string,
): Promise<boolean> {
  const encontradas = await db.teachingAssignment.count({
    where: {
      courseId,
      subjectId,
      teacher: { is: { userId, schoolId } },
    },
  });
  return encontradas > 0;
}

/** Los cursos que la persona puede ver como docente. */
export async function cursosDeDocente(userId: string, schoolId: string): Promise<string[]> {
  const docente = await docenteDeUsuario(userId, schoolId);
  if (!docente) return [];

  const filas = await db.teachingAssignment.findMany({
    where: { teacherId: docente.id, course: { schoolId } },
    select: { courseId: true },
  });
  return [...new Set(filas.map((f) => f.courseId))];
}

/**
 * ¿Puede esta persona registrar la asistencia de esa clase?
 *
 * El funcionario (STAFF) sí: cubre reemplazos. El docente, solo en sus
 * asignaturas.
 */
export async function puedeRegistrarEnClase(
  ctx: ContextoAlcance,
  courseId: string,
  subjectId: string,
): Promise<boolean> {
  if (tieneAlcanceGlobal(ctx.role, ALCANCE_ASISTENCIA)) return true;
  if (ctx.role !== "TEACHER") return false;
  return esDocenteDeAsignatura(ctx.user.id, ctx.school.id, courseId, subjectId);
}

/**
 * ¿Puede esta persona calificar esa asignatura?
 *
 * Solo la dirección y la UTP escriben en cualquier curso: el resto tiene que
 * pasar por el docente de la asignatura.
 */
export async function puedeCalificarEnAsignatura(
  ctx: ContextoAlcance,
  courseId: string,
  subjectId: string,
): Promise<boolean> {
  if (tieneAlcanceGlobal(ctx.role, ALCANCE_CALIFICACIONES)) return true;
  if (ctx.role !== "TEACHER") return false;
  return esDocenteDeAsignatura(ctx.user.id, ctx.school.id, courseId, subjectId);
}

/** Una persona del equipo del colegio. */
export type MiembroEquipo = {
  membershipId: string;
  userId: string;
  nombre: string;
  email: string;
  role: SchoolRole;
  activo: boolean;
  debeCambiarClave: boolean;
  docenteId: string | null;
  docenteNombre: string | null;
  ultimaEntrada: Date | null;
};

/**
 * El equipo del colegio: quién entra, con qué rol y si su ficha de docente
 * quedó vinculada.
 *
 * La ficha de docente es lo que conecta a la persona con sus cursos: sin el
 * vínculo, el sistema no puede saber qué clases ni qué notas le tocan.
 */
export async function listarEquipo(schoolId: string): Promise<MiembroEquipo[]> {
  const membresias = await db.schoolMembership.findMany({
    where: { schoolId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          active: true,
          mustChangePassword: true,
          teacherProfile: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: [{ active: "desc" }, { createdAt: "asc" }],
  });

  // La última entrada de cada persona: el registro de accesos ya lo sabe.
  const ids = membresias.map((m) => m.userId);
  const accesos = ids.length
    ? await db.accessLog.findMany({
        where: { userId: { in: ids }, kind: "login" },
        orderBy: { createdAt: "desc" },
        take: 200,
        select: { userId: true, createdAt: true },
      })
    : [];
  const ultima = new Map<string, Date>();
  for (const a of accesos) {
    // El `userId` del registro de accesos es opcional: los accesos sin cuenta
    // (un intento fallido) no dicen cuándo entró nadie.
    if (!a.userId) continue;
    if (!ultima.has(a.userId)) ultima.set(a.userId, a.createdAt);
  }

  return membresias.map((m) => ({
    membershipId: m.id,
    userId: m.user.id,
    nombre: m.user.name,
    email: m.user.email,
    role: m.role,
    activo: m.active && m.user.active,
    debeCambiarClave: m.user.mustChangePassword,
    docenteId: m.user.teacherProfile?.id ?? null,
    docenteNombre: m.user.teacherProfile?.name ?? null,
    ultimaEntrada: ultima.get(m.user.id) ?? null,
  }));
}
