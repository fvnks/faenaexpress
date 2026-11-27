// Puente entre Facturas y Obras: una compra o un gasto se imputan a una obra al
// guardarse y su CostoObra se mantiene en la MISMA transacción. Así la imputación
// automática (desde el formulario) y la manual (desde /obras) usan una sola
// regla: `sourceType + sourceId` es UNIQUE en CostoObra, nunca se cuenta dos veces.

import type { Prisma } from "@/generated/prisma/client";

import { getCurrentUser } from "@/lib/auth";
import { enabledModules } from "@/lib/modules";
import { visibleObras } from "@/lib/obra-auth";

export type ObraParaFormulario = { id: string; name: string };

/** Obras que el usuario puede elegir al imputar. Respeta módulo contratado y membresía. */
export async function obrasImputables(): Promise<ObraParaFormulario[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const modulos = await enabledModules(user.id);
  if (!modulos.some((modulo) => modulo.code === "obras")) return [];
  const obras = await visibleObras(user);
  return obras.map((obra) => ({ id: obra.id, name: obra.name }));
}

/** Un POST directo no puede imputar a una obra que el usuario no ve. */
export async function obraEsImputable(obraId: string): Promise<boolean> {
  if (!obraId) return false;
  return (await obrasImputables()).some((obra) => obra.id === obraId);
}

export type SincronizarCostoObra = {
  sourceType: "PURCHASE" | "EXPENSE";
  sourceId: string;
  obraId: string | null;
  /** false cuando el formulario no ofrecía obras: no se toca lo ya imputado. */
  habilitado: boolean;
  monto: number;
  fecha: Date;
  descripcion: string;
};

/**
 * Crea, actualiza o retira el CostoObra de un documento. Se llama DENTRO de la
 * transacción que guarda la compra o el gasto. Al actualizar se conserva la
 * partida que ya tuviera (imputación manual fina); al quitar la obra se borra
 * el costo para que deje de contar en el presupuesto.
 */
export async function sincronizarCostoObra(
  tx: Prisma.TransactionClient,
  input: SincronizarCostoObra,
): Promise<void> {
  if (!input.habilitado) return;

  const where = {
    sourceType_sourceId: { sourceType: input.sourceType, sourceId: input.sourceId },
  };
  const descripcion = input.descripcion.trim().slice(0, 300);

  if (!input.obraId) {
    await tx.costoObra.deleteMany({
      where: { sourceType: input.sourceType, sourceId: input.sourceId },
    });
    return;
  }

  await tx.costoObra.upsert({
    where,
    create: {
      obraId: input.obraId,
      partidaId: null,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      descripcion,
      monto: input.monto,
      fecha: input.fecha,
    },
    update: {
      obraId: input.obraId,
      descripcion,
      monto: input.monto,
      fecha: input.fecha,
    },
  });
}

/** Descripción estable para el costo real, igual que en la imputación manual. */
export function descripcionCompra(documentNumber: string | null, proveedor: string): string {
  return `Compra ${documentNumber ?? ""} · ${proveedor}`.trim();
}

export function descripcionGasto(descripcion: string): string {
  return `Gasto · ${descripcion}`.slice(0, 300);
}
