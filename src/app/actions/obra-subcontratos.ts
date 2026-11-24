"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { obraCanWrite, requireObraContext } from "@/lib/obra-auth";
import { totalPartida } from "@/lib/obra-budget";
import type { ObraActionState } from "./obra-avance";

function num(value: unknown): number {
  return Number(String(value ?? "").replace(/\./g, "").replace(",", ".")) || 0;
}

/** Crea un subcontrato con partidas asignadas, anticipo y retención. */
export async function crearSubcontrato(
  _prev: ObraActionState,
  formData: FormData,
): Promise<ObraActionState> {
  const ctx = await requireObraContext("subcontratos");
  if (!obraCanWrite(ctx, "subcontratos")) return { error: "Tu rol no permite crear subcontratos." };

  const partnerId = String(formData.get("partnerId") ?? "");
  const descripcion = String(formData.get("descripcion") ?? "").trim();
  const anticipo = num(formData.get("anticipo"));
  const retencionPct = num(formData.get("retencionPct"));
  const partidasJson = String(formData.get("partidas") ?? "[]");

  const activeMembership = await (await import("@/lib/auth")).getActiveMembership();
  if (!activeMembership) return { error: "No tienes empresa activa." };
  const partner = await db.partner.findFirst({
    where: { id: partnerId, companyId: activeMembership.company.id, active: true },
    select: { id: true, name: true, type: true },
  });
  if (!partner) return { error: "El proveedor no existe o no está activo." };
  if (retencionPct < 0 || retencionPct > 100) return { error: "La retención debe estar entre 0 y 100%." };
  if (anticipo < 0) return { error: "El anticipo no puede ser negativo." };

  let partidas: Array<{ partidaId: string; cantidad: number; precioUnitario: number }> = [];
  try {
    partidas = JSON.parse(partidasJson);
  } catch {
    return { error: "Las partidas asignadas no son válidas." };
  }
  const validas = partidas.filter((p) => p.partidaId && p.cantidad > 0 && p.precioUnitario > 0);
  if (validas.length === 0) return { error: "Asigna al menos una partida válida." };

  const existen = await db.partida.count({
    where: { id: { in: validas.map((p) => p.partidaId) }, obraId: ctx.obra.id, estado: "VIGENTE" },
  });
  if (existen !== validas.length) return { error: "Alguna partida no existe o está anulada." };

  const ultimo = await db.subcontrato.findFirst({
    where: { obraId: ctx.obra.id },
    orderBy: { numero: "desc" },
    select: { numero: true },
  });
  const numero = (ultimo?.numero ?? 0) + 1;
  const total = validas.reduce((s, p) => s + totalPartida(p.cantidad, p.precioUnitario), 0);

  await db.subcontrato.create({
    data: {
      obraId: ctx.obra.id,
      partnerId: partner.id,
      numero,
      descripcion: descripcion || `Subcontrato con ${partner.name}`,
      total,
      anticipo,
      retencionPct,
      createdById: ctx.user.id,
      partidas: {
        create: validas.map((p) => ({
          partidaId: p.partidaId,
          cantidad: p.cantidad,
          precioUnitario: p.precioUnitario,
          total: totalPartida(p.cantidad, p.precioUnitario),
        })),
      },
    },
  });

  revalidatePath("/obras/subcontratos");
  revalidatePath("/obras/presupuesto");
  return { ok: true, message: `SC-${String(numero).padStart(4, "0")} creado con ${validas.length} partidas.` };
}

/** Cambia el estado del subcontrato (terminar/anular). */
export async function cambiarEstadoSubcontrato(formData: FormData): Promise<void> {
  const ctx = await requireObraContext("subcontratos");
  if (!obraCanWrite(ctx, "subcontratos")) return;
  const id = String(formData.get("id") ?? "");
  const estado = String(formData.get("estado") ?? "");
  if (!id || !["VIGENTE", "TERMINADO", "ANULADO"].includes(estado)) return;
  await db.subcontrato.updateMany({
    where: { id, obraId: ctx.obra.id },
    data: { estado },
  });
  revalidatePath("/obras/subcontratos");
}
