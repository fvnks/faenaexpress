"use server";

// Matrícula y expediente del alumno.
//
// La matrícula es el corazón del módulo: un alumno entra a un curso, puede
// cambiar de curso (traslado) o irse (retiro), y cada uno de esos estados
// queda con su motivo y su fecha. Sin eso, el colegio no puede llevar el
// registro de quién cursó qué.

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { requireSchoolContext, schoolCanWrite } from "@/lib/school-auth";

export type EnrollmentFormState = { error?: string; ok?: boolean } | undefined;

const TIPOS_APODERADO = ["TITULAR", "SUPLENTE", "EMERGENCIA"] as const;

function texto(formData: FormData, campo: string): string {
  return String(formData.get(campo) ?? "").trim();
}

/** Crea un alumno y lo matricula en un curso. */
export async function saveStudent(
  _prev: EnrollmentFormState,
  formData: FormData,
): Promise<EnrollmentFormState> {
  const ctx = await requireSchoolContext("estudiantes");
  if (!schoolCanWrite(ctx, "estudiantes")) {
    return { error: "Tu rol no permite matricular alumnos." };
  }

  const firstName = texto(formData, "firstName");
  const lastName = texto(formData, "lastName");
  const courseId = texto(formData, "courseId");
  const rut = texto(formData, "rut");
  const birthDate = texto(formData, "birthDate");

  if (firstName.length < 1 || lastName.length < 1) {
    return { error: "El nombre y el apellido del alumno son obligatorios." };
  }
  if (!courseId) return { error: "Elige el curso al que se matricula." };

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
      birthDate: birthDate ? new Date(`${birthDate}T00:00:00.000Z`) : null,
    },
    select: { id: true },
  });

  await db.enrollment.create({
    data: { courseId, studentId: student.id, status: "ACTIVE" },
  });

  revalidatePath("/colegios/estudiantes");
  revalidatePath("/colegios/asistencia");
  revalidatePath("/colegios/calificaciones");
  return { ok: true };
}

/** Matricula a un alumno que ya está en el colegio en otro curso. */
export async function enrollStudent(
  _prev: EnrollmentFormState,
  formData: FormData,
): Promise<EnrollmentFormState> {
  const ctx = await requireSchoolContext("estudiantes");
  if (!schoolCanWrite(ctx, "estudiantes")) {
    return { error: "Tu rol no permite matricular alumnos." };
  }

  const studentId = texto(formData, "studentId");
  const courseId = texto(formData, "courseId");
  if (!studentId || !courseId) return { error: "Elige el alumno y el curso." };

  const [alumno, curso] = await Promise.all([
    db.student.findFirst({ where: { id: studentId, schoolId: ctx.school.id }, select: { id: true } }),
    db.course.findFirst({ where: { id: courseId, schoolId: ctx.school.id }, select: { id: true } }),
  ]);
  if (!alumno || !curso) return { error: "El alumno o el curso no son de este colegio." };

  const yaEsta = await db.enrollment.findFirst({
    where: { courseId, studentId },
    select: { status: true },
  });
  if (yaEsta?.status === "ACTIVE") {
    return { error: "El alumno ya está matriculado en ese curso." };
  }

  await db.enrollment.upsert({
    where: { courseId_studentId: { courseId, studentId } },
    create: { courseId, studentId, status: "ACTIVE" },
    update: { status: "ACTIVE", statusReason: null, endedAt: null, enrolledAt: new Date() },
  });

  revalidatePath("/colegios/estudiantes");
  revalidatePath("/colegios/asistencia");
  return { ok: true };
}

/**
 * Traslado: el alumno cambia de curso.
 *
 * La matrícula anterior se cierra con su motivo y la nueva se abre. Las dos
 * quedan en el historial: el curso anterior sigue contando para la asistencia
 * y para las notas de lo que ya cursó.
 */
