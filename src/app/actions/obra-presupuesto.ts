"use server";

import { revalidatePath } from "next/cache";

import { recordAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { recordObraAudit } from "@/lib/obra-audit";
import { getActiveMembership } from "@/lib/auth";
import { requireObraContext, obraCanWrite } from "@/lib/obra-auth";
import { previewPresupuesto, type FilaPresupuesto, type PreviewPresupuesto } from "@/lib/obra-import";
import { totalPartida } from "@/lib/obra-budget";

export type PresupuestoPreviewState = PreviewPresupuesto | { error: string } | undefined;
export type PresupuestoCommitState = { ok?: boolean; error?: string; creadas?: number } | undefined;

/** Paso 1: lee el Excel y devuelve las filas para revisar, sin escribir nada. */
export async function previewObraPresupuesto(
  _prev: PresupuestoPreviewState,
  formData: FormData,
): Promise<PresupuestoPreviewState> {
  const ctx = await requireObraContext("presupuesto");
  if (!obraCanWrite(ctx, "presupuesto")) return { error: "Tu rol no permite editar el presupuesto." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Selecciona un archivo Excel o CSV." };

  try {
    return await previewPresupuesto(file);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "No se pudo leer el archivo." };
  }
}

/** Paso 2: guarda las filas revisadas. Reemplaza el itemizado vigente de la obra. */
export async function confirmObraPresupuesto(
  _prev: PresupuestoCommitState,
  formData: FormData,
): Promise<PresupuestoCommitState> {
  const ctx = await requireObraContext("presupuesto");
  if (!obraCanWrite(ctx, "presupuesto")) return { error: "Tu rol no permite editar el presupuesto." };

  let filas: FilaPresupuesto[];
  try {
    const payload = String(formData.get("payload") ?? "");
    filas = JSON.parse(payload) as FilaPresupuesto[];
    if (!Array.isArray(filas) || filas.length === 0) return { error: "No hay filas para guardar." };
    if (filas.some((f) => f.error)) return { error: "Hay filas con errores; corrígelas antes de guardar." };
  } catch {
    return { error: "Los datos del presupuesto no son válidos." };
  }

  const resultado = await db.$transaction(async (tx) => {
    // Conservar las anuladas por trazabilidad; el resto se reemplaza.
    await tx.partida.updateMany({
      where: { obraId: ctx.obra.id, estado: { not: "ANULADA" } },
      data: { estado: "ANULADA", motivoAnulacion: "Reemplazada por nueva importación" },
    });

    const codigoPorFila = new Map<number, string>();
    let orden = 0;
    let capituloId: string | null = null;

    for (const fila of filas) {
      const codigo = (fila.codigo || `P-${String(fila.fila).padStart(4, "0")}`).slice(0, 40);
      const esCapitulo = fila.esCapitulo;
      if (esCapitulo) capituloId = null;

      const creada: { id: string } = await tx.partida.create({
        data: {
          obraId: ctx.obra.id,
          parentId: esCapitulo ? null : capituloId,
          codigo: `${codigo}-${fila.fila}`, // el código original puede repetirse entre capítulos
          descripcion: fila.descripcion.slice(0, 300),
          unidad: (fila.unidad || "UN").slice(0, 10),
          cantidad: fila.cantidad,
          precioUnitario: fila.precioUnitario,
          total: totalPartida(fila.cantidad, fila.precioUnitario),
          orden: orden++,
        },
        select: { id: true },
      });
      codigoPorFila.set(fila.fila, creada.id);
      if (esCapitulo) capituloId = creada.id;
    }

    return { creadas: filas.length, codigoPorFila };
  });

  const membership = await getActiveMembership();
  if (membership) {
    await recordAudit(
      { company: { id: membership.company.id }, user: { id: ctx.user.id, name: ctx.user.name } },
      {
        action: "IMPORT",
        entityType: "Partida",
        entityId: ctx.obra.id,
        summary: `Importó el presupuesto de «${ctx.obra.name}»: ${resultado.creadas} partidas.`,
      },
    );
  }

  revalidatePath("/obras/presupuesto");
  revalidatePath("/obras");
  return { ok: true, creadas: resultado.creadas };
}

/** Alta manual de una partida (para ajustes chicos sin Excel). */
export async function crearPartidaObra(
  _prev: { ok?: boolean; error?: string } | undefined,
  formData: FormData,
): Promise<{ ok?: boolean; error?: string } | undefined> {
  const ctx = await requireObraContext("presupuesto");
  if (!obraCanWrite(ctx, "presupuesto")) return { error: "Tu rol no permite editar el presupuesto." };

  const codigo = String(formData.get("codigo") ?? "").trim().slice(0, 40);
  const descripcion = String(formData.get("descripcion") ?? "").trim().slice(0, 300);
  const unidad = String(formData.get("unidad") ?? "UN").trim().slice(0, 10) || "UN";
  const cantidad = Number(String(formData.get("cantidad") ?? "").replace(",", "."));
  const precioUnitario = Number(String(formData.get("precioUnitario") ?? "").replace(/\./g, "").replace(",", "."));
  const parentId = String(formData.get("parentId") ?? "") || null;

  if (!descripcion || !Number.isFinite(cantidad) || cantidad < 0 || !Number.isFinite(precioUnitario) || precioUnitario < 0) {
    return { error: "Revisa la descripción, la cantidad y el precio unitario." };
  }

  const codigoFinal = codigo || `P-${Date.now().toString().slice(-6)}`;
  try {
    await db.partida.create({
      data: {
        obraId: ctx.obra.id,
        parentId,
        codigo: codigoFinal,
        descripcion,
        unidad,
        cantidad,
        precioUnitario,
        total: totalPartida(cantidad, precioUnitario),
        orden: await db.partida.count({ where: { obraId: ctx.obra.id } }),
      },
    });
  } catch (error) {
    // El código es único por obra: si choca, lo hacemos único con un sufijo.
    if (error instanceof Error && error.message.includes("Unique")) {
      await db.partida.create({
        data: {
          obraId: ctx.obra.id,
          parentId,
          codigo: `${codigoFinal}-${Date.now().toString().slice(-4)}`,
          descripcion,
          unidad,
          cantidad,
          precioUnitario,
          total: totalPartida(cantidad, precioUnitario),
        },
      });
    } else {
      return { error: "No se pudo guardar la partida." };
    }
  }

  await recordObraAudit(ctx, {
    action: "CREATE",
    entityType: "Partida",
    summary: `Agregó la partida «${descripcion}» (${codigoFinal}) al presupuesto.`,
  });

  revalidatePath("/obras/presupuesto");
  return { ok: true };
}
