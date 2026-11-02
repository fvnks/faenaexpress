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

  const durationMinRaw = String(formData.get("durationMin") ?? "30").trim();
  const durationMin = Number.parseInt(durationMinRaw, 10) || 30;
  const endsAt = new Date(fecha.getTime() + durationMin * 60 * 1000);

  // Evitar solapamiento: el docente no puede tener dos citas al mismo tiempo.
  // Trae citas en un rango amplio y filtra en JS considerando durationMin.
  const rangoInicio = new Date(fecha.getTime() - 60 * 60 * 1000); // -1 hora
  const rangoFin = new Date(fecha.getTime() + 60 * 60 * 1000); // +1 hora
  const citasDocente = await db.appointment.findMany({
    where: {
      schoolId: apoderado.schoolId,
      teacherId,
      status: { not: "CANCELADA" },
      scheduledAt: { gte: rangoInicio, lte: rangoFin },
    },
    select: { id: true, title: true, scheduledAt: true, durationMin: true },
  });
  const solapamiento = citasDocente.find((c) => {
    const cEnd = new Date(c.scheduledAt.getTime() + c.durationMin * 60 * 1000);
    return fecha < cEnd && endsAt > c.scheduledAt;
  });
  if (solapamiento) {
    return {
      error: `Ese docente ya tiene una cita "${solapamiento.title}" a esa hora.`,
    };
  }

  await db.appointment.create({
    data: {
      schoolId: apoderado.schoolId,
      studentId,
      guardianId: apoderado.id,
      teacherId,
      title: `Solicitud de reunión: ${apoderado.name} con ${profesor.name}`,
      reason,
      scheduledAt: fecha,
      durationMin,
      place: place || null,
      createdById: apoderado.id,
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
