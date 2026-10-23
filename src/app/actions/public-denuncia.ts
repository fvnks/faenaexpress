"use server";

// Acción pública para crear una denuncia anónima/confidencial (C6).
//
// No requiere autenticación: cualquiera puede acceder a `/denuncia` y reportar.
// El caso se crea con status ABIERTO y reportedById = null (anónimo).
// La dirección/UTP lo verá en su bandeja de convivencia.

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";

export type DenunciaFormState =
  | { error?: string; ok?: boolean; caseId?: string }
  | undefined;

const TIPOS_PERMITIDOS = [
  "CONDUCTA",
  "ACOSO_ESCOLAR",
  "AGRESION",
  "MALTRATO_INFANTIL",
  "DISCRIMINACION",
  "ACOSO_LABORAL",
  "SALUD_MENTAL",
  "OTRO",
] as const;

export async function crearDenunciaPublica(
  _prev: DenunciaFormState,
  formData: FormData,
): Promise<DenunciaFormState> {
  const tipo = String(formData.get("tipo") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const studentIds = formData.getAll("studentId").map((s) => String(s).trim()).filter(Boolean);
  const evidence = String(formData.get("evidence") ?? "").trim();

  if (!tipo || !TIPOS_PERMITIDOS.includes(tipo as (typeof TIPOS_PERMITIDOS)[number])) {
    return { error: "El tipo de denuncia no es válido." };
  }
  if (!title || title.length < 5) {
    return { error: "El título es obligatorio (mínimo 5 caracteres)." };
  }
  if (!description || description.length < 20) {
    return { error: "La descripción es obligatoria (mínimo 20 caracteres)." };
  }

  const schoolId = String(formData.get("schoolId") ?? "").trim();

  if (!schoolId) return { error: "Falta el colegio." };

  const colegio = await db.school.findUnique({
    where: { id: schoolId },
    select: { id: true },
  });
  if (!colegio) return { error: "El colegio no existe." };

  // Calcula el vencimiento legal: 2 meses desde hoy (Ley 21.809)
  const investigationDueAt = new Date();
  investigationDueAt.setMonth(investigationDueAt.getMonth() + 2);

  const caso = await db.conductCase.create({
    data: {
      schoolId,
      type: tipo as "CONDUCTA" | "ACOSO_ESCOLAR" | "AGRESION" | "MALTRATO_INFANTIL" | "DISCRIMINACION" | "ACOSO_LABORAL" | "SALUD_MENTAL" | "OTRO",
      title,
      description,
      reportedById: null, // Anónima
      investigationDueAt,
    },
    select: { id: true },
  });

  // Participantes (alumnos involucrados)
  if (studentIds.length > 0) {
    await db.caseParticipant.createMany({
      data: studentIds.map((studentId) => ({
        caseId: caso.id,
        studentId,
        role: "AFECTADO",
        note: "Reportado en denuncia anónima",
      })),
      skipDuplicates: true,
    });
  }

  // Primera acción: recepción de la denuncia
  await db.conductAction.create({
    data: {
      caseId: caso.id,
      type: "RECEPCION",
      title: "Denuncia recibida por canal confidencial",
      notes: "Ingresada a través del formulario público de denuncias.",
      dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h para acuse de recibo
      responsible: "Equipo de Convivencia",
    },
  });

  revalidatePath("/colegios/convivencia");
  return { ok: true, caseId: caso.id };
}