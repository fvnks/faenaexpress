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
  const place = texto(formData, "place");

  if (!studentId) return { error: "Elige al alumno." };
  if (!teacherId) return { error: "Elige al profesor." };
  if (reason.length < 5) return { error: "Explica brevemente el motivo de la reunión." };
  if (!fechaTexto || !horaTexto) return { error: "Elige fecha y hora." };

  // Verifica que el alumno sea de esta familia
  const vinculo = await db.guardianship.findFirst({
    where: { guardianId: apoderado.id, studentId },
    select: { id: true },
  });
  if (!vinculo) return { error: "Ese alumno no es de tu familia." };

  // Verifica que el profesor exista y sea del colegio
  const profesor = await db.teacher.findFirst({
    where: { id: teacherId, schoolId: apoderado.schoolId },
    select: { id: true, name: true },
  });
  if (!profesor) return { error: "Ese profesor no es de este colegio." };

  const fecha = new Date(`${fechaTexto}T${horaTexto}:00.000Z`);
  if (Number.isNaN(fecha.getTime())) return { error: "La fecha o la hora no son válidas." };

  await db.appointment.create({
    data: {
      schoolId: apoderado.schoolId,
      studentId,
      guardianId: apoderado.id,
      title: `Solicitud de reunión: ${apoderado.name} con ${profesor.name}`,
      reason,
      scheduledAt: fecha,
      durationMin: 30,
      place: place || null,
      createdById: apoderado.id, // Usamos el ID del apoderado como creador temporal
    },
  });

  revalidatePath("/apoderado");
  revalidatePath("/colegios/comunicacion");
  return { ok: true };
}

/** Cancela una cita propia pendiente. */
export async function cancelMyAppointment(
  _prev: PortalAppointmentState,
  formData: FormData,
): Promise<PortalAppointmentState> {
  const sesion = await apoderadoActual();
  if (!sesion) return { error: "Tu sesión expiró. Entra de nuevo." };

  const id = texto(formData, "appointmentId");
  if (!id) return { error: "Falta la cita." };

  const cita = await db.appointment.findFirst({
    where: { id, schoolId: sesion.guardian.schoolId, guardianId: sesion.guardian.id },
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