export async function moveStudent(
  _prev: EnrollmentFormState,
  formData: FormData,
): Promise<EnrollmentFormState> {
  const ctx = await requireSchoolContext("estudiantes");
  if (!schoolCanWrite(ctx, "estudiantes")) {
    return { error: "Tu rol no permite hacer traslados." };
  }

  const studentId = texto(formData, "studentId");
  const fromCourseId = texto(formData, "fromCourseId");
  const toCourseId = texto(formData, "toCourseId");
  const reason = texto(formData, "reason");

  if (!studentId || !fromCourseId || !toCourseId) {
    return { error: "Elige el alumno, el curso de origen y el de destino." };
  }
  if (fromCourseId === toCourseId) {
    return { error: "El curso de destino es el mismo que el de origen." };
  }

  const [alumno, origen, destino] = await Promise.all([
    db.student.findFirst({ where: { id: studentId, schoolId: ctx.school.id }, select: { id: true } }),
    db.course.findFirst({ where: { id: fromCourseId, schoolId: ctx.school.id }, select: { id: true } }),
    db.course.findFirst({ where: { id: toCourseId, schoolId: ctx.school.id }, select: { id: true } }),
  ]);
  if (!alumno || !origen || !destino) {
    return { error: "El alumno o los cursos no son de este colegio." };
  }

  const matricula = await db.enrollment.findFirst({
    where: { courseId: fromCourseId, studentId },
    select: { id: true, status: true },
  });
  if (!matricula || matricula.status !== "ACTIVE") {
    return { error: "El alumno no está matriculado en el curso de origen." };
  }

  const yaEstaEnDestino = await db.enrollment.findFirst({
    where: { courseId: toCourseId, studentId },
    select: { status: true },
  });
  if (yaEstaEnDestino?.status === "ACTIVE") {
    return { error: "El alumno ya está matriculado en el curso de destino." };
  }

  await db.$transaction([
    db.enrollment.update({
      where: { id: matricula.id },
      data: {
        status: "TRASLADO",
        statusReason: reason || null,
        endedAt: new Date(),
      },
    }),
    db.enrollment.upsert({
      where: { courseId_studentId: { courseId: toCourseId, studentId } },
      create: { courseId: toCourseId, studentId, status: "ACTIVE" },
      update: { status: "ACTIVE", statusReason: null, endedAt: null, enrolledAt: new Date() },
    }),
  ]);

  revalidatePath("/colegios/estudiantes");
  revalidatePath(`/colegios/estudiantes/${studentId}`);
  revalidatePath("/colegios/asistencia");
  revalidatePath("/colegios/calificaciones");
  return { ok: true };
}

/**
 * Retiro: el alumno se va del colegio.
 *
 * Se cierran todas sus matrículas activas. Si no le queda ninguna, el alumno
 * queda como retirado en el colegio (no como egresado: eso es otra cosa).
 */
export async function withdrawStudent(
  _prev: EnrollmentFormState,
  formData: FormData,
): Promise<EnrollmentFormState> {
  const ctx = await requireSchoolContext("estudiantes");
  if (!schoolCanWrite(ctx, "estudiantes")) {
    return { error: "Tu rol no permite retirar alumnos." };
  }

  const studentId = texto(formData, "studentId");
  const reason = texto(formData, "reason");
  const courseId = texto(formData, "courseId");
  if (!studentId) return { error: "Elige el alumno." };

  const alumno = await db.student.findFirst({
    where: { id: studentId, schoolId: ctx.school.id },
    select: { id: true },
  });
  if (!alumno) return { error: "Ese alumno no es de este colegio." };

  const where = {
    studentId,
    status: "ACTIVE",
    ...(courseId ? { courseId } : {}),
  };
  const cerradas = await db.enrollment.updateMany({
    where,
    data: { status: "RETIRADO", statusReason: reason || null, endedAt: new Date() },
  });
  if (cerradas.count === 0) {
    return { error: "El alumno no está matriculado en ese curso." };
  }

  // Si se quedó sin ninguna matrícula activa, el alumno no está cursando en
  // este colegio: su estado tiene que decir lo mismo que su historial.
  const quedan = await db.enrollment.count({ where: { studentId, status: "ACTIVE" } });
  if (quedan === 0) {
    await db.student.update({ where: { id: studentId }, data: { status: "WITHDRAWN" } });
  }

  revalidatePath("/colegios/estudiantes");
  revalidatePath(`/colegios/estudiantes/${studentId}`);
  revalidatePath("/colegios/asistencia");
  revalidatePath("/colegios/calificaciones");
  return { ok: true };
}

/**
 * Crea o edita un apoderado.
 *
 * Si viene `studentId`, además lo vincula al alumno: guardar al apoderado y
 * dejarlo en la ficha es un solo paso, que es como trabaja la secretaría.
 */
