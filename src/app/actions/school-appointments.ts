"use server";

// Acciones para citas con familias (Appointment) y reuniones de staff
// (StaffMeeting) desde el lado del colegio / docente.
//
// El corte de acceso está en el servidor: las Server Actions son alcanzables
// por POST directo.

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { requireSchoolContext, schoolCanWrite } from "@/lib/school-auth";
import { docenteDeUsuario } from "@/lib/school-team";
import type { AppointmentStatus, MeetingType } from "@/generated/prisma/client";

export type TeacherAppointmentState = {
  error?: string;
  ok?: boolean;
} | undefined;

export type StaffMeetingState = {
  error?: string;
  ok?: boolean;
} | undefined;

/** Obtiene el docente vinculado al usuario actual, si lo hay. */
async function obtenerDocenteDelUsuario(
  userId: string,
  schoolId: string,
): Promise<string | null> {
  const docente = await docenteDeUsuario(userId, schoolId);
  return docente?.id ?? null;
}

/** Contador de citas no leídas para un docente. */
export async function countUnreadAppointments(): Promise<{
  count: number;
  error?: string;
}> {
  const ctx = await requireSchoolContext("comunicacion");
  const teacherId = await obtenerDocenteDelUsuario(ctx.user.id, ctx.school.id);

  if (!teacherId) {
    return { count: 0, error: "Tu usuario no tiene una ficha de docente vinculada." };
  }

  const count = await db.appointment.count({
    where: {
      schoolId: ctx.school.id,
      teacherId,
      status: { in: ["PENDIENTE", "CONFIRMADA"] },
      readAt: null,
    },
  });

  return { count };
}

/** Lista las citas (Appointment) dirigidas a un docente. */
export async function getTeacherAppointments(): Promise<{
  citas: Array<{
    id: string;
    title: string;
    reason: string | null;
    scheduledAt: Date;
    durationMin: number;
    place: string | null;
    status: string;
    response: string | null;
    guardianName: string | null;
    studentName: string;
    readAt: Date | null;
  }>;
  error?: string;
}> {
  const ctx = await requireSchoolContext("comunicacion");
  const teacherId = await obtenerDocenteDelUsuario(ctx.user.id, ctx.school.id);

  if (!teacherId) {
    return {
      citas: [],
      error: "Tu usuario no tiene una ficha de docente vinculada.",
    };
  }

  const citas = await db.appointment.findMany({
    where: {
      schoolId: ctx.school.id,
      teacherId,
      status: { in: ["PENDIENTE", "CONFIRMADA"] },
    },
    include: {
      guardian: { select: { name: true } },
      student: { select: { firstName: true, lastName: true } },
    },
    orderBy: [{ readAt: "asc" }, { scheduledAt: "asc" }],
  });

  return {
    citas: citas.map((c) => ({
      id: c.id,
      title: c.title,
      reason: c.reason,
      scheduledAt: c.scheduledAt,
      durationMin: c.durationMin,
      place: c.place,
      status: c.status,
      response: c.response,
      guardianName: c.guardian?.name ?? null,
      studentName: `${c.student.firstName} ${c.student.lastName}`,
      readAt: c.readAt,
    })),
  };
}

/** Marca una cita como leída. */
export async function markAppointmentRead(
  _prev: TeacherAppointmentState,
  formData: FormData,
): Promise<TeacherAppointmentState> {
  const ctx = await requireSchoolContext("comunicacion");
  const teacherId = await obtenerDocenteDelUsuario(ctx.user.id, ctx.school.id);

  if (!teacherId) {
    return { error: "Tu usuario no tiene una ficha de docente vinculada." };
  }

  const id = String(formData.get("appointmentId") ?? "").trim();
  if (!id) return { error: "Falta la cita." };

  const cita = await db.appointment.findFirst({
    where: { id, schoolId: ctx.school.id, teacherId },
    select: { id: true, readAt: true },
  });
  if (!cita) return { error: "Esa cita no existe o no te está dirigida." };
  if (cita.readAt) return { ok: true }; // Ya leída

  await db.appointment.update({
    where: { id },
    data: { readAt: new Date() },
  });

  revalidatePath("/colegios/citas");
  revalidatePath("/colegios/agenda");
  return { ok: true };
}

