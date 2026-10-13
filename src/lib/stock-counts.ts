import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { getOrCreateDefaultWarehouse, registerMovement } from "@/lib/inventory";

// ---------------------------------------------------------------------------
// Conteo físico (inventario cíclico)
//
// Flujo: se abre un conteo sobre una bodega, se captura la cantidad contada por
// producto y al cerrarlo se generan los ajustes. El ajuste se calcula contra el
// saldo VIGENTE al cierre (no contra el snapshot), para que el stock quede
// exactamente en lo contado aunque hayan habido movimientos intermedios.
// ---------------------------------------------------------------------------

export type StockCountSummary = {
  id: string;
  code: string;
  date: Date;
  notes: string | null;
  status: "OPEN" | "CLOSED";
  warehouseName: string;
  createdByName: string;
  totalItems: number;
  countedItems: number;
  diffItems: number;
};

export async function listStockCounts(companyId: string, limit = 100): Promise<StockCountSummary[]> {
  const counts = await db.stockCount.findMany({
    where: { companyId },
    include: {
      warehouse: true,
      createdBy: { select: { name: true } },
      items: true,
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: limit,
  });

  return counts.map((c) => ({
    id: c.id,
    code: c.code,
    date: c.date,
    notes: c.notes,
    status: c.status,
    warehouseName: c.warehouse?.name ?? "—",
    createdByName: c.createdBy.name,
    totalItems: c.items.length,
    countedItems: c.items.filter((i) => i.countedQuantity !== null).length,
    // Items cuyo conteo difiere del snapshot del momento de abrir.
    diffItems: c.items.filter(
      (i) => i.countedQuantity !== null && !i.countedQuantity.eq(i.systemQuantity),
    ).length,
  }));
}

export async function getStockCount(companyId: string, countId: string) {
  return db.stockCount.findFirst({
    where: { id: countId, companyId },
    include: {
      warehouse: true,
      createdBy: { select: { name: true } },
      items: {
        include: { product: { include: { unit: true } } },
        orderBy: { product: { name: "asc" } },
      },
    },
  });
}

// CCT-0001, CCT-0002…
async function nextStockCountCode(companyId: string): Promise<string> {
  const last = await db.stockCount.findFirst({
    where: { companyId },
    orderBy: { code: "desc" },
    select: { code: true },
  });
  if (!last?.code) return "CCT-0001";
  const match = last.code.match(/(\d+)$/);
  const num = match ? Number(match[1]) + 1 : 1;
  return `CCT-${String(num).padStart(4, "0")}`;
}

export type CreateStockCountInput = {
  companyId: string;
  warehouseId?: string | null;
  date: Date;
  notes?: string | null;
  createdById: string;
};

export type StockCountResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

// Abre un conteo: snapshot del saldo de todos los productos con stock activo en
// la bodega. Los productos ya nacen con "contado" en null.
export async function createStockCount(input: CreateStockCountInput): Promise<StockCountResult> {
  const { companyId, createdById } = input;

  return db.$transaction(async (tx) => {
    const warehouse = input.warehouseId
      ? await tx.warehouse.findFirst({
          where: { id: input.warehouseId, companyId, active: true },
          select: { id: true },
        })
      : await getOrCreateDefaultWarehouse(companyId, tx);
    if (!warehouse) return { ok: false, error: "Bodega no encontrada." };

    const products = await tx.product.findMany({
      where: { companyId, active: true, stocks: { some: { warehouseId: warehouse.id } } },
      select: {
        id: true,
        stocks: { where: { warehouseId: warehouse.id }, select: { quantity: true } },
      },
      orderBy: { name: "asc" },
    });

    // Incluye también los productos sin fila de saldo en esa bodega, para que
    // se puedan detectar existencias que el sistema no registra.
    const zeroProducts = await tx.product.findMany({
      where: {
        companyId,
        active: true,
        tracksStock: true,
        stocks: { none: { warehouseId: warehouse.id } },
      },
      select: { id: true },
      orderBy: { name: "asc" },
    });

    const items = [
      ...products.map((p) => ({
        productId: p.id,
        systemQuantity: p.stocks[0]?.quantity ?? new Prisma.Decimal(0),
      })),
      ...zeroProducts.map((p) => ({
        productId: p.id,
        systemQuantity: new Prisma.Decimal(0),
      })),
    ];

    const count = await tx.stockCount.create({
      data: {
        companyId,
        warehouseId: warehouse.id,
        code: await nextStockCountCode(companyId),
        date: input.date,
        notes: input.notes ?? null,
        createdById,
        items: { create: items },
      },
      select: { id: true },
    });

    return { ok: true, id: count.id };
    // El snapshot toca varias tablas; en la primera petición de dev la
    // compilación lo frena y los valores por defecto (5 s / 2 s) no alcanzan.
  }, { timeout: 30_000, maxWait: 15_000 });
}

// Guarda la cantidad contada de un item. Solo mientras el conteo está abierto.
export async function saveCountedQuantity(
  companyId: string,
  itemId: string,
  counted: number | null,
): Promise<StockCountResult> {
  if (counted !== null && (!Number.isFinite(counted) || counted < 0)) {
    return { ok: false, error: "La cantidad contada no puede ser negativa." };
  }

  const item = await db.stockCountItem.findFirst({
    where: { id: itemId, stockCount: { companyId } },
    include: { stockCount: { select: { status: true } } },
  });
  if (!item) return { ok: false, error: "Item no encontrado." };
  if (item.stockCount.status !== "OPEN") {
    return { ok: false, error: "El conteo ya está cerrado." };
  }

  await db.stockCountItem.update({
    where: { id: itemId },
    data: {
      countedQuantity: counted === null ? null : new Prisma.Decimal(counted.toFixed(3)),
    },
  });
  return { ok: true, id: itemId };
}

export type CloseSummary = {
  adjustments: number;
  increases: number;
  decreases: number;
  skipped: number;
};

export type CloseStockCountResult =
  | { ok: true; summary: CloseSummary }
  | { ok: false; error: string };

// Cierra el conteo y genera los ajustes. Un solo producto falla => nada se
// aplica, para no dejar el kardex a medias.
export async function closeStockCount(
  companyId: string,
  countId: string,
  createdById: string,
): Promise<CloseStockCountResult> {
  return db.$transaction(async (tx) => {
    const count = await tx.stockCount.findFirst({
      where: { id: countId, companyId },
      include: { items: true },
    });
    if (!count) return { ok: false, error: "Conteo no encontrado." };
    if (count.status !== "OPEN") return { ok: false, error: "El conteo ya está cerrado." };
    if (!count.warehouseId) return { ok: false, error: "El conteo no tiene bodega." };

    const pending = count.items.filter((i) => i.countedQuantity !== null);
    if (pending.length === 0) {
      return { ok: false, error: "No hay productos contados para cerrar." };
    }

    const summary: CloseSummary = {
      adjustments: 0,
      increases: 0,
      decreases: 0,
      skipped: count.items.length - pending.length,
    };

    for (const item of pending) {
      const counted = item.countedQuantity!;
      // El ajuste lleva el saldo vigente a lo contado.
      const stock = await tx.productStock.findUnique({
        where: {
          productId_warehouseId: {
            productId: item.productId,
            warehouseId: count.warehouseId,
          },
        },
        select: { quantity: true },
      });
      const current = stock?.quantity ?? new Prisma.Decimal(0);
      const diff = counted.minus(current);
      if (diff.isZero()) continue;

      const type = diff.isNegative() ? "ADJUST_OUT" : "ADJUST_IN";
      const result = await registerMovement(
        {
          companyId,
          productId: item.productId,
          type,
          date: count.date,
          quantity: diff.abs(),
          warehouseId: count.warehouseId,
          reason: `Conteo físico ${count.code}`,
          reference: count.code,
          notes: item.notes,
          createdById,
        },
        tx,
      );
      if (!result.ok) return { ok: false, error: result.error };

      await tx.stockCountItem.update({
        where: { id: item.id },
        data: { movementId: result.movementId },
      });

      summary.adjustments += 1;
      if (type === "ADJUST_IN") summary.increases += 1;
      else summary.decreases += 1;
    }

    await tx.stockCount.update({
      where: { id: countId },
      data: { status: "CLOSED" },
    });

    return { ok: true, summary };
    // Cerrar genera un ajuste por producto: puede ser largo en dev.
  }, { timeout: 60_000, maxWait: 15_000 });
}
