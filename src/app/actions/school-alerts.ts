"use server";

// Acciones para detectar y gestionar alertas de inasistencia (C4).
//
import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { requireSchoolContext, schoolCanWrite } from "@/lib/school-auth";
import { detectarAlertasInasistencia, type AlertaInasistencia } from "@/lib/school-alerts";

export type AlertasFormState =
  | { error?: string; ok?: boolean; alertas?: AlertaInasistencia[] }
  | undefined;

/** Ejecuta la detección de alertas y las muestra (no las guarda, solo informa). */
export async function ejecutarDeteccionAlertas(
  _prev: AlertasFormState,
  formData: FormData,
): Promise<AlertasFormState> {
  const ctx = await requireSchoolContext("comunicacion");
  if (!schoolCanWrite(ctx, "comunicacion")) {
    return { error: "Tu rol no permite gestionar alertas." };
  }

  const umbral = Number(formData.get("umbral") ?? 5);
  if (!Number.isInteger(umbral) || umbral < 1) return { error: "Umbral inválido." };

  const alertas = await detectarAlertasInasistencia(ctx.school.id, umbral);

  return { ok: true, alertas };
}

/** Crea una notificación/citación para un apoderado (desde una alerta). */
export async function crearNotificacionDesdeAlerta(
  _prev: AlertasFormState,
  formData: FormData,
): Promise<AlertasFormState> {
  const ctx = await requireSchoolContext("comunicacion");
  if (!schoolCanWrite(ctx, "comunicacion")) {
    return { error: "Tu rol no permite crear notificaciones." };
  }

  const studentId = String(formData.get("studentId") ?? "").trim();
  const guardianId = String(formData.get("guardianId") ?? "").trim();
  const motivo = String(formData.get("motivo") ?? "").trim();

  if (!studentId || !guardianId || !motivo) {
    return { error: "Faltan datos obligatorios." };
  }

  // Verifica que el apoderado sea del alumno
  const vinculo = await db.guardianship.findFirst({
    where: { studentId, guardianId },
    select: { id: true },
  });
  if (!vinculo) return { error: "Ese apoderado no es del alumno." };

  await db.appointment.create({
    data: {
      schoolId: ctx.school.id,
      studentId,
      guardianId,
      title: "Alerta de inasistencia",
      reason: motivo,
      scheduledAt: new Date(), // se agenda para hoy
      durationMin: 15,
      place: "Secretaría / Virtual",
      createdById: ctx.user.id,
    },
  });

  revalidatePath("/colegios/comunicacion");
  return { ok: true };
}