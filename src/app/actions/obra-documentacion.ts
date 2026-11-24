"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { obraCanWrite, requireObraContext } from "@/lib/obra-auth";
import {
  esEstadoDocumentoObra,
  esTipoDocumentoObra,
} from "@/lib/obra-documentacion";
import type { ObraActionState } from "./obra-avance";

const MAX_BYTES = 10 * 1024 * 1024;

/** Fecha de calendario (YYYY-MM-DD) al mediodía UTC, igual que las fechas de obra. */
function fechaCampo(valor: string): Date | null {
  const texto = valor.trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(texto) ? new Date(`${texto}T12:00:00.000Z`) : null;
}

/** Crea un documento en la obra y deja el primer evento de seguimiento. */
export async function crearDocumentoObra(
  _prev: ObraActionState,
  formData: FormData,
): Promise<ObraActionState> {
  const ctx = await requireObraContext("documentos");
  if (!obraCanWrite(ctx, "documentos")) return { error: "Tu rol no permite crear documentación." };

  const tipo = String(formData.get("tipo") ?? "");
  const titulo = String(formData.get("titulo") ?? "").trim();
  const descripcion = String(formData.get("descripcion") ?? "").trim();
  const responsableId = String(formData.get("responsableId") ?? "");
  const fechaVencimiento = fechaCampo(String(formData.get("fechaVencimiento") ?? ""));

  if (!esTipoDocumentoObra(tipo)) return { error: "Selecciona un tipo de documento válido." };
  if (titulo.length < 3) return { error: "Indica un título de al menos 3 caracteres." };

  if (responsableId) {
    const miembro = await db.obraMembership.findFirst({
      where: { userId: responsableId, obraId: ctx.obra.id, active: true },
      select: { id: true },
    });
    if (!miembro) return { error: "El responsable debe ser miembro activo de la obra." };
  }

  const archivo = formData.get("file");
  let bytes: Uint8Array<ArrayBuffer> | null = null;
  let fileName: string | null = null;
  let mimeType: string | null = null;
  if (archivo instanceof File && archivo.size > 0) {
    if (archivo.size > MAX_BYTES) return { error: "El archivo supera los 10 MB." };
    bytes = new Uint8Array(await archivo.arrayBuffer());
    fileName = archivo.name || "documento";
    mimeType = archivo.type || "application/octet-stream";
  }

  await db.$transaction(async (tx) => {
    const doc = await tx.documentoObra.create({
      data: {
        obraId: ctx.obra.id,
        tipo,
        titulo: titulo.slice(0, 180),
        descripcion: descripcion ? descripcion.slice(0, 1000) : null,
        responsableId: responsableId || null,
        fechaVencimiento,
        fileName,
        mimeType,
        sizeBytes: bytes?.length ?? null,
        fileData: bytes,
        createdById: ctx.user.id,
      },
    });
    await tx.seguimientoDocumento.create({
      data: {
        documentoId: doc.id,
        estado: "PENDIENTE",
        nota: "Documento creado",
        createdById: ctx.user.id,
      },
    });
  });

  revalidatePath("/obras/documentos");
  return { ok: true, message: "Documento creado y puesto en seguimiento." };
}

/** Registra un cambio de estado con nota: la trazabilidad es el tracking. */
export async function registrarSeguimiento(
  _prev: ObraActionState,
  formData: FormData,
): Promise<ObraActionState> {
  const ctx = await requireObraContext("documentos");
  if (!obraCanWrite(ctx, "documentos")) return { error: "Tu rol no permite gestionar documentación." };

  const documentoId = String(formData.get("documentoId") ?? "");
  const estado = String(formData.get("estado") ?? "");
  const nota = String(formData.get("nota") ?? "").trim();
  if (!esEstadoDocumentoObra(estado)) return { error: "Estado no válido." };

  const doc = await db.documentoObra.findFirst({
    where: { id: documentoId, obraId: ctx.obra.id },
    select: { id: true, estado: true },
  });
  if (!doc) return { error: "El documento no existe en esta obra." };
  if (doc.estado === estado && !nota) return { error: "Escribe una nota para este cambio." };

  await db.$transaction(async (tx) => {
    await tx.seguimientoDocumento.create({
      data: { documentoId, estado, nota: nota ? nota.slice(0, 1000) : null, createdById: ctx.user.id },
    });
    await tx.documentoObra.update({ where: { id: documentoId }, data: { estado } });
  });

  revalidatePath(`/obras/documentos/${documentoId}`);
  revalidatePath("/obras/documentos");
  return { ok: true, message: "Seguimiento registrado." };
}

/** Ajusta responsable, vencimiento o descripción sin borrar el historial. */
export async function actualizarDocumentoObra(
  _prev: ObraActionState,
  formData: FormData,
): Promise<ObraActionState> {
  const ctx = await requireObraContext("documentos");
  if (!obraCanWrite(ctx, "documentos")) return { error: "Tu rol no permite editar documentación." };

  const documentoId = String(formData.get("documentoId") ?? "");
  const responsableId = String(formData.get("responsableId") ?? "");
  const fecha = fechaCampo(String(formData.get("fechaVencimiento") ?? ""));
  const descripcion = String(formData.get("descripcion") ?? "").trim();

  const doc = await db.documentoObra.findFirst({
    where: { id: documentoId, obraId: ctx.obra.id },
    select: { id: true },
  });
  if (!doc) return { error: "El documento no existe en esta obra." };

  if (responsableId) {
    const miembro = await db.obraMembership.findFirst({
      where: { userId: responsableId, obraId: ctx.obra.id, active: true },
      select: { id: true },
    });
    if (!miembro) return { error: "El responsable debe ser miembro activo de la obra." };
  }

  await db.documentoObra.update({
    where: { id: documentoId },
    data: {
      responsableId: responsableId || null,
      fechaVencimiento: fecha,
      descripcion: descripcion ? descripcion.slice(0, 1000) : null,
    },
  });

  revalidatePath(`/obras/documentos/${documentoId}`);
  revalidatePath("/obras/documentos");
  return { ok: true, message: "Documento actualizado." };
}
