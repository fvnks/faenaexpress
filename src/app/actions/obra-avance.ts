"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { recordObraAudit } from "@/lib/obra-audit";
import { obraCanWrite, requireObraContext } from "@/lib/obra-auth";
import { puedeAprobarAvance } from "@/lib/obra-permissions";

export type ObraActionState =
  | { ok?: boolean; error?: string; message?: string; cubicacionId?: string }
  | undefined;

/** Registra una cubicación de avance de una partida (aún sin aprobar). */
export async function registrarCubicacion(
  _prev: ObraActionState,
  formData: FormData,
): Promise<ObraActionState> {
  const ctx = await requireObraContext("avance");
  if (!obraCanWrite(ctx, "avance")) return { error: "Tu rol no permite registrar avance." };

  const obraIdDelFormulario = String(formData.get("obraId") ?? "");
  if (obraIdDelFormulario && obraIdDelFormulario !== ctx.obra.id) {
    return { error: "La medición pertenece a otra obra. Abre esa obra para sincronizarla." };
  }

  const partidaId = String(formData.get("partidaId") ?? "");
  const cuadrillaId = String(formData.get("cuadrillaId") ?? "") || null;
  const cantidad = Number(String(formData.get("cantidad") ?? "").replace(",", "."));
  const fechaRaw = String(formData.get("fecha") ?? "");

  const partida = await db.partida.findFirst({
    where: { id: partidaId, obraId: ctx.obra.id, estado: "VIGENTE" },
    select: { id: true, descripcion: true, cantidad: true },
  });
  if (!partida) return { error: "La partida no existe o está anulada." };
  if (!Number.isFinite(cantidad) || cantidad <= 0) return { error: "Ingresa una cantidad válida." };
  if (cuadrillaId) {
    const cuadrilla = await db.cuadrilla.findFirst({
      where: { id: cuadrillaId, obraId: ctx.obra.id, activa: true },
      select: { id: true },
    });
    if (!cuadrilla) return { error: "La cuadrilla no existe o está inactiva." };
  }

  const yaCubicado = await db.cubicacion.aggregate({
    where: { partidaId, aprobada: true },
    _sum: { cantidad: true },
  });
  const pendiente = partida.cantidad - (yaCubicado._sum.cantidad ?? 0);
  if (cantidad > pendiente + 0.001) {
    return {
      error: `No puedes cubicar más de lo pendiente en esta partida (quedan ${pendiente.toFixed(2)}).`,
    };
  }

  const cubicacion = await db.cubicacion.create({
    data: {
      partidaId,
      cuadrillaId,
      cantidad,
      fecha: fechaRaw ? new Date(`${fechaRaw}T12:00:00.000Z`) : new Date(),
      registradoById: ctx.user.id,
    },
  });
  await recordObraAudit(ctx, {
    action: "CREATE",
    entityType: "Cubicacion",
    entityId: cubicacion.id,
    summary: `Cubicó ${cantidad} en «${partida.descripcion}».`,
  });

  revalidatePath("/obras/avance");
  revalidatePath("/obras/presupuesto");
  revalidatePath("/obras/estados-pago");
  revalidatePath("/obras");
  return { ok: true, message: `Avance registrado en «${partida.descripcion}».`, cubicacionId: cubicacion.id };
}

/** Aprueba o rechaza una cubicación. Solo la dirección de obra. */
export async function aprobarCubicacion(formData: FormData): Promise<void> {
  const ctx = await requireObraContext("avance");
  if (!puedeAprobarAvance(ctx.role)) return;
  const id = String(formData.get("id") ?? "");
  const aprobar = String(formData.get("aprobar") ?? "") === "true";
  if (!id) return;

  const cubicacion = await db.cubicacion.findFirst({
    where: { id, partida: { obraId: ctx.obra.id } },
    select: { id: true, aprobada: true },
  });
  if (!cubicacion || cubicacion.aprobada) return;

  await db.cubicacion.update({
    where: { id },
    data: { aprobada: aprobar, aprobadaById: ctx.user.id },
  });
  await recordObraAudit(ctx, {
    action: "UPDATE",
    entityType: "Cubicacion",
    entityId: id,
    summary: aprobar ? "Aprobó una cubicación." : "Rechazó una cubicación.",
  });

  revalidatePath("/obras/avance");
  revalidatePath("/obras/presupuesto");
  revalidatePath("/obras/estados-pago");
  revalidatePath("/obras");
}

/** Elimina una cubicación pendiente de aprobación (quien la registró la corrige). */
export async function eliminarCubicacion(formData: FormData): Promise<void> {
  const ctx = await requireObraContext("avance");
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await db.cubicacion.deleteMany({
    where: {
      id,
      aprobada: false,
      registradoById: ctx.user.id,
      partida: { obraId: ctx.obra.id },
    },
  });
  await recordObraAudit(ctx, {
    action: "DELETE",
    entityType: "Cubicacion",
    entityId: id,
    summary: "Eliminó una cubicación pendiente.",
  });
  revalidatePath("/obras/avance");
}
