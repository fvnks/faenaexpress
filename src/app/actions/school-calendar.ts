"use server";

// Acciones para gestionar el calendario escolar (feriados, vacaciones, no lectivos).
//
import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { requireSchoolContext, schoolCanWrite } from "@/lib/school-auth";

export type CalendarEventFormState =
  | { error?: string; ok?: boolean }
  | undefined;

function texto(formData: FormData, campo: string): string {
  return String(formData.get(campo) ?? "").trim();
}

export async function createCalendarEvent(
  _prev: CalendarEventFormState,
  formData: FormData,
): Promise<CalendarEventFormState> {
  const ctx = await requireSchoolContext("administracion");
  if (!schoolCanWrite(ctx, "administracion")) {
    return { error: "Tu rol no permite gestionar el calendario." };
  }

  const date = texto(formData, "date");
  const type = texto(formData, "type");
  const name = texto(formData, "name");
  const description = texto(formData, "description");
  const isNonInstructional = formData.get("isNonInstructional") === "on";

  if (!date) return { error: "La fecha es obligatoria." };
  if (!type) return { error: "El tipo es obligatorio." };
  if (!name || name.length < 2) return { error: "El nombre es obligatorio." };

  const fecha = new Date(`${date}T12:00:00Z`);
  if (Number.isNaN(fecha.getTime())) return { error: "La fecha no es válida." };

  try {
    await db.schoolCalendarEvent.create({
      data: {
        schoolId: ctx.school.id,
        date: fecha,
        type: type as "HOLIDAY" | "VACATION" | "NON_INSTRUCTIONAL" | "EARLY_DISMISSAL" | "MAKEUP_DAY" | "OTHER",
        name,
        description: description || null,
        isNonInstructional,
      },
    });
  } catch (e) {
    if ((e as Error).message.includes("Unique constraint")) {
      return { error: "Ya existe un evento en esa fecha." };
    }
    return { error: "No se pudo crear el evento." };
  }

  revalidatePath("/colegios/calendario");
  return { ok: true };
}

export async function updateCalendarEvent(
  _prev: CalendarEventFormState,
  formData: FormData,
): Promise<CalendarEventFormState> {
  const ctx = await requireSchoolContext("administracion");
  if (!schoolCanWrite(ctx, "administracion")) {
    return { error: "Tu rol no permite gestionar el calendario." };
  }

  const id = texto(formData, "id");
  const date = texto(formData, "date");
  const type = texto(formData, "type");
  const name = texto(formData, "name");
  const description = texto(formData, "description");
  const isNonInstructional = formData.get("isNonInstructional") === "on";

  if (!id) return { error: "Falta el ID del evento." };
  if (!date) return { error: "La fecha es obligatoria." };
  if (!type) return { error: "El tipo es obligatorio." };
  if (!name || name.length < 2) return { error: "El nombre es obligatorio." };

  const fecha = new Date(`${date}T12:00:00Z`);
  if (Number.isNaN(fecha.getTime())) return { error: "La fecha no es válida." };

  const existente = await db.schoolCalendarEvent.findFirst({
    where: { id, schoolId: ctx.school.id },
    select: { id: true },
  });
  if (!existente) return { error: "El evento no existe." };

  try {
    await db.schoolCalendarEvent.update({
      where: { id },
      data: {
        date: fecha,
        type: type as "HOLIDAY" | "VACATION" | "NON_INSTRUCTIONAL" | "EARLY_DISMISSAL" | "MAKEUP_DAY" | "OTHER",
        name,
        description: description || null,
        isNonInstructional,
      },
    });
  } catch (e) {
    if ((e as Error).message.includes("Unique constraint")) {
      return { error: "Ya existe un evento en esa fecha." };
    }
    return { error: "No se pudo actualizar el evento." };
  }

  revalidatePath("/colegios/calendario");
  return { ok: true };
}

export async function deleteCalendarEvent(
  _prev: CalendarEventFormState,
  formData: FormData,
): Promise<CalendarEventFormState> {
  const ctx = await requireSchoolContext("administracion");
  if (!schoolCanWrite(ctx, "administracion")) {
    return { error: "Tu rol no permite gestionar el calendario." };
  }

  const id = texto(formData, "id");
  if (!id) return { error: "Falta el ID del evento." };

  const existente = await db.schoolCalendarEvent.findFirst({
    where: { id, schoolId: ctx.school.id },
    select: { id: true },
  });
  if (!existente) return { error: "El evento no existe." };

  await db.schoolCalendarEvent.delete({ where: { id } });

  revalidatePath("/colegios/calendario");
  return { ok: true };
}