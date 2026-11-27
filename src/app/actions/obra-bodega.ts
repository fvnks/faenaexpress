"use server";

import { Prisma } from "@/generated/prisma/client";
import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { costoUnitarioEnBodega, getOrCreateDefaultWarehouse, registerMovement } from "@/lib/inventory";
import { formatCLP } from "@/lib/money";
import { recordObraAudit } from "@/lib/obra-audit";
import { obraCanWrite, requireObraContext } from "@/lib/obra-auth";
import type { ObraActionState } from "./obra-avance";

/** Traspasa stock desde la bodega central de la empresa a la bodega de la obra.
 *  El movimiento en Facturas es un TRANSFER real (baja central, entra a la bodega
 *  de obra), y el Kardex de la obra se lleva en `MovimientoBodegaObra`. */
export async function traspasarAObra(
  _prev: ObraActionState,
  formData: FormData,
): Promise<ObraActionState> {
  const ctx = await requireObraContext("bodega");
  if (!obraCanWrite(ctx, "bodega")) return { error: "Tu rol no permite mover stock de la obra." };

  const active = await (await import("@/lib/auth")).getActiveMembership();
  if (!active) return { error: "No tienes empresa activa." };
  const companyId = active.company.id;

  const productId = String(formData.get("productId") ?? "");
  const cantidad = Number(String(formData.get("cantidad") ?? "").replace(",", "."));
  if (!productId || !Number.isFinite(cantidad) || cantidad <= 0) {
    return { error: "Indica producto y cantidad válidos." };
  }

  const central = await getOrCreateDefaultWarehouse(companyId);
  if (!central) return { error: "No hay bodega central configurada." };

  // Bodega destino de la obra: un Warehouse por obra, estable y reutilizable.
  const nombreBodega = `Obra: ${ctx.obra.name}`.slice(0, 80);
  const destino = await db.warehouse.upsert({
    where: { companyId_name: { companyId, name: nombreBodega } },
    create: { companyId, name: nombreBodega, active: true },
    update: {},
  });

  const movimiento = await registerMovement({
    companyId,
    productId,
    type: "TRANSFER",
    date: new Date(),
    quantity: new Prisma.Decimal(cantidad.toFixed(3)),
    warehouseId: central.id,
    toWarehouseId: destino.id,
    reason: "Traspaso a bodega de obra",
    reference: `obra:${ctx.obra.id}:transfer:${Date.now()}`,
    createdById: ctx.user.id,
  });
  if (!movimiento.ok) return { error: movimiento.error ?? "No se pudo traspasar el stock." };

  const bodegaObra = await db.bodegaObra.upsert({
    where: { obraId_productId: { obraId: ctx.obra.id, productId } },
    create: { obraId: ctx.obra.id, productId, cantidad: 0 },
    update: {},
  });
  const unitCost = await costoUnitarioEnBodega(productId, destino.id);
  await db.movimientoBodegaObra.create({
    data: {
      bodegaObraId: bodegaObra.id,
      tipo: "IN",
      cantidad,
      unitCost,
      referencia: `obra:${ctx.obra.id}:transfer:${Date.now()}`,
      createdById: ctx.user.id,
    },
  });
  await db.bodegaObra.update({
    where: { id: bodegaObra.id },
    data: { cantidad: { increment: cantidad } },
  });

  await recordObraAudit(ctx, {
    action: "CREATE",
    entityType: "MovimientoBodegaObra",
    entityId: bodegaObra.id,
    summary: `Traspasó ${cantidad} unidades del producto ${productId} a la bodega de la obra.`,
  });

  revalidatePath("/obras/bodega");
  revalidatePath("/facturas/inventario");
  return { ok: true, message: `${cantidad} unidades traspasadas a la obra.` };
}

/** Consume stock de la bodega de obra e imputa el costo a una partida. */
export async function consumirEnObra(
  _prev: ObraActionState,
  formData: FormData,
): Promise<ObraActionState> {
  const ctx = await requireObraContext("bodega");
  if (!obraCanWrite(ctx, "bodega")) return { error: "Tu rol no permite consumir stock de la obra." };

  const bodegaObraId = String(formData.get("bodegaObraId") ?? "");
  const cantidad = Number(String(formData.get("cantidad") ?? "").replace(",", "."));
  const partidaId = String(formData.get("partidaId") ?? "");
  // Explícito: el material puede estar ya imputado como PURCHASE. Solo se crea
  // un CostoObra WAREHOUSE cuando el usuario así lo decide, para no duplicar.
  const imputarCosto = String(formData.get("imputarCosto") ?? "") === "true";

  const bodega = await db.bodegaObra.findFirst({
    where: { id: bodegaObraId, obraId: ctx.obra.id },
    select: { id: true, cantidad: true, productId: true, product: { select: { name: true } } },
  });
  if (!bodega) return { error: "Producto no encontrado en la bodega de la obra." };
  if (!Number.isFinite(cantidad) || cantidad <= 0) return { error: "Cantidad inválida." };
  if (cantidad > bodega.cantidad) {
    return { error: `Stock insuficiente en la obra (hay ${bodega.cantidad.toFixed(3)}).` };
  }

  const partida = partidaId
    ? await db.partida.findFirst({
        where: { id: partidaId, obraId: ctx.obra.id, estado: "VIGENTE" },
        select: { id: true, descripcion: true },
      })
    : null;

  // Costo de las entradas a la bodega de la obra (promedio ponderado simple).
  const entradas = await db.movimientoBodegaObra.aggregate({
    where: { bodegaObraId: bodega.id, tipo: "IN" },
    _avg: { unitCost: true },
  });
  const unitCost = Math.round(entradas._avg.unitCost ?? 0);

  await db.$transaction(async (tx) => {
    const salida = await tx.movimientoBodegaObra.create({
      data: {
        bodegaObraId: bodega.id,
        tipo: "OUT",
        cantidad,
        unitCost,
        partidaId: partida?.id ?? null,
        createdById: ctx.user.id,
      },
    });
    await tx.bodegaObra.update({
      where: { id: bodega.id },
      data: { cantidad: { decrement: cantidad } },
    });
    if (imputarCosto) {
      await tx.costoObra.upsert({
        where: { sourceType_sourceId: { sourceType: "WAREHOUSE", sourceId: salida.id } },
        create: {
          obraId: ctx.obra.id,
          partidaId: partida?.id ?? null,
          sourceType: "WAREHOUSE",
          sourceId: salida.id,
          descripcion: `Consumo de ${bodega.product.name}`.slice(0, 300),
          monto: Math.round(cantidad * unitCost),
          fecha: new Date(),
        },
        update: { monto: Math.round(cantidad * unitCost), partidaId: partida?.id ?? null },
      });
    }
  });

  await recordObraAudit(ctx, {
    action: "CREATE",
    entityType: "MovimientoBodegaObra",
    entityId: bodega.id,
    summary: `Consumió ${cantidad} × ${bodega.product.name} por ${formatCLP(Math.round(cantidad * unitCost))}${partida ? ` en «${partida.descripcion}»` : ""}.`,
  });

  revalidatePath("/obras/bodega");
  revalidatePath("/obras/presupuesto");
  revalidatePath("/obras/reportes");
  return {
    ok: true,
    message: `${cantidad} × ${bodega.product.name} consumidos${partida ? ` en «${partida.descripcion}»` : ""}.`,
  };
}
