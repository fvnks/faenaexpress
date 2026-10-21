"use server";

// El flujo de excepciones del Art. 11 del Decreto 67/2018.
//
// El sistema calcula la regla del Art. 10 y marca los casos; acá la dirección y
// la UTP registran la deliberación y la decisión. Nada de esto lo decide el
// software: el software deja constancia de quién decidió, cuándo y con qué
// fundamento, que es lo que la norma pide y lo que se revisa en una
// fiscalización.
//
// La sección es `art11`: la ven la dirección y la jefatura de estudios, no el
// docente (el análisis del Art. 11 es una decisión del establecimiento).

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { requireSchoolContext, schoolCanWrite } from "@/lib/school-auth";
import { faltantesDeliberacion } from "@/lib/school-promotion";

export type PromotionFormState = { error?: string; ok?: boolean } | undefined;

function texto(formData: FormData, campo: string): string {
  return String(formData.get(campo) ?? "").trim();
}

/** Una fecha del formulario, al mediodía UTC (ninguna zona horaria la corre). */
function fechaMediodia(valor: string): Date | null {
  if (!valor) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return null;
  const fecha = new Date(`${valor}T12:00:00.000Z`);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

/**
 * Busca (o crea) la resolución del Art. 11 de un alumno en un año, ya validada
 * contra el colegio del contexto.
 */
async function resolucionDelColegio(
  schoolId: string,
  studentId: string,
  year: number,
): Promise<{
  id: string;
  schoolId: string;
  utpReport: string | null;
  hearingHeldAt: Date | null;
  outcome: string;
  decision: string | null;
} | null> {
  const alumno = await db.student.findFirst({
    where: { id: studentId, schoolId },
    select: { id: true },
  });
  if (!alumno) return null;

  const existente = await db.promotionResolution.findUnique({
    where: { studentId_year: { studentId, year } },
    select: {
      id: true,
      schoolId: true,
      utpReport: true,
      hearingHeldAt: true,
      outcome: true,
      decision: true,
    },
  });
  if (existente) return existente;

  return db.promotionResolution.create({
    data: { schoolId, studentId, year },
    select: {
      id: true,
      schoolId: true,
      utpReport: true,
      hearingHeldAt: true,
      outcome: true,
      decision: true,
    },
  });
}

function revalidarPromocion() {
  revalidatePath("/colegios/promocion");
  revalidatePath("/colegios/promocion/art11");
  revalidatePath("/colegios");
}

/**
 * Guarda el informe del jefe técnico-pedagógico (Art. 11): el antecedente que
 * la norma exige antes de resolver.
 */
export async function saveUtpReport(
  _prev: PromotionFormState,
  formData: FormData,
): Promise<PromotionFormState> {
  const ctx = await requireSchoolContext("art11");
  if (!schoolCanWrite(ctx, "art11")) {
    return { error: "Solo la dirección y la jefatura de estudios pueden informar un caso." };
  }

  const studentId = texto(formData, "studentId");
  const year = Number(texto(formData, "year"));
  const utpReport = texto(formData, "utpReport");

  if (!studentId || !Number.isInteger(year)) return { error: "Falta el alumno o el año escolar." };
  if (utpReport.length < 20) {
    return { error: "El informe del jefe técnico-pedagógico es obligatorio (Art. 11)." };
  }

  const resolucion = await resolucionDelColegio(ctx.school.id, studentId, year);
  if (!resolucion) return { error: "Ese alumno no es de este colegio." };

  await db.promotionResolution.update({
    where: { id: resolucion.id },
    data: {
      utpReport,
      utpReportById: ctx.user.id,
      utpReportedAt: new Date(),
    },
  });

  revalidarPromocion();
  return { ok: true };
}

/**
 * Registra la audiencia al estudiante y su apoderado (Art. 11), con sus notas.
 */
export async function saveHearing(
  _prev: PromotionFormState,
  formData: FormData,
): Promise<PromotionFormState> {
  const ctx = await requireSchoolContext("art11");
  if (!schoolCanWrite(ctx, "art11")) {
    return { error: "Solo la dirección y la jefatura de estudios pueden registrar la audiencia." };
  }

  const studentId = texto(formData, "studentId");
  const year = Number(texto(formData, "year"));
  const hearingHeldAt = fechaMediodia(texto(formData, "hearingHeldAt"));
  const hearingNotes = texto(formData, "hearingNotes");

  if (!studentId || !Number.isInteger(year)) return { error: "Falta el alumno o el año escolar." };
  if (!hearingHeldAt) return { error: "Elige una fecha válida para la audiencia." };

  const resolucion = await resolucionDelColegio(ctx.school.id, studentId, year);
  if (!resolucion) return { error: "Ese alumno no es de este colegio." };

  await db.promotionResolution.update({
    where: { id: resolucion.id },
    data: { hearingHeldAt, hearingNotes: hearingNotes || null },
  });

  revalidarPromocion();
  return { ok: true };
}

/**
 * Registra la decisión de la dirección con la UTP (Art. 11).
 *
 * No deja cerrar el caso sin el informe de la UTP y la audiencia: son los
 * antecedentes mínimos que la norma exige antes de resolver. La decisión se
 * toma acá, pero la toma una persona, no el sistema.
 */
export async function savePromotionDecision(
  _prev: PromotionFormState,
  formData: FormData,
): Promise<PromotionFormState> {
  const ctx = await requireSchoolContext("art11");
  if (!schoolCanWrite(ctx, "art11")) {
    return { error: "Solo la dirección y la jefatura de estudios pueden resolver un caso." };
  }

  const studentId = texto(formData, "studentId");
  const year = Number(texto(formData, "year"));
  const outcome = texto(formData, "outcome");
  const decision = texto(formData, "decision");
  const attendanceException = texto(formData, "attendanceException") === "on";
  const attendanceExceptionReason = texto(formData, "attendanceExceptionReason");

  if (!studentId || !Number.isInteger(year)) return { error: "Falta el alumno o el año escolar." };
  if (!["PROMOTED", "NOT_PROMOTED"].includes(outcome)) {
    return { error: "Elige si se promueve o no se promueve." };
  }
  if (decision.length < 20) {
    return { error: "La decisión necesita su fundamento (Art. 11)." };
  }
  if (attendanceException && attendanceExceptionReason.length < 10) {
    return { error: "La excepción de asistencia necesita su fundamento (Art. 10.2)." };
  }

  const resolucion = await resolucionDelColegio(ctx.school.id, studentId, year);
  if (!resolucion) return { error: "Ese alumno no es de este colegio." };

  // La decisión se está tomando en este momento, así que solo se exigen los
  // antecedentes previos: el informe de la UTP y la audiencia.
  const faltantes = faltantesDeliberacion({
    utpReport: resolucion.utpReport,
    hearingHeldAt: resolucion.hearingHeldAt,
    outcome: "PROMOTED",
    decision,
  }).filter((f) => !f.includes("decisión"));
  if (faltantes.length > 0) {
    return { error: `Falta: ${faltantes.join(" ")}` };
  }

  await db.promotionResolution.update({
    where: { id: resolucion.id },
    data: {
      outcome: outcome as "PROMOTED" | "NOT_PROMOTED",
      decision,
      decidedById: ctx.user.id,
      decidedAt: new Date(),
      attendanceException,
      attendanceExceptionReason: attendanceException ? attendanceExceptionReason : null,
      attendanceExceptionById: attendanceException ? ctx.user.id : null,
      attendanceExceptionAt: attendanceException ? new Date() : null,
    },
  });

  revalidarPromocion();
  return { ok: true };
}

/**
 * Autoriza (o retira) la excepción al 85% de asistencia (Art. 10.2), sin tocar
 * la decisión de promoción.
 */
export async function saveAttendanceException(
  _prev: PromotionFormState,
  formData: FormData,
): Promise<PromotionFormState> {
  const ctx = await requireSchoolContext("art11");
  if (!schoolCanWrite(ctx, "art11")) {
    return { error: "Solo la dirección y la jefatura de estudios pueden autorizar una excepción." };
  }

  const studentId = texto(formData, "studentId");
  const year = Number(texto(formData, "year"));
  const autorizar = texto(formData, "autorizar") === "on";
  const reason = texto(formData, "reason");

  if (!studentId || !Number.isInteger(year)) return { error: "Falta el alumno o el año escolar." };
  if (autorizar && reason.length < 10) {
    return { error: "La excepción de asistencia necesita su fundamento (Art. 10.2)." };
  }

  const resolucion = await resolucionDelColegio(ctx.school.id, studentId, year);
  if (!resolucion) return { error: "Ese alumno no es de este colegio." };

  await db.promotionResolution.update({
    where: { id: resolucion.id },
    data: {
      attendanceException: autorizar,
      attendanceExceptionReason: autorizar ? reason : null,
      attendanceExceptionById: autorizar ? ctx.user.id : null,
      attendanceExceptionAt: autorizar ? new Date() : null,
    },
  });

  revalidarPromocion();
  return { ok: true };
}
