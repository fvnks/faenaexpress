"use server";

// Documentos y consentimientos del expediente del alumno.
//
// La Ley 21.719 (ley de protección de datos personales) obliga a que el
// consentimiento sea específico e informado, que se pueda revocar, y que el
// titular tenga portabilidad de sus datos. Y el colegio igual tiene que poder
// guardar el certificado de nacimiento o el de estudios del alumno.
//
// Los archivos se guardan en la base, igual que los documentos del trabajador
// en el módulo de Facturas (`WorkerDocument`): el archivo es de un alumno y
// vive con él.

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { requireSchoolContext, schoolCanWrite } from "@/lib/school-auth";

export type DocumentFormState = { error?: string; ok?: boolean } | undefined;

const TIPOS_DOCUMENTO = [
  "CERTIFICADO_NACIMIENTO",
  "CERTIFICADO_ESTUDIOS",
  "FICHA_MEDICA",
  "CUSTODIA",
  "OTRO",
] as const;

const METODOS_CONSENTIMIENTO = ["PRESENCIAL", "DIGITAL", "TESTIMONIO"] as const;

const MAX_BYTES = 5 * 1024 * 1024;

function texto(formData: FormData, campo: string): string {
  return String(formData.get(campo) ?? "").trim();
}

/** Sube un documento al expediente del alumno. */
export async function uploadStudentDocument(
  _prev: DocumentFormState,
  formData: FormData,
): Promise<DocumentFormState> {
  const ctx = await requireSchoolContext("estudiantes");
  if (!schoolCanWrite(ctx, "estudiantes")) {
    return { error: "Tu rol no permite subir documentos." };
  }

  const studentId = texto(formData, "studentId");
  const title = texto(formData, "title");
  const type = texto(formData, "type") || "OTRO";
  const description = texto(formData, "description");
  const archivo = formData.get("file");

  if (!studentId) return { error: "Falta el alumno." };
  if (title.length < 1 || title.length > 120) {
    return { error: "El título del documento es obligatorio (1-120). " };
  }
  if (!TIPOS_DOCUMENTO.includes(type as (typeof TIPOS_DOCUMENTO)[number])) {
    return { error: "El tipo de documento no es válido." };
  }
  if (!(archivo instanceof File) || archivo.size === 0) {
    return { error: "Selecciona un archivo." };
  }
  if (archivo.size > MAX_BYTES) {
    return { error: "El archivo supera los 5 MB." };
  }

  const alumno = await db.student.findFirst({
    where: { id: studentId, schoolId: ctx.school.id },
    select: { id: true },
  });
  if (!alumno) return { error: "Ese alumno no es de este colegio." };

  const buffer = Buffer.from(await archivo.arrayBuffer());

  await db.studentDocument.create({
    data: {
      schoolId: ctx.school.id,
      studentId,
      type: type as (typeof TIPOS_DOCUMENTO)[number],
      title,
      description: description || null,
      fileName: archivo.name || "documento",
      mimeType: archivo.type || "application/octet-stream",
      sizeBytes: archivo.size,
      fileData: buffer,
      uploadedById: ctx.user.id,
    },
  });

  revalidatePath(`/colegios/estudiantes/${studentId}`);
  return { ok: true };
}

/** Elimina un documento del expediente. */
export async function deleteStudentDocument(
  _prev: DocumentFormState,
  formData: FormData,
): Promise<DocumentFormState> {
  const ctx = await requireSchoolContext("estudiantes");
  if (!schoolCanWrite(ctx, "estudiantes")) {
    return { error: "Tu rol no permite eliminar documentos." };
  }

  const id = texto(formData, "documentId");
  const studentId = texto(formData, "studentId");
  if (!id) return { error: "Falta el documento." };

  const eliminado = await db.studentDocument.deleteMany({
    where: { id, studentId, schoolId: ctx.school.id },
  });
  if (eliminado.count === 0) return { error: "Ese documento no es de este colegio." };

  revalidatePath(`/colegios/estudiantes/${studentId}`);
  return { ok: true };
}

/**
 * Registra (o actualiza) el consentimiento de un alumno para un fin.
 *
 * Un consentimiento por fin: la ley pide que sea específico, no un "sí" a
 * todo. Y se puede revocar, que es tan importante como otorgarlo.
 */
export async function saveConsent(
  _prev: DocumentFormState,
  formData: FormData,
): Promise<DocumentFormState> {
  const ctx = await requireSchoolContext("estudiantes");
  if (!schoolCanWrite(ctx, "estudiantes")) {
    return { error: "Tu rol no puede registrar consentimientos." };
  }

  const studentId = texto(formData, "studentId");
  const purpose = texto(formData, "purpose");
  const grantedBy = texto(formData, "grantedBy");
  const method = texto(formData, "method") || "PRESENCIAL";
  const notes = texto(formData, "notes");

  if (!studentId) return { error: "Falta el alumno." };
  if (!purpose) return { error: "Falta el fin del consentimiento." };
  if (!METODOS_CONSENTIMIENTO.includes(method as (typeof METODOS_CONSENTIMIENTO)[number])) {
    return { error: "El método de registro no es válido." };
  }

  const alumno = await db.student.findFirst({
    where: { id: studentId, schoolId: ctx.school.id },
    select: { id: true },
  });
  if (!alumno) return { error: "Ese alumno no es de este colegio." };

  await db.studentConsent.upsert({
    where: { studentId_purpose: { studentId, purpose: purpose as never } },
    create: {
      schoolId: ctx.school.id,
      studentId,
      purpose: purpose as never,
      status: "OTORGADO",
      grantedAt: new Date(),
      grantedBy: grantedBy || null,
      method,
      notes: notes || null,
      recordedById: ctx.user.id,
    },
    update: {
      status: "OTORGADO",
      grantedAt: new Date(),
      grantedBy: grantedBy || null,
      method,
      notes: notes || null,
      revokedAt: null,
      revokedReason: null,
      recordedById: ctx.user.id,
    },
  });

  revalidatePath(`/colegios/estudiantes/${studentId}`);
  return { ok: true };
}

/** Revoca un consentimiento. */
export async function revokeConsent(
  _prev: DocumentFormState,
  formData: FormData,
): Promise<DocumentFormState> {
  const ctx = await requireSchoolContext("estudiantes");
  if (!schoolCanWrite(ctx, "estudiantes")) {
    return { error: "Tu rol no puede revocar consentimientos." };
  }

  const id = texto(formData, "consentId");
  const studentId = texto(formData, "studentId");
  const reason = texto(formData, "reason");
  if (!id) return { error: "Falta el consentimiento." };

  const revocado = await db.studentConsent.updateMany({
    where: { id, studentId, schoolId: ctx.school.id },
    data: {
      status: "REVOCADO",
      revokedAt: new Date(),
      revokedReason: reason || null,
      recordedById: ctx.user.id,
    },
  });
  if (revocado.count === 0) return { error: "Ese consentimiento no es de este colegio." };

  revalidatePath(`/colegios/estudiantes/${studentId}`);
  return { ok: true };
}
