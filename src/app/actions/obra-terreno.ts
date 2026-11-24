"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { obraCanWrite, requireObraContext } from "@/lib/obra-auth";
import type { ObraActionState } from "./obra-avance";

const MAX_BYTES = 5 * 1024 * 1024;

/** Sube una foto de evidencia a una cubicación (Bytes en BD, como los documentos). */
export async function subirFotoCubicacion(
  _prev: ObraActionState,
  formData: FormData,
): Promise<ObraActionState> {
  const ctx = await requireObraContext("avance");
  if (!obraCanWrite(ctx, "avance")) return { error: "Tu rol no permite subir evidencia." };

  const cubicacionId = String(formData.get("cubicacionId") ?? "");
  const archivo = formData.get("file");
  if (!(archivo instanceof File) || archivo.size === 0) return { error: "Selecciona una imagen." };
  if (archivo.size > MAX_BYTES) return { error: "La imagen supera los 5 MB." };
  if (!archivo.type.startsWith("image/")) return { error: "El archivo debe ser una imagen." };

  const cubicacion = await db.cubicacion.findFirst({
    where: { id: cubicacionId, partida: { obraId: ctx.obra.id } },
    select: { id: true },
  });
  if (!cubicacion) return { error: "La cubicación no existe." };

  const buffer = Buffer.from(await archivo.arrayBuffer());
  await db.fotoCubicacion.create({
    data: {
      cubicacionId,
      fileName: archivo.name || "foto.jpg",
      mimeType: archivo.type,
      sizeBytes: archivo.size,
      fileData: buffer,
    },
  });

  revalidatePath("/obras/avance");
  revalidatePath("/obras/reportes");
  return { ok: true, message: "Foto guardada." };
}

/** Crea una maquinaria en la obra. */
export async function crearMaquinaria(
  _prev: ObraActionState,
  formData: FormData,
): Promise<ObraActionState> {
  const ctx = await requireObraContext("maquinaria");
  if (!obraCanWrite(ctx, "maquinaria")) return { error: "Tu rol no permite agregar maquinaria." };

  const nombre = String(formData.get("nombre") ?? "").trim();
  const patente = String(formData.get("patente") ?? "").trim() || null;
  const proxima = String(formData.get("proximaMantencion") ?? "").trim();
  if (nombre.length < 2) return { error: "Indica el nombre de la maquinaria." };

  await db.maquinaria.create({
    data: {
      obraId: ctx.obra.id,
      nombre: nombre.slice(0, 120),
      patente: patente?.slice(0, 20) ?? null,
      proximaMantencion: proxima ? Number(proxima.replace(",", ".")) : null,
    },
  });
  revalidatePath("/obras/maquinaria");
  return { ok: true, message: "Maquinaria agregada." };
}

/** Registra una lectura de horómetro o una mantención. */
export async function registrarHorometro(
  _prev: ObraActionState,
  formData: FormData,
): Promise<ObraActionState> {
  const ctx = await requireObraContext("maquinaria");
  if (!obraCanWrite(ctx, "maquinaria")) return { error: "Tu rol no permite registrar horómetros." };

  const maquinariaId = String(formData.get("maquinariaId") ?? "");
  const horas = Number(String(formData.get("horas") ?? "").replace(",", "."));
  const tipo = String(formData.get("tipo") ?? "HOROMETRO") === "MANTENCION" ? "MANTENCION" : "HOROMETRO";
  const descripcion = String(formData.get("descripcion") ?? "").trim();

  const maq = await db.maquinaria.findFirst({
    where: { id: maquinariaId, obraId: ctx.obra.id },
    select: { id: true, horometro: true },
  });
  if (!maq) return { error: "La maquinaria no existe." };
  if (!Number.isFinite(horas) || horas <= 0) return { error: "Ingresa horas válidas." };
  if (horas < maq.horometro && tipo === "HOROMETRO") {
    return { error: `La lectura no puede ser menor al horómetro actual (${maq.horometro.toFixed(1)} h).` };
  }

  await db.$transaction(async (tx) => {
    await tx.horometro.create({
      data: { maquinariaId, horas, tipo, descripcion: descripcion || null, createdById: ctx.user.id },
    });
    if (tipo === "HOROMETRO") {
      await tx.maquinaria.update({ where: { id: maquinariaId }, data: { horometro: horas } });
    }
  });
  revalidatePath("/obras/maquinaria");
  return { ok: true, message: tipo === "MANTENCION" ? "Mantención registrada." : "Horómetro actualizado." };
}
