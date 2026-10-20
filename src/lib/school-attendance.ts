// Libro de clases: el registro diario y el porcentaje de asistencia.
//
// El 85% (Decreto 67) es el número con el que todos los colegios trabajan: es
// el requisito para promover de curso. La regla de conteo se deja explícita
// acá, porque cada reglamento interno puede variarla y el registro tiene que
// poder auditarse (eso exige la Circular N°30).
//
// Regla implementada (la habitual en Chile):
//   - PRESENTE, LATE (atraso) y JUSTIFIED (justificada) CUENTAN como asistencia.
//   - ABSENT (sin justificar) NO cuenta.
//   - EXCUSED (eximido: permiso, licencia, retirada anticipada) no cuenta ni a
//     favor ni en contra: el alumno estaba ausente pero no por falta.

import { db } from "@/lib/db";
import type { AttendanceStatus } from "@/generated/prisma/client";

/** Los estados que cuentan como asistencia efectiva. */
const CUENTAN: AttendanceStatus[] = ["PRESENT", "LATE", "JUSTIFIED"];

export type ResumenAsistencia = {
  /** Clases dictadas del período (el denominador). */
  total: number;
  /** Presentes + atrasos + justificadas. */
  asiste: number;
  /** Inasistencias sin justificar. */
  falta: number;
  /** Eximidos: no cuentan ni a favor ni en contra. */
  eximidas: number;
  /** Porcentaje de asistencia efectiva (sobre el total, sin eximidas). */
  porcentaje: number;
  /** No hay clases registradas: el porcentaje no significa nada. */
  sinClases: boolean;
  /** Cumple el 85% del Decreto 67. */
  cumple: boolean;
  /** Faltan cuántas clases para llegar al 85%. */
  clasesParaCumplir: number;
};

/** Porcentaje de asistencia efectiva de un alumno en un curso. */
export async function attendanceSummary(
  studentId: string,
  courseId: string,
  desde?: Date,
  hasta?: Date,
): Promise<ResumenAsistencia> {
  const sesiones = await db.classSession.findMany({
    where: {
      courseId,
      ...(desde || hasta
        ? { date: { ...(desde ? { gte: desde } : {}), ...(hasta ? { lte: hasta } : {}) } }
        : {}),
    },
    select: { id: true },
  });
  const sessionIds = sesiones.map((s) => s.id);
  if (sessionIds.length === 0) {
    // Sin clases dictadas no hay porcentaje que valga: decir «100%» sería
    // mentir, porque todavía no se ha visto nada.
    return {
      total: 0,
      asiste: 0,
      falta: 0,
      eximidas: 0,
      porcentaje: 100,
      sinClases: true,
      cumple: true,
      clasesParaCumplir: 0,
    };
  }

  const registros = await db.attendanceRecord.findMany({
    where: { sessionId: { in: sessionIds }, studentId },
    select: { status: true },
  });

  const asiste = registros.filter((r) => CUENTAN.includes(r.status)).length;
  const falta = registros.filter((r) => r.status === "ABSENT").length;
  const eximidas = registros.filter((r) => r.status === "EXCUSED").length;

  // El denominador son las clases dictadas menos las eximidas: un alumno con
  // permiso no es «inasistente» ni en el 85% ni en contra.
  const total = sesiones.length - eximidas;
  const porcentaje = total > 0 ? (asiste / total) * 100 : 100;
  const cumple = porcentaje >= 85;

  // Cuántas clases seguidas tendría que ir para llegar al 85% (si va en
  // perfectas): asiste / (total + x) >= 0.85  ->  x <= asiste/0.85 - total
  let clasesParaCumplir = 0;
  if (!cumple && total > 0) {
    clasesParaCumplir = Math.max(0, Math.floor(asiste / 0.85 - total));
  }

  return { total, asiste, falta, eximidas, porcentaje, sinClases: false, cumple, clasesParaCumplir };
}

