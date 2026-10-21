"use server";

// Lo que hace la familia en el portal: leer las circulares, proponer la
// justificación de una inasistencia y responder una citación.
//
// OJO: estas acciones no usan la sesión de un empleado: usan la del apoderado
// (`school-portal`). Una familia nunca puede tocar el registro de asistencia
// por su cuenta: propone, y la secretaría acepta o rechaza.

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { apoderadoActual } from "@/lib/school-portal";

export type PortalCommunicationState = { error?: string; ok?: boolean } | undefined;

function texto(formData: FormData, campo: string): string {
  return String(formData.get(campo) ?? "").trim();
}

/** El apoderado de la sesión del portal, o null si no hay sesión. */
async function apoderadoDeLaSesion() {
  const sesion = await apoderadoActual();
  return sesion?.guardian ?? null;
}

/** Marca la circular como leída (acuse de lectura). */
export async function ackCircular(
  _prev: PortalCommunicationState,
  formData: FormData,
): Promise<PortalCommunicationState> {
  const apoderado = await apoderadoDeLaSesion();
  if (!apoderado) return { error: "Tu sesión expiró. Entra de nuevo." };

  const circularId = texto(formData, "circularId");
  if (!circularId) return { error: "Falta la circular." };

  const circular = await db.circular.findFirst({
    where: { id: circularId, schoolId: apoderado.schoolId },
    select: { id: true },
  });
  if (!circular) return { error: "Esa circular no existe." };

  await db.circularAck.upsert({
    where: { circularId_guardianId: { circularId, guardianId: apoderado.id } },
    create: { circularId, guardianId: apoderado.id },
    update: { readAt: new Date() },
  });

  revalidatePath("/apoderado");
  return { ok: true };
}

/**
 * Propone justificar una inasistencia.
 *
 * No cambia el registro: crea una solicitud, que es lo que la secretaría
 * resuelve.
 */
export async function requestJustification(
  _prev: PortalCommunicationState,
  formData: FormData,
): Promise<PortalCommunicationState> {
  const apoderado = await apoderadoDeLaSesion();
  if (!apoderado) return { error: "Tu sesión expiró. Entra de nuevo." };

  const sessionId = texto(formData, "sessionId");
  const reason = texto(formData, "reason");
  const note = texto(formData, "note");

  if (!sessionId) return { error: "Elige la inasistencia." };
  if (!reason) return { error: "Elige el motivo de la justificación." };
  if (note.length > 500) return { error: "La observación es demasiado larga." };

  // La inasistencia tiene que ser de un alumno de esta familia.
  const registro = await db.attendanceRecord.findFirst({
    where: { sessionId, student: { guardianships: { some: { guardianId: apoderado.id } } } },
    select: { id: true, status: true, session: { select: { schoolId: true } } },
  });
  if (!registro || registro.session.schoolId !== apoderado.schoolId) {
    return { error: "Esa inasistencia no es de tus hijos." };
  }
  if (registro.status !== "ABSENT") {
    return { error: "Esa inasistencia ya está justificada o eximida." };
  }

  const yaHay = await db.justificationRequest.findFirst({
    where: { sessionId, status: "PENDIENTE" },
    select: { id: true },
  });
  if (yaHay) return { error: "Ya hay una solicitud de justificación pendiente para esa clase." };

  await db.justificationRequest.create({
    data: {
      schoolId: apoderado.schoolId,
      studentId: (await db.attendanceRecord.findUniqueOrThrow({
        where: { id: registro.id },
        select: { studentId: true },
      })).studentId,
      sessionId,
      reason,
      note: note || null,
      requestedByGuardianId: apoderado.id,
    },
  });

  revalidatePath("/apoderado");
  return { ok: true };
}

/** La familia contesta una citación: confirma, rechaza o propone otra hora. */
export async function respondAppointment(
  _prev: PortalCommunicationState,
  formData: FormData,
): Promise<PortalCommunicationState> {
  const apoderado = await apoderadoDeLaSesion();
  if (!apoderado) return { error: "Tu sesión expiró. Entra de nuevo." };

  const id = texto(formData, "appointmentId");
  const status = texto(formData, "status");
  const response = texto(formData, "response");
  if (!id) return { error: "Falta la citación." };
  if (!["CONFIRMADA", "RECHAZADA"].includes(status)) {
    return { error: "La respuesta no es válida." };
  }

  const cita = await db.appointment.findFirst({
    where: { id, schoolId: apoderado.schoolId },
    select: { id: true, status: true, guardianId: true, student: { select: { guardianships: { select: { guardianId: true } } } } },
  });
  if (!cita) return { error: "Esa citación no existe." };

  // La familia tiene que estar en la citación: o es la destinataria, o el
  // alumno es un hijo suyo.
  const esSuya =
    cita.guardianId === apoderado.id ||
    cita.student.guardianships.some((g) => g.guardianId === apoderado.id);
  if (!esSuya) return { error: "Esa citación no es de tus hijos." };
  if (cita.status !== "PENDIENTE") return { error: "Esa citación ya tiene respuesta." };

  await db.appointment.update({
    where: { id: cita.id },
    data: {
      status: status as "CONFIRMADA" | "RECHAZADA",
      response: response || null,
      respondedAt: new Date(),
    },
  });

  revalidatePath("/apoderado");
  revalidatePath("/colegios/comunicacion");
  return { ok: true };
}
