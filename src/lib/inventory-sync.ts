import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { getOrCreateDefaultWarehouse, registerMovement } from "@/lib/inventory";
import { reverseStockMovement } from "@/lib/inventory-reversal";

export type InventorySyncResult = { ok: boolean; errors: string[] };

/**
 * Revierte los movimientos de stock de un documento.
 *
 * Las ventas (y las compras) que mueven stock generan movimientos con una
 * referencia `sale:<id>:item:<itemId>`. Si el documento se anula, esos
 * movimientos tienen que revertirse: si no, el stock queda distinto de la
 * realidad y el inventario miente.
 *
 * La reversión es idempotente: `reverseStockMovement` no revierte dos veces el
 * mismo movimiento.
 */
export async function reverseStockForDocument(input: {
  companyId: string;
  documentType: "sale" | "purchase";
  documentId: string;
  createdById: string;
}): Promise<{ reverted: number; errors: string[] }> {
  const prefijo = `${input.documentType}:${input.documentId}:item:`;

  const movimientos = await db.stockMovement.findMany({
    where: { companyId: input.companyId, reference: { startsWith: prefijo } },
    select: { id: true },
  });

  const errors: string[] = [];
  let reverted = 0;
  for (const movimiento of movimientos) {
    const result = await reverseStockMovement(
      input.companyId,
      movimiento.id,
      input.createdById,
    );
    if (result.ok) reverted += 1;
    else if (!result.error?.includes("ya fue revertido")) {
      errors.push(result.error ?? "No se pudo revertir el movimiento.");
    }
  }

  return { reverted, errors };
}

export async function syncPurchaseItemsToInventory(input: {
  companyId: string;
  purchaseId: string;
  date: Date;
  createdById: string;
  /** Por qué se genera el movimiento: la compra llega importada o se registró a mano. */
  reason?: string;
}): Promise<InventorySyncResult> {
  const errors: string[] = [];
  const items = await db.purchaseItem.findMany({
    where: { purchaseId: input.purchaseId, companyId: input.companyId },
    include: { product: { select: { id: true, name: true, tracksStock: true } } },
  });
  const warehouse = await getOrCreateDefaultWarehouse(input.companyId);

  for (const item of items) {
    if (!item.productId || !item.product?.tracksStock) continue;
    const quantity = Number(item.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) continue;

    const reference = `purchase:${input.purchaseId}:item:${item.id}`;
    const existing = await db.stockMovement.findFirst({
      where: { companyId: input.companyId, reference },
      select: { id: true },
    });
    if (existing) continue;

    const result = await registerMovement({
      companyId: input.companyId,
      productId: item.productId,
      type: "IN",
      date: input.date,
      quantity: new Prisma.Decimal(quantity.toFixed(3)),
      unitCost: item.unitPrice,
      warehouseId: warehouse.id,
      reason: input.reason ?? "Compra importada desde DTE",
      reference,
      notes: item.name,
      createdById: input.createdById,
    });
    if (!result.ok) {
      errors.push(`${item.product?.name ?? item.name}: ${result.error}`);
    }
  }

  return { ok: errors.length === 0, errors };
}

export async function syncSaleItemsToInventory(input: {
  companyId: string;
  saleId: string;
  date: Date;
  createdById: string;
  /** Por qué se genera el movimiento: la venta llega importada o se registró a mano. */
  reason?: string;
}): Promise<InventorySyncResult> {
  const errors: string[] = [];
  const items = await db.saleItem.findMany({
    where: { saleId: input.saleId, companyId: input.companyId },
    include: { product: { select: { id: true, name: true, tracksStock: true } } },
  });
  const warehouse = await getOrCreateDefaultWarehouse(input.companyId);

  for (const item of items) {
    if (!item.productId || !item.product?.tracksStock) continue;
    const quantity = Number(item.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) continue;

    const reference = `sale:${input.saleId}:item:${item.id}`;
    const existing = await db.stockMovement.findFirst({
      where: { companyId: input.companyId, reference },
      select: { id: true },
    });
    if (existing) continue;

    const result = await registerMovement({
      companyId: input.companyId,
      productId: item.productId,
      type: "OUT",
      date: input.date,
      quantity: new Prisma.Decimal(quantity.toFixed(3)),
      unitCost: null,
      warehouseId: warehouse.id,
      reason: input.reason ?? "Venta importada desde DTE",
      reference,
      notes: item.name,
      createdById: input.createdById,
    });
    if (!result.ok) {
      errors.push(`${item.product?.name ?? item.name}: ${result.error}`);
    }
  }

  return { ok: errors.length === 0, errors };
}