/**
 * El resumen de asistencia de varios alumnos de un curso, de una sola vez.
 *
 * El acta de promoción necesita el 85% de cada alumno (Art. 10.2). Consultar
 * alumno por alumno sería una consulta por persona en cada carga de la pantalla
 * de un curso con 40 alumnos: esto lo resuelve con dos.
 */
export async function attendanceByStudents(
  courseId: string,
  studentIds: string[],
  desde?: Date,
  hasta?: Date,
): Promise<Map<string, ResumenAsistencia>> {
  const resultado = new Map<string, ResumenAsistencia>();
  if (studentIds.length === 0) return resultado;

  const sesiones = await db.classSession.findMany({
    where: {
      courseId,
      ...(desde || hasta
        ? { date: { ...(desde ? { gte: desde } : {}), ...(hasta ? { lte: hasta } : {}) } }
        : {}),
    },
    select: { id: true },
  });
  const sessionIds = sesiones.map((s) => s.id);

  const registros =
    sessionIds.length === 0
      ? []
      : await db.attendanceRecord.findMany({
          where: { sessionId: { in: sessionIds }, studentId: { in: studentIds } },
          select: { studentId: true, status: true },
        });

  const porAlumno = new Map<string, typeof registros>();
  for (const r of registros) {
    const lista = porAlumno.get(r.studentId) ?? [];
    lista.push(r);
    porAlumno.set(r.studentId, lista);
  }

  for (const studentId of studentIds) {
    const delAlumno = porAlumno.get(studentId) ?? [];
    const asiste = delAlumno.filter((r) => CUENTAN.includes(r.status)).length;
    const falta = delAlumno.filter((r) => r.status === "ABSENT").length;
    const eximidas = delAlumno.filter((r) => r.status === "EXCUSED").length;

    // El denominador son las clases dictadas menos las eximidas: un alumno con
    // permiso no es «inasistente» ni en el 85% ni en contra.
    const total = sesiones.length - eximidas;
    const porcentaje = total > 0 ? (asiste / total) * 100 : 100;
    const cumple = porcentaje >= 85;

    let clasesParaCumplir = 0;
    if (!cumple && total > 0) {
      clasesParaCumplir = Math.max(0, Math.floor(asiste / 0.85 - total));
    }

    resultado.set(studentId, {
      total,
      asiste,
      falta,
      eximidas,
      porcentaje,
      sinClases: sesiones.length === 0,
      cumple,
      clasesParaCumplir,
    });
  }

  return resultado;
}

/**
 * La hoja de una clase: a quién se le marca, con qué estado y quién lo
 * registró. Es lo que el docente ve y lo que se exporta.
 */
export async function classSheet(sessionId: string) {
  return db.classSession.findUnique({
    where: { id: sessionId },
    include: {
      course: { select: { id: true, name: true } },
      subject: { select: { id: true, name: true } },
      teacher: { select: { id: true, name: true } },
      attendances: {
        include: {
          student: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { student: { lastName: "asc" } },
      },
    },
  });
}

/** Las clases de un curso en un rango de fechas. */
export async function listSessions(
  courseId: string,
  desde?: Date,
  hasta?: Date,
) {
  return db.classSession.findMany({
    where: {
      courseId,
      ...(desde || hasta
        ? { date: { ...(desde ? { gte: desde } : {}), ...(hasta ? { lte: hasta } : {}) } }
        : {}),
    },
    orderBy: [{ date: "desc" }, { period: "desc" }],
    include: {
      subject: { select: { id: true, name: true } },
      teacher: { select: { id: true, name: true } },
      _count: { select: { attendances: true } },
    },
  });
}

/** Los alumnos matriculados en un curso, que son a quien se le marca. */
export async function enrolledStudents(courseId: string) {
  return db.enrollment.findMany({
    where: { courseId, status: "ACTIVE" },
    include: { student: { select: { id: true, firstName: true, lastName: true } } },
    orderBy: { student: { lastName: "asc" } },
  });
}
