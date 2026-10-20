"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { EvaluationType, GradeStatus, GradingPeriodType } from "@/generated/prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireSchoolContext, schoolCanWrite, SCHOOL_COOKIE } from "@/lib/school-auth";

export type AttendanceFormState = { error?: string; ok?: boolean } | undefined;

const ESTADOS = ["PRESENT", "ABSENT", "LATE", "JUSTIFIED", "EXCUSED"] as const;

/** Cambia el colegio abierto (la cookie del módulo Colegios). */
export async function switchSchool(schoolId: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const membership = await db.schoolMembership.findFirst({
    where: { userId: user.id, schoolId, active: true },
    select: { id: true },
  });
  if (!membership) redirect("/colegios");

  const cookieStore = await cookies();
  cookieStore.set(SCHOOL_COOKIE, schoolId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });

  redirect("/colegios");
}

/**
 * Registra la asistencia de una clase.
 *
 * Cada registro guarda QUIÉN lo registró y CUÁNDO: la Circular N°30 pide
 * trazabilidad de cada dato del libro (quién, cuándo y las correcciones).
 */
export async function saveAttendance(
  _prev: AttendanceFormState,
  formData: FormData,
): Promise<AttendanceFormState> {
  const ctx = await requireSchoolContext("asistencia");
  if (!schoolCanWrite(ctx, "asistencia")) {
    return { error: "Tu rol no permite registrar asistencia." };
  }

  const sessionId = String(formData.get("sessionId") ?? "").trim();
  if (!sessionId) return { error: "Falta la clase." };

  const sesion = await db.classSession.findFirst({
    where: { id: sessionId, schoolId: ctx.school.id },
    select: { id: true, courseId: true },
  });
  if (!sesion) return { error: "Esa clase no es de este colegio." };

  // Solo se puede marcar a quien está matriculado en el curso.
  const matriculados = await db.enrollment.findMany({
    where: { courseId: sesion.courseId, status: "ACTIVE" },
    select: { studentId: true },
  });
  const idsPermitidos = new Set(matriculados.map((m) => m.studentId));

  const estados = formData.getAll("estado");
  const ids = formData.getAll("studentId");

  if (ids.length === 0) return { error: "No hay alumnos marcados." };

  for (const [i, studentId] of ids.entries()) {
    const student = String(studentId);
    if (!idsPermitidos.has(student)) {
      return { error: "Uno de los alumnos no está matriculado en el curso." };
    }
    const estado = String(estados[i] ?? "PRESENT");
    if (!ESTADOS.includes(estado as (typeof ESTADOS)[number])) {
      return { error: "Estado de asistencia inválido." };
    }
    const nota = String(formData.getAll("nota")[i] ?? "").trim();
    const justificacion = String(formData.getAll("justificacion")[i] ?? "").trim();

    await db.attendanceRecord.upsert({
      where: { sessionId_studentId: { sessionId, studentId: student } },
      update: {
        status: estado as (typeof ESTADOS)[number],
        justificationNote: justificacion || null,
        recordedById: ctx.user.id,
        recordedAt: new Date(),
      },
      create: {
        sessionId,
        studentId: student,
        status: estado as (typeof ESTADOS)[number],
        justificationNote: justificacion || null,
        recordedById: ctx.user.id,
      },
    });
  }

  revalidatePath("/colegios/asistencia");
  revalidatePath("/colegios/estudiantes");
  return { ok: true };
}

/**
 * Crea (o reutiliza) la clase de un curso y asignatura en una fecha, y guarda
 * el registro de la clase: contenidos, actividades y objetivos (el leccionario
 * que la Circular N°30 exige).
 */