export async function saveGuardian(
  _prev: EnrollmentFormState,
  formData: FormData,
): Promise<EnrollmentFormState> {
  const ctx = await requireSchoolContext("estudiantes");
  if (!schoolCanWrite(ctx, "estudiantes")) {
    return { error: "Tu rol no permite gestionar apoderados." };
  }

  const id = texto(formData, "guardianId");
  const name = texto(formData, "name");
  const rut = texto(formData, "rut");
  const email = texto(formData, "email");
  const phone = texto(formData, "phone");
  const studentId = texto(formData, "studentId");
  const tipo = texto(formData, "type") || "TITULAR";

  if (name.length < 1) return { error: "El nombre del apoderado es obligatorio." };
  if (email && !email.includes("@")) return { error: "El correo no parece válido." };
  if (studentId && !TIPOS_APODERADO.includes(tipo as (typeof TIPOS_APODERADO)[number])) {
    return { error: "El tipo de apoderado no es válido." };
  }

  let guardianId = id;
  if (id) {
    const actualizado = await db.guardian.updateMany({
      where: { id, schoolId: ctx.school.id },
      data: { name, rut: rut || null, email: email || null, phone: phone || null },
    });
    if (actualizado.count === 0) return { error: "Ese apoderado no es de este colegio." };
  } else {
    const creado = await db.guardian.create({
      data: {
        schoolId: ctx.school.id,
        name,
        rut: rut || null,
        email: email || null,
        phone: phone || null,
      },
      select: { id: true },
    });
    guardianId = creado.id;
  }

  if (studentId) {
    const alumno = await db.student.findFirst({
      where: { id: studentId, schoolId: ctx.school.id },
      select: { id: true },
    });
    if (!alumno) return { error: "Ese alumno no es de este colegio." };

    await db.guardianship.upsert({
      where: { studentId_guardianId: { studentId, guardianId } },
      create: { studentId, guardianId, type: tipo },
      update: { type: tipo },
    });
  }

  revalidatePath("/colegios/estudiantes");
  if (studentId) revalidatePath(`/colegios/estudiantes/${studentId}`);
  return { ok: true };
}

/** Vincula un apoderado con un alumno. */
export async function linkGuardian(
  _prev: EnrollmentFormState,
  formData: FormData,
): Promise<EnrollmentFormState> {
  const ctx = await requireSchoolContext("estudiantes");
  if (!schoolCanWrite(ctx, "estudiantes")) {
    return { error: "Tu rol no puede vincular apoderados." };
  }

  const studentId = texto(formData, "studentId");
  const guardianId = texto(formData, "guardianId");
  const type = texto(formData, "type") || "TITULAR";
  if (!studentId || !guardianId) return { error: "Elige el alumno y el apoderado." };
  if (!TIPOS_APODERADO.includes(type as (typeof TIPOS_APODERADO)[number])) {
    return { error: "El tipo de apoderado no es válido." };
  }

  const [alumno, apoderado] = await Promise.all([
    db.student.findFirst({ where: { id: studentId, schoolId: ctx.school.id }, select: { id: true } }),
    db.guardian.findFirst({ where: { id: guardianId, schoolId: ctx.school.id }, select: { id: true } }),
  ]);
  if (!alumno || !apoderado) return { error: "El alumno o el apoderado no son de este colegio." };

  await db.guardianship.upsert({
    where: { studentId_guardianId: { studentId, guardianId } },
    create: { studentId, guardianId, type },
    update: { type },
  });

  revalidatePath(`/colegios/estudiantes/${studentId}`);
  return { ok: true };
}

/** Desvincula un apoderado de un alumno. */
export async function unlinkGuardian(
  _prev: EnrollmentFormState,
  formData: FormData,
): Promise<EnrollmentFormState> {
  const ctx = await requireSchoolContext("estudiantes");
  if (!schoolCanWrite(ctx, "estudiantes")) {
    return { error: "Tu rol no puede desvincular apoderados." };
  }

  const studentId = texto(formData, "studentId");
  const guardianId = texto(formData, "guardianId");
  if (!studentId || !guardianId) return { error: "Falta el alumno o el apoderado." };

  await db.guardianship.deleteMany({
    where: {
      studentId,
      guardianId,
      guardian: { schoolId: ctx.school.id },
    },
  });

  revalidatePath(`/colegios/estustees/${studentId}`);
  return { ok: true };
}
