"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

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
