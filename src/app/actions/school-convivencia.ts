"use server";

// Convivencia escolar: el caso y su seguimiento, los protocolos y el plan.
//
// OJO con una cosa: el plazo de la investigación NO lo elige el colegio. La
// Ley 21.809 fija que la investigación interna de un caso de alumno no puede
// pasar de 2 meses, y el sistema calcula ese vencimiento al abrir el caso.

import { revalidatePath } from "next/cache";

import type { ConductActionType, ConductCaseType } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { requireSchoolContext, schoolCanWrite } from "@/lib/school-auth";
import {
  fechaRevisionPlan,
  fechaVenceInvestigacion,
  TIPOS_ACCION,
  TIPOS_CASO,
} from "@/lib/school-convivencia-rules";

export type ConvivenciaFormState = {
  error?: string;
  ok?: boolean;
  /** El id de lo que se acaba de crear (el caso, la etapa). */
  id?: string;
} | undefined;

function texto(formData: FormData, campo: string): string {
  return String(formData.get(campo) ?? "").trim();
}

/**
 * Reporta un caso.
 *
 * Cualquiera del colegio con acceso a la sección puede reportar: el docente
 * que vio algo, la secretaria que recibió el relato de una familia. Quien
 * gestiona el caso (agregar etapas, cerrarlo) es otro: eso sí exige permiso
 * de escritura en la sección.
 */
export async function reportCase(
  _prev: ConvivenciaFormState,
  formData: FormData,
): Promise<ConvivenciaFormState> {
  const ctx = await requireSchoolContext("convivencia");

  const title = texto(formData, "title");
  const description = texto(formData, "description");
  const type = texto(formData, "type") || "CONDUCTA";
  const severity = texto(formData, "severity") || "LEVE";
  const alumnos = formData.getAll("studentId").map(String).filter(Boolean);

  if (title.length < 5) return { error: "Describe el caso con un título claro." };
  if (description.length < 20) {
    return { error: "Cuéntanos qué pasó (con al menos unas palabras)." };
  }
  if (!TIPOS_CASO[type as keyof typeof TIPOS_CASO]) {
    return { error: "El tipo de caso no es válido." };
  }
  if (!["LEVE", "MEDIA", "GRAVE"].includes(severity)) {
    return { error: "La gravedad no es válida." };
  }

  const validos = alumnos.length
    ? await db.student.findMany({
        where: { id: { in: alumnos }, schoolId: ctx.school.id },
        select: { id: true },
      })
    : [];
  const idsValidos = validos.map((s) => s.id);

  const caso = await db.conductCase.create({
    data: {
      schoolId: ctx.school.id,
      type: type as ConductCaseType,
      severity,
      title,
      description,
      status: "ABIERTO",
      // El plazo lo pone la ley, no el colegio.
      investigationDueAt: fechaVenceInvestigacion(),
      reportedById: ctx.user.id,
      participants: {
        create: idsValidos.map((studentId) => ({
          studentId,
          role: "AFECTADO" as const,
        })),
      },
      actions: {
        create: {
          type: "RECEPCION" as const,
          title: "Recepción de la denuncia",
          notes: `Reportado por ${ctx.user.name}`,
        },
      },
    },
  });

  revalidatePath("/colegios/convivencia");
  revalidatePath(`/colegios/convivencia/casos/${caso.id}`);
  return { ok: true };
}

/** Agrega una etapa al caso (una acción del protocolo). */
export async function addCaseAction(
  _prev: ConvivenciaFormState,
  formData: FormData,
): Promise<ConvivenciaFormState> {
  const ctx = await requireSchoolContext("convivencia");
  if (!schoolCanWrite(ctx, "convivencia")) {
    return { error: "Tu rol no puede gestionar los casos." };
  }

  const caseId = texto(formData, "caseId");
  const type = texto(formData, "type") || "INVESTIGACION";
  const title = texto(formData, "title");
  const notes = texto(formData, "notes");
  const dueAt = texto(formData, "dueAt");
  const responsibleId = texto(formData, "responsibleId");
  const outcome = texto(formData, "outcome");

  if (!caseId) return { error: "Falta el caso." };
  if (!TIPOS_ACCION[type as keyof typeof TIPOS_ACCION]) {
    return { error: "El tipo de etapa no es válido." };
  }
  if (title.length < 3) return { error: "Describe la etapa." };

  const caso = await db.conductCase.findFirst({
    where: { id: caseId, schoolId: ctx.school.id },
    select: { id: true, status: true },
  });
  if (!caso) return { error: "Ese caso no es de este colegio." };

  // Si la etapa se marca como hecha de una, se cierra con su resultado.
  const hecha = formData.get("doneAt") === "on";
  const accion = await db.conductAction.create({
    data: {
      caseId,
      type: type as ConductActionType,
      title,
      notes: notes || null,
      dueAt: dueAt ? new Date(`${dueAt}T12:00:00.000Z`) : null,
      doneAt: hecha ? new Date() : null,
      outcome: hecha ? outcome || null : null,
      responsibleId: responsibleId || null,
      responsible: ctx.user.name,
    },
  });

  // La investigación arranca sola: es la etapa siguiente natural.
  if (caso.status === "ABIERTO" && type === "INVESTIGACION") {
    await db.conductCase.update({
      where: { id: caseId },
      data: { status: "EN_INVESTIGACION" },
    });
  }

  revalidatePath(`/colegios/convivencia/casos/${caseId}`);
  revalidatePath("/colegios/convivencia");
  return { ok: true, id: accion.id };
}

