"use server";

import { revalidatePath } from "next/cache";

import type { ApuTipo } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { totalPartida } from "@/lib/obra-budget";
import { recordObraAudit } from "@/lib/obra-audit";
import { obraCanWrite, requireObraContext, type ObraContext } from "@/lib/obra-auth";
import type { ObraActionState } from "./obra-avance";

export const APU_TIPOS: Array<{ value: ApuTipo; label: string }> = [
  { value: "MATERIAL", label: "Materiales" },
  { value: "MANO_OBRA", label: "Mano de obra" },
  { value: "MAQUINARIA", label: "Maquinaria" },
  { value: "GGASTOS", label: "Gastos generales" },
];

function num(value: unknown): number {
  const texto = String(value ?? "").trim();
  if (!texto) return 0;
  if (texto.includes(",")) return Number(texto.replace(/\./g, "").replace(",", "."));
  return Number(texto);
}

function leer(formData: FormData) {
  return {
    tipo: String(formData.get("tipo") ?? ""),
    descripcion: String(formData.get("descripcion") ?? "").trim(),
    cantidad: num(formData.get("cantidad")),
    precioUnitario: num(formData.get("precioUnitario")),
  };
}

function esTipo(valor: string): valor is ApuTipo {
  return APU_TIPOS.some((tipo) => tipo.value === valor);
}

async function partidaDeObra(ctx: ObraContext, partidaId: string) {
  return db.partida.findFirst({
    where: { id: partidaId, obraId: ctx.obra.id, estado: "VIGENTE" },
    select: { id: true, codigo: true, descripcion: true, cantidad: true },
  });
}

function revalidar() {
  revalidatePath("/obras/presupuesto");
  revalidatePath("/obras/reportes");
  revalidatePath("/obras");
}

/** Alta de una línea de APU. El total se recalcula siempre en el servidor. */
export async function crearApu(
  _prev: ObraActionState,
  formData: FormData,
): Promise<ObraActionState> {
  const ctx = await requireObraContext("presupuesto");
  if (!obraCanWrite(ctx, "presupuesto")) return { error: "Tu rol no permite editar el presupuesto." };

  const partidaId = String(formData.get("partidaId") ?? "");
  const data = leer(formData);
  const partida = await partidaDeObra(ctx, partidaId);
  if (!partida) return { error: "La partida no existe o está anulada." };
  if (!esTipo(data.tipo)) return { error: "Selecciona un tipo de APU válido." };
  if (!data.descripcion) return { error: "Ingresa una descripción." };
  if (!Number.isFinite(data.cantidad) || data.cantidad <= 0) return { error: "Ingresa una cantidad válida." };
  if (!Number.isFinite(data.precioUnitario) || data.precioUnitario < 0) return { error: "Ingresa un precio válido." };

  await db.apu.create({
    data: {
      partidaId,
      tipo: data.tipo,
      descripcion: data.descripcion.slice(0, 300),
      cantidad: data.cantidad,
      precioUnitario: data.precioUnitario,
      total: totalPartida(data.cantidad, data.precioUnitario),
    },
  });
  await recordObraAudit(ctx, {
    action: "CREATE",
    entityType: "Apu",
    entityId: partidaId,
    summary: `Agregó APU de ${data.tipo} a la partida «${partida.descripcion}».`,
  });
  revalidar();
  return { ok: true, message: "Línea de APU agregada." };
}

/** Edita una línea de APU de una partida de la obra activa. */
export async function actualizarApu(
  _prev: ObraActionState,
  formData: FormData,
): Promise<ObraActionState> {
  const ctx = await requireObraContext("presupuesto");
  if (!obraCanWrite(ctx, "presupuesto")) return { error: "Tu rol no permite editar el presupuesto." };

  const id = String(formData.get("id") ?? "");
  const data = leer(formData);
  const apu = await db.apu.findFirst({
    where: { id, partida: { obraId: ctx.obra.id, estado: "VIGENTE" } },
    select: { partidaId: true },
  });
  if (!apu) return { error: "La línea de APU no existe en esta obra." };
  if (!esTipo(data.tipo)) return { error: "Selecciona un tipo de APU válido." };
  if (!data.descripcion) return { error: "Ingresa una descripción." };
  if (!Number.isFinite(data.cantidad) || data.cantidad <= 0) return { error: "Ingresa una cantidad válida." };
  if (!Number.isFinite(data.precioUnitario) || data.precioUnitario < 0) return { error: "Ingresa un precio válido." };

  await db.apu.update({
    where: { id },
    data: {
      tipo: data.tipo,
      descripcion: data.descripcion.slice(0, 300),
      cantidad: data.cantidad,
      precioUnitario: data.precioUnitario,
      total: totalPartida(data.cantidad, data.precioUnitario),
    },
  });
  await recordObraAudit(ctx, {
    action: "UPDATE",
    entityType: "Apu",
    entityId: id,
    summary: "Editó una línea de APU.",
  });
  revalidar();
  return { ok: true, message: "Línea de APU actualizada." };
}

/** Borra una línea de APU. No toca el precio unitario de la partida. */
export async function eliminarApu(formData: FormData): Promise<void> {
  const ctx = await requireObraContext("presupuesto");
  if (!obraCanWrite(ctx, "presupuesto")) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const apu = await db.apu.findFirst({
    where: { id, partida: { obraId: ctx.obra.id } },
    select: { id: true },
  });
  if (!apu) return;
  await db.apu.delete({ where: { id } });
  await recordObraAudit(ctx, {
    action: "DELETE",
    entityType: "Apu",
    entityId: id,
    summary: "Eliminó una línea de APU.",
  });
  revalidar();
}

/**
 * Aplica la suma del APU como precio unitario de la partida. Es explícito:
 * editar el APU no cambia el presupuesto sin que el usuario lo pida.
 */
export async function aplicarApuAPrecio(formData: FormData): Promise<void> {
  const ctx = await requireObraContext("presupuesto");
  if (!obraCanWrite(ctx, "presupuesto")) return;
  const partidaId = String(formData.get("partidaId") ?? "");
  if (!partidaId) return;

  const partida = await partidaDeObra(ctx, partidaId);
  if (!partida) return;
  const lineas = await db.apu.findMany({
    where: { partidaId },
    select: { total: true },
  });
  if (lineas.length === 0) return;
  const precioUnitario = Math.round(lineas.reduce((sum, linea) => sum + linea.total, 0) * 100) / 100;

  await db.partida.update({
    where: { id: partidaId },
    data: {
      precioUnitario,
      total: totalPartida(partida.cantidad, precioUnitario),
    },
  });
  await recordObraAudit(ctx, {
    action: "UPDATE",
    entityType: "Partida",
    entityId: partidaId,
    summary: `Aplicó el APU (${precioUnitario}) como precio unitario de «${partida.descripcion}».`,
  });
  revalidar();
}
