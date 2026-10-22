"use server";

// Comunicación del colegio: circulares, justificaciones y citaciones.
//
// Las acciones de la familia van en `school-portal-actions.ts` (se ejecutan con
// la sesión del apoderado, no con la de un empleado). Acá están las del
// colegio.

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { requireSchoolContext, schoolCanWrite } from "@/lib/school-auth";

export type CommunicationFormState = { error?: string; ok?: boolean } | undefined;

function texto(formData: FormData, campo: string): string {
  return String(formData.get(campo) ?? "").trim();
}

/** Publica una circular. */
export async function createCircular(
  _prev: CommunicationFormState,
  formData: FormData,
): Promise<CommunicationFormState> {
  const ctx = await requireSchoolContext("comunicacion");
  if (!schoolCanWrite(ctx, "comunicacion")) {
    return { error: "Tu rol no permite publicar circulares." };
  }

  const title = texto(formData, "title");
  const body = texto(formData, "body");
  const audience = texto(formData, "audience") || "COLEGIO";
  const courseId = texto(formData, "courseId") || null;
  const guardianId = texto(formData, "guardianId") || null;
  const closesAt = texto(formData, "closesAt");

  if (title.length < 3) return { error: "El título de la circular es obligatorio." };
  if (body.length < 10) return { error: "Escribe el mensaje de la circular." };
  if (!["COLEGIO", "CURSO", "FAMILIA"].includes(audience)) {
    return { error: "El destinatario no es válido." };
  }
  if (audience === "CURSO" && !courseId) return { error: "Elige el curso destinatario." };
  if (audience === "FAMILIA" && !guardianId) return { error: "Elige la familia destinataria." };

  if (courseId) {
    const curso = await db.course.findFirst({
      where: { id: courseId, schoolId: ctx.school.id },
      select: { id: true },
    });
    if (!curso) return { error: "Ese curso no es de este colegio." };
  }
  if (guardianId) {
    const apoderado = await db.guardian.findFirst({
      where: { id: guardianId, schoolId: ctx.school.id },
      select: { id: true },
    });
    if (!apoderado) return { error: "Esa familia no es de este colegio." };
  }

  await db.circular.create({
    data: {
      schoolId: ctx.school.id,
      title,
      body,
      audience: audience as "COLEGIO" | "CURSO" | "FAMILIA",
      courseId: audience === "CURSO" ? courseId : null,
      guardianId: audience === "FAMILIA" ? guardianId : null,
      closesAt: closesAt ? new Date(`${closesAt}T12:00:00.000Z`) : null,
      createdById: ctx.user.id,
    },
  });

  revalidatePath("/colegios/comunicacion");
  return { ok: true };
}

/** Elimina una circular (antes de que la lean, o si se equivocaron). */
export async function deleteCircular(
  _prev: CommunicationFormState,
  formData: FormData,
): Promise<CommunicationFormState> {
  const ctx = await requireSchoolContext("comunicacion");
  if (!schoolCanWrite(ctx, "comunicacion")) {
    return { error: "Tu rol no permite eliminar circulares." };
  }

  const id = texto(formData, "circularId");
  if (!id) return { error: "Falta la circular." };

  const eliminada = await db.circular.deleteMany({
    where: { id, schoolId: ctx.school.id },
  });
  if (eliminada.count === 0) return { error: "Esa circular no es de este colegio." };

  revalidatePath("/colegios/comunicacion");
  return { ok: true };
}

/**
 * Acepta o rechaza una justificación propuesta por una familia.
 *
 * Al aceptarla, el registro de asistencia pasa a "justificada": es el mismo
 * cambio que hace el docente cuando la familia trae el certificado, pero
 * desde la secretaría y con la trazabilidad de quién lo pidió.
 */