/** Cierra una etapa con su resultado. */
export async function completeCaseAction(
  _prev: ConvivenciaFormState,
  formData: FormData,
): Promise<ConvivenciaFormState> {
  const ctx = await requireSchoolContext("convivencia");
  if (!schoolCanWrite(ctx, "convivencia")) {
    return { error: "Tu rol no puede gestionar los casos." };
  }

  const id = texto(formData, "actionId");
  const caseId = texto(formData, "caseId");
  const outcome = texto(formData, "outcome");
  if (!id) return { error: "Falta la etapa." };

  const actualizada = await db.conductAction.updateMany({
    where: { id, caso: { schoolId: ctx.school.id } },
    data: { doneAt: new Date(), outcome: outcome || null },
  });
  if (actualizada.count === 0) return { error: "Esa etapa no es de este colegio." };

  revalidatePath(`/colegios/convivencia/casos/${caseId}`);
  revalidatePath("/colegios/convivencia");
  return { ok: true };
}

/**
 * Cierra el caso.
 *
 * Si hubo medida de expulsión, la ley exige el informe de la comisión
 * (profesor jefe, coordinador de convivencia y un técnico-pedagógico): sin ese
 * informe, la medida no se puede registrar.
 */
export async function closeCase(
  _prev: ConvivenciaFormState,
  formData: FormData,
): Promise<ConvivenciaFormState> {
  const ctx = await requireSchoolContext("convivencia");
  if (!schoolCanWrite(ctx, "convivencia")) {
    return { error: "Tu rol no puede cerrar casos." };
  }

  const caseId = texto(formData, "caseId");
  const resolution = texto(formData, "resolution");
  const commissionReport = texto(formData, "commissionReport");
  const status = texto(formData, "status") || "RESUELTO";

  if (!caseId) return { error: "Falta el caso." };
  if (resolution.length < 10) return { error: "Escribe cómo se resolvió el caso." };

  const caso = await db.conductCase.findFirst({
    where: { id: caseId, schoolId: ctx.school.id },
    include: { actions: { select: { type: true, doneAt: true } } },
  });
  if (!caso) return { error: "Ese caso no es de este colegio." };

  // La expulsión (o la cancelación de matrícula) exige el informe de la
  // comisión. Es lo que la ley pide, no un capricho del sistema.
  const huboExpulsion = caso.actions.some((a) => a.type === "EXPULSION" && a.doneAt);
  if (huboExpulsion && commissionReport.length < 20) {
    return {
      error:
        "El caso tuvo una medida de expulsión: hay que adjuntar el informe de la comisión (profesor jefe, coordinador de convivencia y un técnico-pedagógico).",
    };
  }

  await db.$transaction([
    db.conductCase.update({
      where: { id: caseId },
      data: {
        status: status as "RESUELTO" | "CERRADO",
        resolution,
        commissionReport: commissionReport || null,
        closedAt: new Date(),
      },
    }),
    db.conductAction.create({
      data: {
        caseId,
        type: "CIERRE",
        title: "Cierre del caso",
        notes: resolution,
        doneAt: new Date(),
        outcome: resolution,
        responsible: ctx.user.name,
      },
    }),
  ]);

  revalidatePath(`/colegios/convivencia/casos/${caseId}`);
  revalidatePath("/colegios/convivencia");
  return { ok: true };
}

/** Guarda un protocolo del colegio con sus etapas y plazos. */
export async function saveProtocol(
  _prev: ConvivenciaFormState,
  formData: FormData,
): Promise<ConvivenciaFormState> {
  const ctx = await requireSchoolContext("convivencia");
  if (!schoolCanWrite(ctx, "convivencia")) {
    return { error: "Tu rol no puede editar los protocolos." };
  }

  const id = texto(formData, "protocolId");
  const name = texto(formData, "name");
  const kind = texto(formData, "kind") || "CONVIVENCIA";
  const steps = texto(formData, "steps");

  if (name.length < 3) return { error: "El protocolo necesita un nombre." };

  // Los pasos se escriben como "Nombre | días | responsable", uno por línea.
  const pasos: { name: string; deadlineDays: number; responsible: string }[] = [];
  for (const linea of steps.split("\n")) {
    const limpia = linea.trim();
    if (!limpia) continue;
    const [nombre, dias, responsable] = limpia.split("|").map((p) => p.trim());
    if (!nombre) continue;
    const plazo = Number(dias ?? 0);
    pasos.push({
      name: nombre,
      deadlineDays: Number.isFinite(plazo) && plazo > 0 ? plazo : 0,
      responsible: responsable ?? "",
    });
  }
  if (pasos.length === 0) {
    return { error: "El protocolo necesita al menos una etapa." };
  }

  const datos = {
    name,
    kind,
    steps: pasos as unknown as object,
    active: formData.get("active") === "on",
  };

  if (id) {
    const actualizada = await db.conductProtocol.updateMany({
      where: { id, schoolId: ctx.school.id },
      data: datos,
    });
    if (actualizada.count === 0) return { error: "Ese protocolo no es de este colegio." };
  } else {
    const ultimo = await db.conductProtocol.findFirst({
      where: { schoolId: ctx.school.id, name },
      orderBy: { version: "desc" },
      select: { version: true },
    });
    await db.conductProtocol.create({
      data: {
        ...datos,
        schoolId: ctx.school.id,
        version: (ultimo?.version ?? 0) + 1,
      },
    });
  }

  revalidatePath("/colegios/convivencia/protocolos");
  return { ok: true };
}