/** Responde a una cita (aceptar/rechazar). Solo el docente de la cita. */
export async function respondTeacherAppointment(
  _prev: TeacherAppointmentState,
  formData: FormData,
): Promise<TeacherAppointmentState> {
  const ctx = await requireSchoolContext("comunicacion");
  const teacherId = await obtenerDocenteDelUsuario(ctx.user.id, ctx.school.id);

  if (!teacherId) {
    return { error: "Tu usuario no tiene una ficha de docente vinculada." };
  }

  const id = String(formData.get("appointmentId") ?? "").trim();
  const statusRaw = String(formData.get("status") ?? "").trim();
  const response = String(formData.get("response") ?? "").trim();

  if (!id) return { error: "Falta la cita." };

  const valido = ["CONFIRMADA", "RECHAZADA"].includes(statusRaw);
  if (!valido) return { error: "Respuesta no válida." };

  // Verifica que la cita exista, sea de este colegio y esté dirigida a este docente.
  const cita = await db.appointment.findFirst({
    where: { id, schoolId: ctx.school.id, teacherId },
    select: { id: true, status: true },
  });
  if (!cita) return { error: "Esa cita no existe o no te está dirigida." };
  if (cita.status !== "PENDIENTE") {
    return { error: "Solo puedes responder citas pendientes." };
  }

  await db.appointment.update({
    where: { id },
    data: {
      status: statusRaw as AppointmentStatus,
      response: response || null,
      respondedAt: new Date(),
      readAt: new Date(), // Al responder, se marca como leída
    },
  });

  revalidatePath("/colegios/citas");
  revalidatePath("/colegios/comunicacion");
  revalidatePath("/colegios/agenda");
  return { ok: true };
}

/** Lista todas las citas del colegio (para la secretaría). */
export async function listAllAppointments(opts: {
  estado?: string;
  teacherId?: string;
} = {}): Promise<{
  citas: Array<{
    id: string;
    title: string;
    reason: string | null;
    scheduledAt: Date;
    durationMin: number;
    place: string | null;
    status: string;
    response: string | null;
    guardianName: string | null;
    studentName: string;
    teacherName: string | null;
    readAt: Date | null;
  }>;
  error?: string;
}> {
  const ctx = await requireSchoolContext("comunicacion");

  const citas = await db.appointment.findMany({
    where: {
      schoolId: ctx.school.id,
      ...(opts.estado ? { status: opts.estado as AppointmentStatus } : {}),
      ...(opts.teacherId ? { teacherId: opts.teacherId } : {}),
    },
    include: {
      guardian: { select: { name: true } },
      student: { select: { firstName: true, lastName: true } },
      teacher: { select: { name: true } },
    },
    orderBy: { scheduledAt: "asc" },
  });

  return {
    citas: citas.map((c) => ({
      id: c.id,
      title: c.title,
      reason: c.reason,
      scheduledAt: c.scheduledAt,
      durationMin: c.durationMin,
      place: c.place,
      status: c.status,
      response: c.response,
      guardianName: c.guardian?.name ?? null,
      studentName: `${c.student.firstName} ${c.student.lastName}`,
      teacherName: c.teacher?.name ?? null,
      readAt: c.readAt,
    })),
  };
}

