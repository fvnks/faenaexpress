"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { totalPartida } from "@/lib/obra-budget";
import { recordObraAudit } from "@/lib/obra-audit";
import { obraCanWrite, requireObraContext } from "@/lib/obra-auth";
import { crearVersionPresupuesto, snapshotVigente } from "@/lib/obra-versiones";
import type { ObraActionState } from "./obra-avance";

export type PlantillaState = { ok?: boolean; error?: string; message?: string } | undefined;

/** Guarda el itemizado vigente de la obra como plantilla reutilizable. */
export async function guardarPlantillaItemizado(
  _prev: PlantillaState,
  formData: FormData,
): Promise<PlantillaState> {
  const ctx = await requireObraContext("presupuesto");
  if (!obraCanWrite(ctx, "presupuesto")) return { error: "Tu rol no permite editar el presupuesto." };

  const nombre = String(formData.get("nombre") ?? "").trim().slice(0, 120);
  const descripcion = String(formData.get("descripcion") ?? "").trim().slice(0, 500) || null;
  if (nombre.length < 2) return { error: "Ingresa un nombre para la plantilla." };

  const organizationId = ctx.user.orgMembership?.organizationId ?? null;
  const existente = await db.plantillaItemizado.findFirst({ where: { organizationId, nombre } });
  if (existente) return { error: "Ya existe una plantilla con ese nombre." };

  const partidas = await db.partida.findMany({
    where: { obraId: ctx.obra.id, estado: "VIGENTE" },
    orderBy: [{ orden: "asc" }, { codigo: "asc" }],
    select: { codigo: true, descripcion: true, unidad: true, cantidad: true, precioUnitario: true },
  });
  if (partidas.length === 0) return { error: "La obra no tiene partidas vigentes para guardar." };

  await db.plantillaItemizado.create({
    data: {
      organizationId,
      nombre,
      descripcion,
      createdById: ctx.user.id,
      lineas: {
        create: partidas.map((partida, index) => ({
          codigo: partida.codigo.slice(0, 40),
          descripcion: partida.descripcion.slice(0, 300),
          unidad: partida.unidad.slice(0, 10),
          cantidad: partida.cantidad,
          precioUnitario: partida.precioUnitario,
          esCapitulo: partida.cantidad === 0 && partida.precioUnitario === 0,
          orden: index,
        })),
      },
    },
  });

  await recordObraAudit(ctx, {
    action: "CREATE",
    entityType: "PlantillaItemizado",
    summary: `Guardó el presupuesto de «${ctx.obra.name}» como plantilla «${nombre}» (${partidas.length} partidas).`,
  });
  revalidatePath("/obras/plantillas");
  revalidatePath("/obras/presupuesto");
  return { ok: true, message: "Plantilla guardada." };
}

/** Aplica una plantilla a la obra activa, anulando el itemizado anterior por trazabilidad. */
export async function aplicarPlantillaItemizado(
  _prev: PlantillaState,
  formData: FormData,
): Promise<PlantillaState> {
  const ctx = await requireObraContext("presupuesto");
  if (!obraCanWrite(ctx, "presupuesto")) return { error: "Tu rol no permite editar el presupuesto." };

  const plantillaId = String(formData.get("plantillaId") ?? "");
  const organizationId = ctx.user.orgMembership?.organizationId ?? null;
  const plantilla = await db.plantillaItemizado.findFirst({
    where: { id: plantillaId, organizationId },
    include: { lineas: { orderBy: { orden: "asc" } } },
  });
  if (!plantilla) return { error: "La plantilla no existe en tu cuenta." };
  if (plantilla.lineas.length === 0) return { error: "La plantilla no tiene partidas." };

  const fechaVersion = new Date().toISOString().slice(0, 10);
  await db.$transaction(async (tx) => {
    await snapshotVigente(tx, ctx.obra.id, `Anterior a plantilla ${fechaVersion}`, ctx.user.id);
    await tx.partida.updateMany({
      where: { obraId: ctx.obra.id, estado: { not: "ANULADA" } },
      data: { estado: "ANULADA", motivoAnulacion: `Reemplazada por plantilla «${plantilla.nombre}»` },
    });
    const lineas: Array<{
      codigo: string; descripcion: string; unidad: string;
      cantidad: number; precioUnitario: number; total: number;
      esCapitulo: boolean; orden: number;
    }> = [];
    let capituloId: string | null = null;
    let orden = 0;
    for (const [index, linea] of plantilla.lineas.entries()) {
      if (linea.esCapitulo) capituloId = null;
      const ordenActual = orden++;
      const codigo = `${linea.codigo.slice(0, 40)}-${index + 1}`;
      const creada: { id: string } = await tx.partida.create({
        data: {
          obraId: ctx.obra.id,
          parentId: linea.esCapitulo ? null : capituloId,
          codigo,
          descripcion: linea.descripcion.slice(0, 300),
          unidad: linea.unidad.slice(0, 10),
          cantidad: linea.cantidad,
          precioUnitario: linea.precioUnitario,
          total: totalPartida(linea.cantidad, linea.precioUnitario),
          orden: ordenActual,
        },
        select: { id: true },
      });
      if (linea.esCapitulo) capituloId = creada.id;
      lineas.push({
        codigo,
        descripcion: linea.descripcion.slice(0, 300),
        unidad: linea.unidad.slice(0, 10),
        cantidad: linea.cantidad,
        precioUnitario: linea.precioUnitario,
        total: totalPartida(linea.cantidad, linea.precioUnitario),
        esCapitulo: linea.esCapitulo,
        orden: ordenActual,
      });
    }

    await crearVersionPresupuesto(tx, {
      obraId: ctx.obra.id,
      nombre: `Plantilla «${plantilla.nombre}» ${fechaVersion}`,
      descripcion: `${plantilla.lineas.length} partidas aplicadas.`,
      createdById: ctx.user.id,
      partidas: lineas,
    });
  });

  await recordObraAudit(ctx, {
    action: "IMPORT",
    entityType: "Partida",
    entityId: ctx.obra.id,
    summary: `Aplicó la plantilla «${plantilla.nombre}» a «${ctx.obra.name}» (${plantilla.lineas.length} partidas).`,
  });
  revalidatePath("/obras/presupuesto");
  revalidatePath("/obras");
  revalidatePath("/obras/reportes");
  return { ok: true, message: "Plantilla aplicada." };
}

export async function eliminarPlantillaItemizado(formData: FormData): Promise<void> {
  const ctx = await requireObraContext("presupuesto");
  if (!obraCanWrite(ctx, "presupuesto")) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const organizationId = ctx.user.orgMembership?.organizationId ?? null;
  const plantilla = await db.plantillaItemizado.findFirst({
    where: { id, organizationId },
    select: { nombre: true },
  });
  if (!plantilla) return;
  await db.plantillaItemizado.delete({ where: { id } });
  await recordObraAudit(ctx, {
    action: "DELETE",
    entityType: "PlantillaItemizado",
    summary: `Eliminó la plantilla «${plantilla.nombre}».`,
  });
  revalidatePath("/obras/plantillas");
  revalidatePath("/obras/presupuesto");
}