export async function saveClassSession(
  _prev: AttendanceFormState,
  formData: FormData,
): Promise<AttendanceFormState> {
  const ctx = await requireSchoolContext("asistencia");
  if (!schoolCanWrite(ctx, "asistencia")) {
    return { error: "Tu rol no permite registrar clases." };
  }

  const courseId = String(formData.get("courseId") ?? "").trim();
  const subjectId = String(formData.get("subjectId") ?? "").trim();
  const teacherId = String(formData.get("teacherId") ?? "").trim();
  const fecha = String(formData.get("date") ?? "").trim();
  const periodo = String(formData.get("period") ?? "").trim();

  if (!courseId || !subjectId || !teacherId || !fecha) {
    return { error: "Revisa los datos de la clase." };
  }

  const [curso, asignatura, docente] = await Promise.all([
    db.course.findFirst({ where: { id: courseId, schoolId: ctx.school.id }, select: { id: true } }),
    db.subject.findFirst({ where: { id: subjectId, schoolId: ctx.school.id }, select: { id: true } }),
    db.teacher.findFirst({ where: { id: teacherId, schoolId: ctx.school.id }, select: { id: true } }),
  ]);
  if (!curso || !asignatura || !docente) {
    return { error: "Curso, asignatura o docente no válidos para este colegio." };
  }

  const date = new Date(`${fecha}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return { error: "La fecha no es válida." };

  await db.classSession.upsert({
    where: {
      courseId_subjectId_date_period: {
        courseId,
        subjectId,
        date,
        period: periodo ? Number(periodo) : 1,
      },
    },
    update: {
      teacherId,
      startTime: String(formData.get("startTime") ?? "").trim() || null,
      endTime: String(formData.get("endTime") ?? "").trim() || null,
      contents: String(formData.get("contents") ?? "").trim() || null,
      activities: String(formData.get("activities") ?? "").trim() || null,
      objectives: String(formData.get("objectives") ?? "").trim() || null,
      recordedById: ctx.user.id,
      recordedAt: new Date(),
    },
    create: {
      schoolId: ctx.school.id,
      courseId,
      subjectId,
      teacherId,
      date,
      period: periodo ? Number(periodo) : 1,
      startTime: String(formData.get("startTime") ?? "").trim() || null,
      endTime: String(formData.get("endTime") ?? "").trim() || null,
      contents: String(formData.get("contents") ?? "").trim() || null,
      activities: String(formData.get("activities") ?? "").trim() || null,
      objectives: String(formData.get("objectives") ?? "").trim() || null,
      recordedById: ctx.user.id,
    },
  });

  revalidatePath("/colegios/asistencia");
  return { ok: true };
}

/** Crea un alumno y lo matricula en un curso. */
export async function createStudent(
  _prev: AttendanceFormState,
  formData: FormData,
): Promise<AttendanceFormState> {
  const ctx = await requireSchoolContext("estudiantes");
  if (!schoolCanWrite(ctx, "estudiantes")) {
    return { error: "Tu rol no permite registrar alumnos." };
  }

  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const courseId = String(formData.get("courseId") ?? "").trim();
  const rut = String(formData.get("rut") ?? "").trim();

  if (firstName.length < 1 || lastName.length < 1) {
    return { error: "El nombre y el apellido del alumno son obligatorios." };
  }
  if (!courseId) return { error: "Elige el curso." };

  const curso = await db.course.findFirst({
    where: { id: courseId, schoolId: ctx.school.id },
    select: { id: true },
  });
  if (!curso) return { error: "Ese curso no es de este colegio." };

  const student = await db.student.create({
    data: {
      schoolId: ctx.school.id,
      firstName,
      lastName,
      rut: rut || null,
    },
    select: { id: true },
  });

  await db.enrollment.create({
    data: { courseId, studentId: student.id, status: "ACTIVE" },
  });

  revalidatePath("/colegios/estudiantes");
  revalidatePath("/colegios/asistencia");
  return { ok: true };
}

/** Crea un curso del colegio. */
export async function createCourse(
  _prev: AttendanceFormState,
  formData: FormData,
): Promise<AttendanceFormState> {
  const ctx = await requireSchoolContext("cursos");
  if (!schoolCanWrite(ctx, "cursos")) {
    return { error: "Tu rol no permite crear cursos." };
  }

  const name = String(formData.get("name") ?? "").trim();
  const year = Number(formData.get("year") ?? new Date().getFullYear());
  const level = String(formData.get("level") ?? "BASICA");
  const section = String(formData.get("section") ?? "").trim();

  if (name.length < 1) return { error: "El nombre del curso es obligatorio." };
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    return { error: "El año escolar no es válido." };
  }
  if (!["PARVULARIA", "PREBASICA", "BASICA", "MEDIA", "TECNICO"].includes(level)) {
    return { error: "El nivel no es válido." };
  }

  await db.course.create({
    data: {
      schoolId: ctx.school.id,
      name,
      year,
      level: level as "PARVULARIA" | "PREBASICA" | "BASICA" | "MEDIA" | "TECNICO",
      section: section || null,
    },
  });

  revalidatePath("/colegios/cursos");
  revalidatePath("/colegios");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Calificaciones y promoción (Decreto 67/2018)
// ---------------------------------------------------------------------------

export type GradesFormState = { error?: string; ok?: boolean } | undefined;

/**
 * Guarda las notas de una evaluación.
 *
 * Cada nota queda con QUIÉN la puso y CUÁNDO: la Circular N°30 pide
 * trazabilidad de cada dato que el colegio registra.
 */
export async function saveGrades(
  _prev: GradesFormState,
  formData: FormData,
): Promise<GradesFormState> {
  const ctx = await requireSchoolContext("calificaciones");
  if (!schoolCanWrite(ctx, "calificaciones")) {
    return { error: "Tu rol no permite registrar calificaciones." };
  }

  const evaluationId = String(formData.get("evaluationId") ?? "").trim();
  if (!evaluationId) return { error: "Falta la evaluación." };

  const evaluacion = await db.evaluation.findFirst({
    where: { id: evaluationId, schoolId: ctx.school.id },
    select: { id: true, courseId: true },
  });
  if (!evaluacion) return { error: "Esa evaluación no es de este colegio." };

  // Solo se califica a quien está matriculado en el curso.
  const matriculados = await db.enrollment.findMany({
    where: { courseId: evaluacion.courseId, status: "ACTIVE" },
    select: { studentId: true },
  });
  const permitidos = new Set(matriculados.map((m) => m.studentId));

  const ids = formData.getAll("studentId").map(String);
  const notas = formData.getAll("nota").map(String);
  const estados = formData.getAll("estado").map(String);

  const registros: { studentId: string; value: number | null; status: GradeStatus }[] = [];

  for (let i = 0; i < ids.length; i++) {
    const studentId = ids[i];
    if (!permitidos.has(studentId)) continue;

    const estadoCrudo = (estados[i] ?? "PENDIENTE").toUpperCase();
    if (estadoCrudo === "EXENTO") {
      registros.push({ studentId, value: null, status: "EXENTO" });
      continue;
    }
    if (estadoCrudo !== "GRADED") {
      registros.push({ studentId, value: null, status: "PENDIENTE" });
      continue;
    }

    const notaCruda = (notas[i] ?? "").trim().replace(",", ".");
    if (notaCruda === "") {
      return { error: "Una calificación quedó marcada como puesta pero sin nota." };
    }
    const nota = Number(notaCruda);
    if (!Number.isFinite(nota)) return { error: "Hay una nota que no es un número." };
    // Escala 1.0 a 7.0 (Art. 8 del Decreto 67/2018), con un decimal.
    if (nota < 1 || nota > 7) return { error: "Las notas van de 1.0 a 7.0." };
    registros.push({ studentId, value: Math.round(nota * 10) / 10, status: "GRADED" });
  }

  if (registros.length === 0) return { error: "No hay alumnos que calificar." };

  // La hoja es la fuente de verdad de esa evaluación: lo que viene se guarda,
  // nota por nota, con su estado.
  await db.$transaction(
    registros.map((r) =>
      db.grade.upsert({
        where: { evaluationId_studentId: { evaluationId, studentId: r.studentId } },
        create: {
          evaluationId,
          studentId: r.studentId,
          value: r.value,
          status: r.status,
          recordedById: ctx.user.id,
        },
        update: {
          value: r.value,
          status: r.status,
          recordedById: ctx.user.id,
          recordedAt: new Date(),
        },
      }),
    ),
  );

  revalidatePath("/colegios/calificaciones");
  revalidatePath("/colegios/promocion");
  return { ok: true };
}

/** Crea una evaluación en un curso, asignatura y período. */
export async function createEvaluation(
  _prev: GradesFormState,
  formData: FormData,
): Promise<GradesFormState> {
  const ctx = await requireSchoolContext("calificaciones");
  if (!schoolCanWrite(ctx, "calificaciones")) {
    return { error: "Tu rol no permite crear evaluaciones." };
  }

  const courseId = String(formData.get("courseId") ?? "").trim();
  const subjectId = String(formData.get("subjectId") ?? "").trim();
  const periodId = String(formData.get("periodId") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "PRUEBA");
  const dateCruda = String(formData.get("date") ?? "").trim();
  const weight = Number(formData.get("weight") ?? 0);
  const isFinal = formData.get("isFinal") === "on";

  if (!courseId || !subjectId || !periodId) {
    return { error: "Falta el curso, la asignatura o el período." };
  }
  if (name.length < 1) return { error: "El nombre de la evaluación es obligatorio." };

  const [curso, asignatura, periodo] = await Promise.all([
    db.course.findFirst({ where: { id: courseId, schoolId: ctx.school.id }, select: { id: true } }),
    db.subject.findFirst({ where: { id: subjectId, schoolId: ctx.school.id }, select: { id: true } }),
    db.gradingPeriod.findFirst({ where: { id: periodId, schoolId: ctx.school.id }, select: { id: true } }),
  ]);
  if (!curso || !asignatura || !periodo) {
    return { error: "El curso, la asignatura o el período no son de este colegio." };
  }

  if (!Number.isFinite(weight) || weight < 0 || weight > 100) {
    return { error: "La ponderación va de 0 a 100." };
  }
  // Art. 18 h) del Decreto 67/2018: la evaluación final no puede pesar más
  // del 30% del período.
  if (isFinal && weight > 30) {
    return { error: "La evaluación final no puede pesar más del 30% del período." };
  }

  const date = dateCruda ? new Date(`${dateCruda}T00:00:00.000Z`) : new Date();
  if (Number.isNaN(date.getTime())) return { error: "La fecha no es válida." };

  await db.evaluation.create({
    data: {
      schoolId: ctx.school.id,
      courseId,
      subjectId,
      periodId,
      name,
      type: type as EvaluationType,
      date,
      weight: Math.round(weight),
      isFinal,
    },
  });

  revalidatePath("/colegios/calificaciones");
  return { ok: true };
}

/** Elimina una evaluación y sus notas. */
export async function deleteEvaluation(
  _prev: GradesFormState,
  formData: FormData,
): Promise<GradesFormState> {
  const ctx = await requireSchoolContext("calificaciones");
  if (!schoolCanWrite(ctx, "calificaciones")) {
    return { error: "Tu rol no permite eliminar evaluaciones." };
  }

  const id = String(formData.get("evaluationId") ?? "").trim();
  if (!id) return { error: "Falta la evaluación." };

  const eliminada = await db.evaluation.deleteMany({
    where: { id, schoolId: ctx.school.id },
  });
  if (eliminada.count === 0) return { error: "Esa evaluación no es de este colegio." };

  revalidatePath("/colegios/calificaciones");
  revalidatePath("/colegios/promocion");
  return { ok: true };
}

/** Crea un período de evaluación (semestre o trimestre) del colegio. */
export async function createGradingPeriod(
  _prev: GradesFormState,
  formData: FormData,
): Promise<GradesFormState> {
  const ctx = await requireSchoolContext("calificaciones");
  if (!schoolCanWrite(ctx, "calificaciones")) {
    return { error: "Tu rol no puede modificar los períodos de evaluación." };
  }

  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "SEMESTRE");
  const startDate = String(formData.get("startDate") ?? "").trim();
  const endDate = String(formData.get("endDate") ?? "").trim();
  const weight = Number(formData.get("weight") ?? 0);
  const order = Number(formData.get("order") ?? 0);

  if (name.length < 1) return { error: "El nombre del período es obligatorio." };
  if (!["SEMESTRE", "TRIMESTRE"].includes(type)) return { error: "El tipo de período no es válido." };
  if (!startDate || !endDate) return { error: "El período necesita fechas de inicio y término." };
  if (!Number.isFinite(weight) || weight < 0 || weight > 100) {
    return { error: "La ponderación del período va de 0 a 100." };
  }

  const inicio = new Date(`${startDate}T00:00:00.000Z`);
  const termino = new Date(`${endDate}T00:00:00.000Z`);
  if (Number.isNaN(inicio.getTime()) || Number.isNaN(termino.getTime())) {
    return { error: "Las fechas del período no son válidas." };
  }
  if (termino < inicio) return { error: "El período termina antes de empezar." };

  const orden = Number.isFinite(order) && order > 0 ? Math.round(order) : undefined;

  await db.gradingPeriod.create({
    data: {
      schoolId: ctx.school.id,
      name,
      type: type as GradingPeriodType,
      startDate: inicio,
      endDate: termino,
      weight: Math.round(weight),
      ...(orden ? { order: orden } : {}),
    },
  });

  revalidatePath("/colegios/calificaciones");
  revalidatePath("/colegios/promocion");
  return { ok: true };
}

/**
 * Marca si una asignatura incide en el promedio final y en la promoción.
 *
 * El Art. 7 del Decreto 67/2018 saca de la cuenta a Religión, Consejo de Curso
 * y Orientación: el colegio lo decide sobre su plan de estudios.
 */
export async function updateSubjectPromotion(
  _prev: GradesFormState,
  formData: FormData,
): Promise<GradesFormState> {
  const ctx = await requireSchoolContext("calificaciones");
  if (!schoolCanWrite(ctx, "calificaciones")) {
    return { error: "Tu rol no puede modificar las asignaturas." };
  }

  const subjectId = String(formData.get("subjectId") ?? "").trim();
  if (!subjectId) return { error: "Falta la asignatura." };

  const incide = formData.get("countsForPromotion") === "on";
  const actualizado = await db.subject.updateMany({
    where: { id: subjectId, schoolId: ctx.school.id },
    data: { countsForPromotion: incide },
  });
  if (actualizado.count === 0) return { error: "Esa asignatura no es de este colegio." };

  revalidatePath("/colegios/calificaciones");
  revalidatePath("/colegios/promocion");
  return { ok: true };
}