export async function resolveJustification(
  _prev: CommunicationFormState,
  formData: FormData,
): Promise<CommunicationFormState> {
  const ctx = await requireSchoolContext("comunicacion");
  if (!schoolCanWrite(ctx, "comunicacion")) {
    return { error: "Tu rol no puede resolver justificaciones." };
  }

  const id = texto(formData, "requestId");
  const decision = texto(formData, "decision");
  const nota = texto(formData, "note");
  if (!id) return { error: "Falta la solicitud." };
  if (!["ACEPTADA", "RECHAZADA"].includes(decision)) {
    return { error: "La decisión no es válida." };
  }

  const solicitud = await db.justificationRequest.findFirst({
    where: { id, schoolId: ctx.school.id },
    select: { id: true, sessionId: true, studentId: true, status: true },
  });
  if (!solicitud) return { error: "Esa solicitud no es de este colegio." };
  if (solicitud.status !== "PENDIENTE") {
    return { error: "Esa solicitud ya se resolvió." };
  }

  await db.$transaction(async (tx) => {
    await tx.justificationRequest.update({
      where: { id: solicitud.id },
      data: {
        status: decision as "ACEPTADA" | "RECHAZADA",
        resolvedAt: new Date(),
        resolvedById: ctx.user.id,
        resolution: nota || null,
      },
    });

    if (decision === "ACEPTADA") {
      await tx.attendanceRecord.updateMany({
        where: { sessionId: solicitud.sessionId, studentId: solicitud.studentId },
        data: {
          status: "JUSTIFIED",
          justificationType: "FALTA_JUSTIFICADA",
          justificationNote: nota || "Justificada por la familia",
        },
      });
    }
  });

  revalidatePath("/colegios/comunicacion");
  return { ok: true };
}

/** Agenda una citación con una familia. */
export async function createAppointment(
  _prev: CommunicationFormState,
  formData: FormData,
): Promise<CommunicationFormState> {
  const ctx = await requireSchoolContext("comunicacion");
  if (!schoolCanWrite(ctx, "comunicacion")) {
    return { error: "Tu rol no puede agendar citaciones." };
  }

  const studentId = texto(formData, "studentId");
  const guardianId = texto(formData, "guardianId") || null;
  const title = texto(formData, "title");
  const reason = texto(formData, "reason");
  const fechaTexto = texto(formData, "date");
  const horaTexto = texto(formData, "time");
  const durationMin = Number(formData.get("durationMin") ?? 30);
  const place = texto(formData, "place");

  if (!studentId) return { error: "Elige el alumno." };
  if (title.length < 3) return { error: "El motivo de la citación es obligatorio." };
  if (!fechaTexto) return { error: "Elige la fecha." };
  if (!horaTexto) return { error: "Elige la hora." };
  if (!Number.isFinite(durationMin) || durationMin < 10 || durationMin > 240) {
    return { error: "La duración va de 10 a 240 minutos." };
  }

  const alumno = await db.student.findFirst({
    where: { id: studentId, schoolId: ctx.school.id },
    select: { id: true },
  });
  if (!alumno) return { error: "Ese alumno no es de este colegio." };

  if (guardianId) {
    const apoderado = await db.guardian.findFirst({
      where: { id: guardianId, schoolId: ctx.school.id },
      select: { id: true },
    });
    if (!apoderado) return { error: "Esa familia no es de este colegio." };
  }

  // La fecha llega como AAAA-MM-DD (el normalizador de fechas la convierte de
  // DD-MM-AAAA) y la hora como HH:MM. Se guardan en UTC, igual que el resto
  // de las fechas del dominio, para que la hora que ve la secretaría sea
  // siempre la que escribió.
  const fecha = new Date(`${fechaTexto}T${horaTexto}:00.000Z`);
  if (Number.isNaN(fecha.getTime())) {
    return { error: "La fecha o la hora no son válidas." };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaTexto) || !/^\d{2}:\d{2}$/.test(horaTexto)) {
    return { error: "La fecha o la hora no son válidas." };
  }

  await db.appointment.create({
    data: {
      schoolId: ctx.school.id,
      studentId,
      guardianId,
      title,
      reason: reason || null,
      scheduledAt: fecha,
      durationMin: Math.round(durationMin),
      place: place || null,
      createdById: ctx.user.id,
    },
  });

  revalidatePath("/colegios/comunicacion");
  return { ok: true };
}

/** Cierra una citación como realizada o cancelada. */
export async function closeAppointment(
  _prev: CommunicationFormState,
  formData: FormData,
): Promise<CommunicationFormState> {
  const ctx = await requireSchoolContext("comunicacion");
  if (!schoolCanWrite(ctx, "comunicacion")) {
    return { error: "Tu rol no puede cerrar citaciones." };
  }

  const id = texto(formData, "appointmentId");
  const status = texto(formData, "status");
  const notes = texto(formData, "notes");
  if (!id) return { error: "Falta la citación." };
  if (!["REALIZADA", "CANCELADA"].includes(status)) {
    return { error: "El estado no es válido." };
  }

  const actualizada = await db.appointment.updateMany({
    where: { id, schoolId: ctx.school.id },
    data: {
      status: status as "REALIZADA" | "CANCELADA",
      notes: notes || null,
      respondedAt: new Date(),
    },
  });
  if (actualizada.count === 0) return { error: "Esa citación no es de este colegio." };

  revalidatePath("/colegios/comunicacion");
  return { ok: true };
}
