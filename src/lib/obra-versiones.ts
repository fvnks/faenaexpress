// Versiones del presupuesto: los snapshots se escriben dentro de la misma
// transacción que cambia el itemizado, para que nunca quede una versión a medias.

import type { Prisma } from "@/generated/prisma/client";

export type LineaVersion = {
  codigo: string;
  descripcion: string;
  unidad: string;
  cantidad: number;
  precioUnitario: number;
  total: number;
  esCapitulo: boolean;
  orden: number;
};

export async function crearVersionPresupuesto(
  tx: Prisma.TransactionClient,
  input: {
    obraId: string;
    nombre: string;
    descripcion?: string | null;
    createdById: string;
    partidas: LineaVersion[];
  },
): Promise<{ id: string }> {
  const total = input.partidas.reduce((sum, partida) => sum + partida.total, 0);
  const version = await tx.presupuestoVersion.create({
    data: {
      obraId: input.obraId,
      nombre: input.nombre.slice(0, 120),
      descripcion: input.descripcion?.slice(0, 500) ?? null,
      vigente: true,
      total,
      createdById: input.createdById,
      partidas: { create: input.partidas },
    },
    select: { id: true },
  });
  await tx.presupuestoVersion.updateMany({
    where: { obraId: input.obraId, id: { not: version.id }, vigente: true },
    data: { vigente: false },
  });
  await tx.obra.update({
    where: { id: input.obraId },
    data: { presupuestoVigenteId: version.id },
  });
  return version;
}

/** Congela el itemizado vigente actual antes de reemplazarlo. */
export async function snapshotVigente(
  tx: Prisma.TransactionClient,
  obraId: string,
  nombre: string,
  createdById: string,
): Promise<{ id: string } | null> {
  const partidas = await tx.partida.findMany({
    where: { obraId, estado: "VIGENTE" },
    orderBy: [{ orden: "asc" }, { codigo: "asc" }],
    select: {
      codigo: true, descripcion: true, unidad: true,
      cantidad: true, precioUnitario: true, total: true,
    },
  });
  if (partidas.length === 0) return null;

  return crearVersionPresupuesto(tx, {
    obraId,
    nombre,
    descripcion: "Copia automática antes de reemplazar el itemizado.",
    createdById,
    partidas: partidas.map((partida, index) => ({
      codigo: partida.codigo,
      descripcion: partida.descripcion,
      unidad: partida.unidad,
      cantidad: partida.cantidad,
      precioUnitario: partida.precioUnitario,
      total: partida.total,
      esCapitulo: partida.cantidad === 0 && partida.precioUnitario === 0,
      orden: index,
    })),
  });
}