/** Responde a cualquier cita (solo dirección/UTP/admin). */
export async function respondAnyAppointment(
  _prev: TeacherAppointmentState,
  formData: FormData,
): Promise<TeacherAppointmentState> {
  const ctx = await requireSchoolContext("comunicacion");
  if (!schoolCanWrite(ctx, "comunicacion")) {
    return { error: "Tu rol no puede responder citas de otros docentes." };
  }

  const id = String(formData.get("appointmentId") ?? "").trim();
  const statusRaw = String(formData.get("status") ?? "").trim();
  const response = String(formData.get("response") ?? "").trim();

  if (!id) return { error: "Falta la cita." };

  const valido = ["CONFIRMADA", "RECHAZADA"].includes(statusRaw);
  if (!valido) return { error: "Respuesta no válida." };

  const cita = await db.appointment.findFirst({
    where: { id, schoolId: ctx.school.id },
    select: { id: true, status: true, teacherId: true, scheduledAt: true },
  });
  if (!cita) return { error: "Esa cita no existe o no es de este colegio." };
  if (cita.status !== "PENDIENTE") {
    return { error: "Solo puedes responder citas pendientes." };
  }

  const durationMinRaw = String(formData.get("durationMin") ?? "30").trim();
  const durationMin = Number.parseInt(durationMinRaw, 10) || 30;
  const endsAt = new Date(
    new Date(cita.scheduledAt ?? Date.now()).getTime() + durationMin * 60 * 1000,
  );

  // Evitar solapamiento: el docente no puede tener dos citas al mismo tiempo.
  const rangoInicio = new Date(
    new Date(cita.scheduledAt ?? Date.now()).getTime() - 60 * 60 * 1000,
  ); // -1 hora
  const rangoFin = new Date(
    new Date(cita.scheduledAt ?? Date.now()).getTime() + 60 * 60 * 1000,
  ); // +1 hora
  const citasDocente = await db.appointment.findMany({
    where: {
      schoolId: ctx.school.id,
      teacherId: cita.teacherId!,
      status: { not: "CANCELADA" },
      scheduledAt: { gte: rangoInicio, lte: rangoFin },
    },
    select: { id: true, title: true, scheduledAt: true, durationMin: true },
  });
  const solapamiento = citasDocente.find((c) => {
    const cEnd = new Date(c.scheduledAt.getTime() + c.durationMin * 60 * 1000);
    return new Date(cita.scheduledAt ?? Date.now()) < cEnd && endsAt > c.scheduledAt;
  });
  if (solapamiento) {
    return {
      error: `Ese docente ya tiene una cita "${solapamiento.title}" a esa hora.`,
    };
  }

  await db.appointment.update({
    where: { id },
    data: {
      status: statusRaw as AppointmentStatus,
      response: response || null,
      respondedAt: new Date(),
      readAt: new Date(),
    },
  });

  revalidatePath("/colegios/comunicacion/citas");
  revalidatePath("/colegios/citas");
  return { ok: true };
}

/** Lista las reuniones de staff del colegio. */
export async function listStaffMeetings(): Promise<{
  reuniones: Array<{
    id: string;
    type: string;
    title: string;
    description: string | null;
    startsAt: Date;
    endsAt: Date | null;
    place: string | null;
    minutes: string | null;
    createdByName: string | null;
    courseName: string | null;
    asistentes: number;
    acuerdos: number;
  }>;
  error?: string;
}> {
  const ctx = await requireSchoolContext("comunicacion");

  const reuniones = await db.staffMeeting.findMany({
    where: { schoolId: ctx.school.id },
    include: {
      creator: { select: { name: true } },
      course: { select: { name: true } },
      attendees: { select: { id: true } },
      agreements: { select: { id: true } },
    },
    orderBy: { startsAt: "desc" },
  });

  return {
    reuniones: reuniones.map((r) => ({
      id: r.id,
      type: r.type,
      title: r.title,
      description: r.description,
      startsAt: r.startsAt,
      endsAt: r.endsAt,
      place: r.place,
      minutes: r.minutes,
      createdByName: r.creator?.name ?? null,
      courseName: r.course?.name ?? null,
      asistentes: r.attendees.length,
      acuerdos: r.agreements.length,
    })),
  };
}

/** Crea una reunión de staff. Solo DIRECTOR y UTP pueden crear. */
export async function createStaffMeeting(
  _prev: StaffMeetingState,
  formData: FormData,
): Promise<StaffMeetingState> {
  const ctx = await requireSchoolContext("comunicacion");
  if (!schoolCanWrite(ctx, "comunicacion")) {
    return { error: "Tu rol no permite crear reuniones de staff." };
  }

  const teacherId = await obtenerDocenteDelUsuario(ctx.user.id, ctx.school.id);
  if (!teacherId) {
    return { error: "Tu usuario no tiene una ficha de docente vinculada." };
  }

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const typeRaw = String(formData.get("type") ?? "CURSO").trim();
  const courseId = String(formData.get("courseId") ?? "").trim() || null;
  const startsAtTexto = String(formData.get("startsAt") ?? "").trim();
  const endsAtTexto = String(formData.get("endsAt") ?? "").trim();
  const place = String(formData.get("place") ?? "").trim() || null;

  if (!title) return { error: "El título es obligatorio." };

  const tipoValido = [
    "CURSO",
    "DEPARTAMENTO",
    "CLAUSTRO",
    "HOMOTRIA",
    "APODERADOS",
  ].includes(typeRaw);
  if (!tipoValido) return { error: "Tipo de reunión no válido." };

  const startsAt = new Date(startsAtTexto);
  if (Number.isNaN(startsAt.getTime())) {
    return { error: "La fecha y hora de inicio no son válidas." };
  }

  let endsAt: Date | undefined;
  if (endsAtTexto) {
    endsAt = new Date(endsAtTexto);
    if (Number.isNaN(endsAt.getTime()) || endsAt.getTime() <= startsAt.getTime()) {
      return { error: "La hora de fin debe ser posterior al inicio." };
    }
  } else {
    // Duración por defecto: 60 minutos.
    endsAt = new Date(startsAt.getTime() + 60 * 60 * 1000);
  }

  // Evitar solapamiento: el creador no puede tener otra reunión en el mismo horario.
  const solapamiento = await db.staffMeeting.findFirst({
    where: {
      schoolId: ctx.school.id,
      createdById: teacherId,
      startsAt: { lt: endsAt },
      endsAt: { gt: startsAt },
    },
    select: { id: true, title: true, startsAt: true },
  });
  if (solapamiento) {
    return {
      error: `Ya tiene una reunión "${solapamiento.title}" a esa hora.`,
    };
  }

  await db.staffMeeting.create({
    data: {
      schoolId: ctx.school.id,
      courseId,
      type: typeRaw as MeetingType,
      title,
      description,
      startsAt,
      endsAt,
      place,
      createdById: teacherId,
    },
  });

  revalidatePath("/colegios/reuniones");
  return { ok: true };
}

