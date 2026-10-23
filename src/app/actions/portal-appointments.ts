"use server";

// Acciones que hace la familia en el portal: solicitar citas con profesores.
//
import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { apoderadoActual } from "@/lib/school-portal";

export type PortalAppointmentState = { error?: string; ok?: boolean } | undefined;

function texto(formData: FormData, campo: string): string {
  return String(formData.get(campo) ?? "").trim();
}

/** Solicita una cita con un profesor. */
export async function requestTeacherAppointment(
  _prev: PortalAppointmentState,
  formData: FormData,
): Promise<PortalAppointmentState> {
  const sesion = await apoderadoActual();
  if (!sesion) return { error: "Tu sesión expiró. Entra de nuevo." };

  const apoderado = sesion.guardian;
  const studentId = texto(formData, "studentId");
  const teacherId = texto(formData, "teacherId");
  const reason = texto(formData, "reason");
  const fechaTexto = texto(formData, "date");
  const horaTexto = texto(formData, "time");
  const durationMin = Number(formData.get("durationMin") ?? 30);
  const place = texto(formData, "place");

  if (!studentId) return { error: "Elige al alumno." };
  if (!teacherId) return { error: "Elige al profesor." };
  if (reason.length < 3) return { error: "El motivo es obligatorio." };
  if (!fechaTexto) return { error: "Elige la fecha." };
  if (!horaTexto) return { error: "Elige la hora." };
  if (!Number.isFinite(durationMin) || durationMin < 10 || durationMin > 240) {
    return { error: "La duración va de 10 a 240 minutos." };
  }

  // El alumno tiene que ser de esta familia
  const alumno = await db.student.findFirst({
    where: { id: studentId, guardianships: { some: { guardianId: apoderado.id } } },
    select: { id: true, schoolId: true },
  });
  if (!alumno) return { error: "Ese alumno no es de tu familia." };

  // El profesor tiene que dar clases en el colegio
  const docente = await db.teacher.findFirst({
    where: { id: teacherId, schoolId: apoderado.schoolId },
    select: { id: true },
  });
  if (!docente) return { error: "Ese profesor no es de este colegio." };

  const fecha = new Date(`${fechaTexto}T${horaTexto}:00.000Z`);
  if (Number.isNaN(fecha.getTime()) || !/^\d{4}-\d{2}-\d{2}$/.test(fechaTexto) || !/^\d{2}:\d{2}$/.test(horaTexto)) {
    return { error: "La fecha o la hora no son válidas." };
  }

  await db.appointment.create({
    data: {
      schoolId: apoderado.schoolId,
      studentId,
      guardianId: apoderado.id,
      title: `Solicitud de reunión: ${reason}`,
      reason,
      scheduledAt: fecha,
      durationMin: Math.round(durationMin),
      place: place || null,
      createdById: apoderado.id,
    },
  });

  revalidatePath("/apoderado");
  revalidatePath("/colegios/comunicacion");
  return { ok: true };
}

/** Cancela una cita propia (solo si está pendiente). */
export async function cancelMyAppointment(
  _prev: PortalAppointmentState,
  formData: FormData,
): Promise<PortalAppointmentState> {
  const sesion = await apoderadoActual();
  if (!sesion) return { error: "Tu sesión expiró. Entra de nuevo." };

  const apoderado = sesion.guardian;
  const id = texto(formData, "appointmentId");
  if (!id) return { error: "Falta la cita." };

  const cita = await db.appointment.findFirst({
    where: { id, schoolId: apoderado.schoolId, guardianId: apoderado.id },
    select: { id: true, status: true },
  });
  if (!cita) return { error: "Esa cita no existe o no es tuya." };
  if (cita.status !== "PENDIENTE") return { error: "Solo puedes cancelar citas pendientes." };

  await db.appointment.update({
    where: { id },
    data: { status: "CANCELADA" },
  });

  revalidatePath("/apoderado");
  revalidatePath("/colegios/comunicacion");
  return { ok: true };
}
