import type { NotificationType } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { daysBetween, todayDate } from "@/lib/money";

const LOW_STOCK: NotificationType = "LOW_STOCK";
const LOT_EXPIRING: NotificationType = "LOT_EXPIRING";
const DIAS_VENCIMIENTO = 30;

type Alerta = {
  type: NotificationType;
  dedupeKey: string;
  title: string;
  message: string;
  href: string;
};

/**
 * Recalcula las alertas de inventario. Idempotente: conserva las alertas que
 * ya existen (incluido su estado leído) y borra las que dejaron de aplicar.
 */
export async function syncInventoryNotifications(companyId: string): Promise<void> {
  const [stocks, products, lots] = await Promise.all([
    db.productStock.groupBy({
      by: ["productId"],
      where: { companyId },
      _sum: { quantity: true },
    }),
    db.product.findMany({
      where: {
        companyId,
        active: true,
        tracksStock: true,
        OR: [{ reorderPoint: { not: null } }, { minStock: { not: null } }],
      },
      select: {
        id: true,
        name: true,
        sku: true,
        reorderPoint: true,
        minStock: true,
        reorderQty: true,
        leadTimeDays: true,
        supplier: { select: { name: true } },
      },
    }),
    db.productLot.findMany({
      where: { companyId, expirationDate: { not: null }, quantity: { gt: 0 } },
      select: {
        id: true,
        code: true,
        expirationDate: true,
        quantity: true,
        product: { select: { id: true, name: true } },
      },
    }),
  ]);

  const totalPorProducto = new Map(
    stocks.map((s) => [s.productId, Number(s._sum.quantity ?? 0)]),
  );
  const hoy = todayDate();
  const alertas: Alerta[] = [];

  for (const producto of products) {
    const umbral = producto.reorderPoint ?? producto.minStock;
    if (!umbral) continue;
    const hay = totalPorProducto.get(producto.id) ?? 0;
    if (hay > Number(umbral)) continue;
    const sugerido = producto.reorderQty
      ? Number(producto.reorderQty)
      : Math.max(1, Math.round(Number(umbral) * 2 - hay));
    const lead = producto.leadTimeDays ? ` · plazo ${producto.leadTimeDays} días` : "";
    const proveedor = producto.supplier ? ` · Proveedor: ${producto.supplier.name}` : "";
    alertas.push({
      type: LOW_STOCK,
      dedupeKey: `${LOW_STOCK}:${producto.id}`,
      title: `Stock bajo: ${producto.name}`,
      message: `Quedan ${hay.toFixed(3)} (punto de reorden ${Number(umbral).toFixed(3)}). Reponer ${sugerido}${lead}${proveedor}.`,
      href: `/facturas/inventario/reorden?producto=${producto.id}`,
    });
  }

  for (const lote of lots) {
    if (!lote.expirationDate) continue;
    const dias = daysBetween(hoy, lote.expirationDate);
    if (dias > DIAS_VENCIMIENTO) continue;
    const vencido = dias < 0;
    alertas.push({
      type: LOT_EXPIRING,
      dedupeKey: `${LOT_EXPIRING}:${lote.id}`,
      title: vencido ? `Lote vencido: ${lote.code}` : `Lote por vencer: ${lote.code}`,
      message: `${lote.product.name} · ${Number(lote.quantity).toFixed(3)} uds · vence el ${lote.expirationDate.toISOString().slice(0, 10)}.`,
      href: "/facturas/inventario/lotes",
    });
  }

  await Promise.all(
    alertas.map((alerta) =>
      db.notification.upsert({
        where: { companyId_dedupeKey: { companyId, dedupeKey: alerta.dedupeKey } },
        create: {
          companyId,
          type: alerta.type,
          dedupeKey: alerta.dedupeKey,
          title: alerta.title,
          message: alerta.message,
          href: alerta.href,
        },
        update: {
          title: alerta.title,
          message: alerta.message,
          href: alerta.href,
        },
      }),
    ),
  );

  await db.notification.deleteMany({
    where: {
      companyId,
      type: { in: [LOW_STOCK, LOT_EXPIRING] },
      ...(alertas.length > 0
        ? { dedupeKey: { notIn: alertas.map((a) => a.dedupeKey) } }
        : {}),
    },
  });
}