/** Agrega un asistente a una reunión de staff. */
export async function addStaffMeetingAttendee(
  _prev: StaffMeetingState,
  formData: FormData,
): Promise<StaffMeetingState> {
  const ctx = await requireSchoolContext("comunicacion");
  if (!schoolCanWrite(ctx, "comunicacion")) {
    return { error: "Tu rol no permite editar reuniones de staff." };
  }

  const meetingId = String(formData.get("meetingId") ?? "").trim();
  const personIdRaw = String(formData.get("personId") ?? "").trim();
  const personName = String(formData.get("personName") ?? "").trim();
  const personRole = String(formData.get("personRole") ?? "").trim();

  if (!meetingId || !personRole) {
    return { error: "Faltan datos del asistente." };
  }
  if (!personIdRaw && !personName) {
    return { error: "Debe indicar un docente o escribir un nombre." };
  }

  // Verifica que la reunión sea de este colegio.
  const existe = await db.staffMeeting.findFirst({
    where: { id: meetingId, schoolId: ctx.school.id },
    select: { id: true },
  });
  if (!existe) return { error: "Esa reunión no existe o no es de este colegio." };

  // Si se indica un docente, verificar que pertenezca a este colegio.
  let personId: string | null = null;
  if (personIdRaw) {
    const docente = await db.teacher.findFirst({
      where: { id: personIdRaw, schoolId: ctx.school.id },
      select: { id: true, name: true },
    });
    if (!docente) {
      return { error: "Ese docente no pertenece a este colegio." };
    }
    personId = docente.id;
  }

  await db.staffMeetingAttendee.create({
    data: {
      meetingId,
      personId,
      personName: personName || "",
      personRole,
    },
  });

  revalidatePath("/colegios/reuniones");
  return { ok: true };
}

/** Crea o actualiza el acta (minutes) de una reunión. */
export async function updateStaffMeetingMinutes(
  _prev: StaffMeetingState,
  formData: FormData,
): Promise<StaffMeetingState> {
  const ctx = await requireSchoolContext("comunicacion");
  if (!schoolCanWrite(ctx, "comunicacion")) {
    return { error: "Tu rol no permite editar reuniones de staff." };
  }

  const meetingId = String(formData.get("meetingId") ?? "").trim();
  const minutes = String(formData.get("minutes") ?? "").trim();

  if (!meetingId) return { error: "Falta la reunión." };

  const existe = await db.staffMeeting.findFirst({
    where: { id: meetingId, schoolId: ctx.school.id },
    select: { id: true },
  });
  if (!existe) return { error: "Esa reunión no existe o no es de este colegio." };

  await db.staffMeeting.update({
    where: { id: meetingId },
    data: { minutes: minutes || null },
  });

  revalidatePath("/colegios/reuniones");
  return { ok: true };
}