/** Guarda el plan de gestión de la convivencia del año. */
export async function savePlan(
  _prev: ConvivenciaFormState,
  formData: FormData,
): Promise<ConvivenciaFormState> {
  const ctx = await requireSchoolContext("convivencia");
  if (!schoolCanWrite(ctx, "convivencia")) {
    return { error: "Tu rol no puede editar el plan." };
  }

  const year = Number(formData.get("year") ?? new Date().getFullYear());
  const objectives = texto(formData, "objectives");
  if (objectives.length < 20) {
    return { error: "El plan necesita sus objetivos (con al menos unas palabras)." };
  }
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    return { error: "El año del plan no es válido." };
  }

  const plan = await db.convivenciaPlan.upsert({
    where: { schoolId_year: { schoolId: ctx.school.id, year } },
    create: {
      schoolId: ctx.school.id,
      year,
      objectives: { texto: objectives } as unknown as object,
      status: "BORRADOR",
      // La revisión participativa: la ley pide cada 4 años.
      reviewDueAt: fechaRevisionPlan(),
    },
    update: { objectives: { texto: objectives } as unknown as object },
  });

  revalidatePath("/colegios/convivencia/plan");
  return { ok: true, id: plan.id };
}

/** Agrega una acción al plan, con su área y su plazo. */
export async function addPlanActivity(
  _prev: ConvivenciaFormState,
  formData: FormData,
): Promise<ConvivenciaFormState> {
  const ctx = await requireSchoolContext("convivencia");
  if (!schoolCanWrite(ctx, "convivencia")) {
    return { error: "Tu rol no puede editar el plan." };
  }

  const planId = texto(formData, "planId");
  const name = texto(formData, "name");
  const area = texto(formData, "area");
  const responsible = texto(formData, "responsible");
  const dueAt = texto(formData, "dueAt");

  if (!planId) return { error: "Falta el plan." };
  if (name.length < 3) return { error: "La acción necesita un nombre." };
  if (!area) return { error: "Elige el área." };

  const plan = await db.convivenciaPlan.findFirst({
    where: { id: planId, schoolId: ctx.school.id },
    select: { id: true },
  });
  if (!plan) return { error: "Ese plan no es de este colegio." };

  await db.planActivity.create({
    data: {
      planId,
      name,
      area,
      responsible: responsible || null,
      dueAt: dueAt ? new Date(`${dueAt}T12:00:00.000Z`) : null,
    },
  });

  revalidatePath("/colegios/convivencia/plan");
  return { ok: true };
}

/** Marca una acción del plan como hecha. */
export async function completePlanActivity(
  _prev: ConvivenciaFormState,
  formData: FormData,
): Promise<ConvivenciaFormState> {
  const ctx = await requireSchoolContext("convivencia");
  if (!schoolCanWrite(ctx, "convivencia")) {
    return { error: "Tu rol no puede editar el plan." };
  }

  const id = texto(formData, "activityId");
  if (!id) return { error: "Falta la acción." };

  const actualizada = await db.planActivity.updateMany({
    where: { id, plan: { schoolId: ctx.school.id } },
    data: { doneAt: new Date() },
  });
  if (actualizada.count === 0) return { error: "Esa acción no es de este colegio." };

  revalidatePath("/colegios/convivencia/plan");
  return { ok: true };
}

/** Aprueba el plan y deja constancia de que se entregó a las familias. */
export async function approvePlan(
  _prev: ConvivenciaFormState,
  formData: FormData,
): Promise<ConvivenciaFormState> {
  const ctx = await requireSchoolContext("convivencia");
  if (!schoolCanWrite(ctx, "convivencia")) {
    return { error: "Tu rol no puede aprobar el plan." };
  }

  const planId = texto(formData, "planId");
  const entregado = formData.get("delivered") === "on";
  if (!planId) return { error: "Falta el plan." };

  const plan = await db.convivenciaPlan.findFirst({
    where: { id: planId, schoolId: ctx.school.id },
    select: { id: true },
  });
  if (!plan) return { error: "Ese plan no es de este colegio." };

  await db.convivenciaPlan.update({
    where: { id: planId },
    data: {
      status: "VIGENTE",
      approvedAt: new Date(),
      ...(entregado ? { deliveredAt: new Date() } : {}),
    },
  });

  revalidatePath("/colegios/convivencia/plan");
  return { ok: true };
}
