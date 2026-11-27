"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { totalPartida } from "@/lib/obra-budget";
import { recordObraAudit } from "@/lib/obra-audit";
import { obraCanWrite, requireObraContext } from "@/lib/obra-auth";
import { snapshotVigente } from "@/lib/obra-versiones";
import type { ObraActionState } from "./obra-avance";

export type VersionState = { ok?: boolean; error?: string; message?: string } | undefined;

/** Congela manualmente el itemizado vigente con un nombre elegido. */
export async function crearVersionManual(
  _prev: VersionState,
  formData: FormData,
): Promise<VersionState> {
  const ctx = await requireObraContext("presupuesto");
  if (!obraCanWrite(ctx, "presupuesto")) return { error: "Tu rol no permite editar el presupuesto." };

  const nombre = String(formData.get("nombre") ?? "").trim().slice(0, 120);
  if (nombre.length < 2) return { error: "Ingresa un nombre para la versión." };

  const version = await db.$transaction(async (tx) =>
    snapshotVigente(tx, ctx.obra.id, nombre, ctx.user.id),
  );
  if (!version) return { error: "La obra no tiene partidas vigentes para versionar." };

  await recordObraAudit(ctx, {
    action: "CREATE",
    entityType: "PresupuestoVersion",
    entityId: version.id,
    summary: `Guardó la versión del presupuesto «${nombre}».`,
  });
  revalidatePath("/obras/presupuesto/versiones");
  revalidatePath("/obras/presupuesto");
  return { ok: true, message: "Versión guardada." };
}

/** Restaura una versión: anula las partidas actuales y recrea las de la versión. */
export async function activarVersionPresupuesto(formData: FormData): Promise<void> {
  const ctx = await requireObraContext("presupuesto");
  if (!obraCanWrite(ctx, "presupuesto")) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const version = await db.presupuestoVersion.findFirst({
    where: { id, obraId: ctx.obra.id },
    include: { partidas: { orderBy: { orden: "asc" } } },
  });
  if (!version || version.partidas.length === 0) return;

  await db.$transaction(async (tx) => {
    await snapshotVigente(tx, ctx.obra.id, `Anterior a «${version.nombre}»`, ctx.user.id);
    await tx.partida.updateMany({
      where: { obraId: ctx.obra.id, estado: { not: "ANULADA" } },
      data: { estado: "ANULADA", motivoAnulacion: `Reemplazada por versión «${version.nombre}»` },
    });
    let capituloId: string | null = null;
    for (const [index, linea] of version.partidas.entries()) {
      if (linea.esCapitulo) capituloId = null;
      const creada: { id: string } = await tx.partida.create({
        data: {
          obraId: ctx.obra.id,
          parentId: linea.esCapitulo ? null : capituloId,
          codigo: `${linea.codigo.slice(0, 40)}-${index + 1}`,
          descripcion: linea.descripcion.slice(0, 300),
          unidad: linea.unidad.slice(0, 10),
          cantidad: linea.cantidad,
          precioUnitario: linea.precioUnitario,
          total: totalPartida(linea.cantidad, linea.precioUnitario),
          orden: index,
        },
        select: { id: true },
      });
      if (linea.esCapitulo) capituloId = creada.id;
    }
    await tx.presupuestoVersion.updateMany({
      where: { obraId: ctx.obra.id, vigente: true },
      data: { vigente: false },
    });
    await tx.presupuestoVersion.update({ where: { id }, data: { vigente: true } });
    await tx.obra.update({ where: { id: ctx.obra.id }, data: { presupuestoVigenteId: id } });
  });

  await recordObraAudit(ctx, {
    action: "UPDATE",
    entityType: "PresupuestoVersion",
    entityId: id,
    summary: `Activó la versión del presupuesto «${version.nombre}».`,
  });
  revalidatePath("/obras/presupuesto/versiones");
  revalidatePath("/obras/presupuesto");
  revalidatePath("/obras/reportes");
}

export async function eliminarVersionPresupuesto(formData: FormData): Promise<void> {
  const ctx = await requireObraContext("presupuesto");
  if (!obraCanWrite(ctx, "presupuesto")) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const version = await db.presupuestoVersion.findFirst({
    where: { id, obraId: ctx.obra.id, vigente: false },
    select: { nombre: true },
  });
  if (!version) return;
  await db.presupuestoVersion.delete({ where: { id } });
  await recordObraAudit(ctx, {
    action: "DELETE",
    entityType: "PresupuestoVersion",
    summary: `Eliminó la versión del presupuesto «${version.nombre}».`,
  });
  revalidatePath("/obras/presupuesto/versiones");
}