/** Crea un acuerdo para una reunión de staff. */
export async function createMeetingAgreement(
  _prev: StaffMeetingState,
  formData: FormData,
): Promise<StaffMeetingState> {
  const ctx = await requireSchoolContext("comunicacion");
  if (!schoolCanWrite(ctx, "comunicacion")) {
    return { error: "Tu rol no puede crear acuerdos." };
  }

  const meetingId = String(formData.get("meetingId") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const responsible = String(formData.get("responsible") ?? "").trim() || null;
  const dueDateTexto = String(formData.get("dueDate") ?? "").trim();

  if (!meetingId || !content) return { error: "Faltan datos del acuerdo." };

  const existe = await db.staffMeeting.findFirst({
    where: { id: meetingId, schoolId: ctx.school.id },
    select: { id: true },
  });
  if (!existe) return { error: "Esa reunión no existe o no es de este colegio." };

  let dueDate: Date | undefined;
  if (dueDateTexto) {
    dueDate = new Date(dueDateTexto);
    if (Number.isNaN(dueDate.getTime())) {
      return { error: "La fecha de vencimiento no es válida." };
    }
  }

  await db.meetingAgreement.create({
    data: { meetingId, content, responsible, dueDate },
  });

  revalidatePath("/colegios/reuniones");
  return { ok: true };
}

/** Marca un acuerdo como hecho/no hecho. */
export async function markAgreementDone(
  _prev: StaffMeetingState,
  formData: FormData,
): Promise<StaffMeetingState> {
  const ctx = await requireSchoolContext("comunicacion");
  if (!schoolCanWrite(ctx, "comunicacion")) {
    return { error: "Tu rol no puede editar acuerdos." };
  }

  const agreementId = String(formData.get("agreementId") ?? "").trim();
  const doneRaw = String(formData.get("done") ?? "").trim();

  if (!agreementId) return { error: "Falta el acuerdo." };

  const acuerdo = await db.meetingAgreement.findFirst({
    where: { id: agreementId },
    include: { meeting: { select: { schoolId: true } } },
  });
  if (!acuerdo) return { error: "Ese acuerdo no existe." };
  if (acuerdo.meeting.schoolId !== ctx.school.id) {
    return { error: "Ese acuerdo no es de este colegio." };
  }

  await db.meetingAgreement.update({
    where: { id: agreementId },
    data: { done: doneRaw === "true" },
  });

  revalidatePath("/colegios/reuniones");
  return { ok: true };
}

/** Agrega varios asistentes a una reunión de staff de una vez (multi-select). */
export async function addStaffMeetingAttendees(
  _prev: StaffMeetingState,
  formData: FormData,
): Promise<StaffMeetingState> {
  const ctx = await requireSchoolContext("comunicacion");
  if (!schoolCanWrite(ctx, "comunicacion")) {
    return { error: "Tu rol no permite editar reuniones de staff." };
  }

  const meetingId = String(formData.get("meetingId") ?? "").trim();
  const attendeesJson = String(formData.get("attendees") ?? "").trim();

  if (!meetingId || !attendeesJson) {
    return { error: "Faltan datos de los asistentes." };
  }

  let attendees: Array<{
    personId?: string;
    personName: string;
    personRole: string;
  }>;
  try {
    attendees = JSON.parse(attendeesJson);
  } catch {
    return { error: "Los datos de los asistentes no son válidos." };
  }

  if (!Array.isArray(attendees) || attendees.length === 0) {
    return { error: "Debe seleccionar al menos un asistente." };
  }

  // Verifica que la reunión sea de este colegio.
  const existe = await db.staffMeeting.findFirst({
    where: { id: meetingId, schoolId: ctx.school.id },
    select: { id: true },
  });
  if (!existe) return { error: "Esa reunión no existe o no es de este colegio." };

  // Verifica y crea cada asistente.
  for (const a of attendees) {
    let personId: string | null = null;
    let personName = a.personName || "";

    if (a.personId) {
      const docente = await db.teacher.findFirst({
        where: { id: a.personId, schoolId: ctx.school.id },
        select: { id: true, name: true },
      });
      if (!docente) {
        return { error: `El docente ${a.personId} no pertenece a este colegio.` };
      }
      personId = docente.id;
      if (!personName) personName = docente.name;
    }

    if (!personName) {
      return { error: "Cada asistente debe tener un nombre." };
    }

    await db.staffMeetingAttendee.create({
      data: {
        meetingId,
        personId,
        personName,
        personRole: a.personRole || "TEACHER",
      },
    });
  }

  revalidatePath("/colegios/reuniones");
  revalidatePath(`/colegios/reuniones/${meetingId}`);
  return { ok: true };
}
