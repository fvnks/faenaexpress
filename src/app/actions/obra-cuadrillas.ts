"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { recordObraAudit } from "@/lib/obra-audit";
import { obraCanWrite, requireObraContext } from "@/lib/obra-auth";
import type { ObraActionState } from "./obra-avance";

export async function crearCuadrilla(
  _prev: ObraActionState,
  formData: FormData,
): Promise<ObraActionState> {
  const ctx = await requireObraContext("avance");
  if (!obraCanWrite(ctx, "avance")) return { error: "Tu rol no permite gestionar cuadrillas." };

  const nombre = String(formData.get("nombre") ?? "").trim().slice(0, 120);
  const integrantes = Number(String(formData.get("integrantes") ?? "1"));
  if (nombre.length < 2) return { error: "Ingresa el nombre de la cuadrilla." };
  if (!Number.isFinite(integrantes) || integrantes < 1) return { error: "Indica al menos un integrante." };

  const existente = await db.cuadrilla.findFirst({
    where: { obraId: ctx.obra.id, nombre },
    select: { id: true },
  });
  if (existente) return { error: "Ya existe una cuadrilla con ese nombre." };

  await db.cuadrilla.create({
    data: {
      obraId: ctx.obra.id,
      nombre,
      integrantes: Math.round(integrantes),
      createdAt: new Date(),
    },
  });
  await recordObraAudit(ctx, {
    action: "CREATE",
    entityType: "Cuadrilla",
    summary: `Creó la cuadrilla «${nombre}» con ${Math.round(integrantes)} integrantes.`,
  });
  revalidatePaths();
  return { ok: true, message: "Cuadrilla creada." };
}

export async function cambiarEstadoCuadrilla(formData: FormData): Promise<void> {
  const ctx = await requireObraContext("avance");
  if (!obraCanWrite(ctx, "avance")) return;
  const id = String(formData.get("id") ?? "");
  const activa = String(formData.get("activa") ?? "") === "true";
  if (!id) return;
  const cuadrilla = await db.cuadrilla.findFirst({
    where: { id, obraId: ctx.obra.id },
    select: { nombre: true },
  });
  if (!cuadrilla) return;
  await db.cuadrilla.update({ where: { id }, data: { activa } });
  await recordObraAudit(ctx, {
    action: "UPDATE",
    entityType: "Cuadrilla",
    entityId: id,
    summary: `${activa ? "Activó" : "Desactivó"} la cuadrilla «${cuadrilla.nombre}».`,
  });
  revalidatePaths();
}

function revalidatePaths() {
  revalidatePath("/obras/avance");
  revalidatePath("/obras/reportes");
}
