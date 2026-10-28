"use server";

import { redirect } from "next/navigation";

import { recordAudit } from "@/lib/audit";
import { canWrite, requireContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { setFlash } from "@/lib/flash";
import { formatCLP } from "@/lib/money";
import { revalidatePath } from "next/cache";

export type PosKdsActionState =
  | { error?: string; ok?: boolean }
  | undefined;

export type KdsStatus = "PENDING" | "PREPARING" | "READY" | "SERVED" | "CANCELLED";
export type KdsItemStatus = "PENDING" | "PREPARING" | "READY" | "CANCELLED";

export type KdsOrderSummary = {
  id: string;
  orderNumber: string | null;
  tableNumber: string | null;
  customerName: string | null;
  status: KdsStatus;
  notes: string | null;
  createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  items: Array<{
    id: string;
    productName: string;
    quantity: number;
    unitPrice: number | null;
    notes: string | null;
    status: KdsItemStatus;
  }>;
};

/**
 * Crea una orden de cocina desde una venta POS existente.
 * Se usa cuando una venta con platos de cocina se registra en el POS.
 */
export async function createKdsOrderFromSale(
  saleId: string,
): Promise<PosKdsActionState> {
  const ctx = await requireContext();
  if (!canWrite(ctx, "ventas")) {
    return { error: "No tienes permiso para crear órdenes de cocina." };
  }

  const sale = await db.posSale.findFirst({
    where: { id: saleId, companyId: ctx.company.id },
    include: { items: true, partner: true },
  });
  if (!sale) return { error: "La venta no existe." };

  // Verificar que no exista ya una orden de cocina para esta venta
  const existing = await db.posKdsOrder.findFirst({
    where: { saleId, companyId: ctx.company.id },
  });
  if (existing) return { error: "Esta venta ya tiene una orden de cocina." };

  const orderNumber = await nextKdsOrderNumber(ctx.company.id);

  try {
    const order = await db.posKdsOrder.create({
      data: {
        companyId: ctx.company.id,
        saleId,
        tableNumber: null,
        customerName: sale.partner?.name ?? null,
        status: "PENDING",
        notes: sale.notes ?? null,
        items: {
          create: sale.items.map((item) => ({
            productId: item.productId,
            productName: item.name,
            quantity: Number(item.quantity.toString()),
            unitPrice: item.unitPrice ?? null,
            notes: null,
            status: "PENDING",
          })),
        },
      },
    });

    await recordAudit(ctx, {
      action: "CREATE",
      entityType: "PosKdsOrder",
      entityId: order.id,
      summary: `Creó orden de cocina #${orderNumber} para la venta ${sale.saleNumber}.`,
    });

    revalidatePath("/pos/kds");
    revalidatePath(`/pos/ventas/${saleId}`);

    return { ok: true };
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "No se pudo crear la orden de cocina.";
    return { error: message };
  }
}

/**
 * Crea una orden de cocina directamente (sin venta POS asociada).
 * Se usa cuando el mesero toma un pedido directamente en cocina.
 */
export async function createKdsOrder(
  _prev: PosKdsActionState,
  formData: FormData,
): Promise<PosKdsActionState> {
  const ctx = await requireContext();
  if (!canWrite(ctx, "ventas")) {
    return { error: "No tienes permiso para crear órdenes de cocina." };
  }

  const tableNumber = String(formData.get("tableNumber") ?? "").trim() || null;
  const customerName = String(formData.get("customerName") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  // Los ítems vienen como JSON en un campo "items"
  const itemsRaw = String(formData.get("items") ?? "[]");
  let items: Array<{ productName: string; quantity: number; unitPrice?: number; notes?: string }>;
  try {
    items = JSON.parse(itemsRaw);
  } catch {
    return { error: "No se pudieron leer los ítems de la orden." };
  }

  if (!items || items.length === 0) {
    return { error: "Debe agregar al menos un ítem a la orden." };
  }

  const orderNumber = await nextKdsOrderNumber(ctx.company.id);

  try {
    const order = await db.posKdsOrder.create({
      data: {
        companyId: ctx.company.id,
        saleId: null,
        tableNumber,
        customerName,
        status: "PENDING",
        notes,
        items: {
          create: items.map((item) => ({
            productId: null,
            productName: item.productName,
            quantity: item.quantity,
            unitPrice: item.unitPrice ?? null,
            notes: item.notes ?? null,
            status: "PENDING",
          })),
        },
      },
    });

    await recordAudit(ctx, {
      action: "CREATE",
      entityType: "PosKdsOrder",
      entityId: order.id,
      summary: `Creó orden de cocina #${orderNumber}${tableNumber ? ` (mesa ${tableNumber})` : ""}.`,
    });

    revalidatePath("/pos/kds");
    return { ok: true };
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "No se pudo crear la orden de cocina.";
    return { error: message };
  }
}

/**
 * Cambia el estado de una orden de cocina completa.
 * Solo supervisor o personal de cocina.
 */
export async function updateKdsOrderStatus(
  orderId: string,
  status: "PENDING" | "PREPARING" | "READY" | "SERVED" | "CANCELLED",
): Promise<PosKdsActionState> {
  const ctx = await requireContext();
  if (!canWrite(ctx, "ventas")) {
    return { error: "No tienes permiso para cambiar el estado de la orden." };
  }

  const order = await db.posKdsOrder.findFirst({
    where: { id: orderId, companyId: ctx.company.id },
    include: { items: true },
  });
  if (!order) return { error: "La orden no existe." };

  const now = new Date();
  try {
    await db.posKdsOrder.update({
      where: { id: orderId },
      data: {
        status,
        startedAt: status === "PREPARING" && !order.startedAt ? now : order.startedAt,
        completedAt: status === "SERVED" ? now : order.completedAt,
      },
    });

    // Actualizar todos los ítems al mismo estado (excepto los ya cancelados)
    // Cuando la orden pasa a READY o SERVED, los ítems pasan a READY
    const itemStatus = status === "READY" || status === "SERVED" ? "READY" : status;
    await db.posKdsOrderItem.updateMany({
      where: { orderId, status: { not: "CANCELLED" } },
      data: { status: itemStatus },
    });

    await recordAudit(ctx, {
      action: "UPDATE",
      entityType: "PosKdsOrder",
      entityId: orderId,
      summary: `Cambió estado de orden ${orderId.slice(0, 8)} a ${status}.`,
    });

    revalidatePath("/pos/kds");
    return { ok: true };
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "No se pudo cambiar el estado de la orden.";
    return { error: message };
  }
}

/**
 * Cambia el estado de un ítem individual de una orden de cocina.
 */
export async function updateKdsItemStatus(
  itemId: string,
  status: "PENDING" | "PREPARING" | "READY" | "CANCELLED",
): Promise<PosKdsActionState> {
  const ctx = await requireContext();
  if (!canWrite(ctx, "ventas")) {
    return { error: "No tienes permiso para cambiar el estado del ítem." };
  }

  const item = await db.posKdsOrderItem.findFirst({
    where: { id: itemId },
    include: { order: { include: { sale: { select: { saleNumber: true } } } } },
  });
  if (!item) return { error: "El ítem no existe." };
  if (item.order.companyId !== ctx.company.id) {
    return { error: "No tienes permiso para modificar este ítem." };
  }

  try {
    await db.posKdsOrderItem.update({
      where: { id: itemId },
      data: { status },
    });

    await recordAudit(ctx, {
      action: "UPDATE",
      entityType: "PosKdsOrderItem",
      entityId: itemId,
      summary: `Cambió estado de ítem «${item.productName}» (orden ${item.order.id.slice(0, 8)}) a ${status}.`,
    });

    revalidatePath("/pos/kds");
    return { ok: true };
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "No se pudo cambiar el estado del ítem.";
    return { error: message };
  }
}

/**
 * Wrapper para usar como Server Action desde un form.
 */
export async function createKdsOrderAction(
  _prev: PosKdsActionState,
  formData: FormData,
): Promise<PosKdsActionState> {
  return createKdsOrder(_prev, formData);
}

/**
 * Server Action: listar órdenes de cocina pendientes y en preparación.
 * Obtiene el companyId automáticamente del contexto de sesión.
 */
export async function listPosKdsOrdersAction(): Promise<KdsOrderSummary[]> {
  const ctx = await requireContext();
  const orders = await db.posKdsOrder.findMany({
    where: {
      companyId: ctx.company.id,
      status: { in: ["PENDING", "PREPARING"] },
    },
    include: {
      items: { orderBy: { id: "asc" } },
      sale: { select: { saleNumber: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return orders.map((o) => ({
    id: o.id,
    orderNumber: o.sale?.saleNumber ?? null,
    tableNumber: o.tableNumber,
    customerName: o.customerName,
    status: o.status as KdsStatus,
    notes: o.notes,
    createdAt: o.createdAt,
    startedAt: o.startedAt,
    completedAt: o.completedAt,
    items: o.items.map((i) => ({
      id: i.id,
      productName: i.productName,
      quantity: Number(i.quantity),
      unitPrice: i.unitPrice ? Number(i.unitPrice.toString()) : null,
      notes: i.notes,
      status: i.status as KdsItemStatus,
    })),
  }));
}

/**
 * Server Action: listar órdenes de cocina completadas (historial).
 */
export async function listPosKdsOrdersHistoryAction(
  take = 50,
): Promise<KdsOrderSummary[]> {
  const ctx = await requireContext();
  const orders = await db.posKdsOrder.findMany({
    where: {
      companyId: ctx.company.id,
      status: { in: ["SERVED", "CANCELLED"] },
    },
    include: {
      items: { orderBy: { id: "asc" } },
      sale: { select: { saleNumber: true } },
    },
    orderBy: { updatedAt: "desc" },
    take,
  });

  return orders.map((o) => ({
    id: o.id,
    orderNumber: o.sale?.saleNumber ?? null,
    tableNumber: o.tableNumber,
    customerName: o.customerName,
    status: o.status as KdsStatus,
    notes: o.notes,
    createdAt: o.createdAt,
    startedAt: o.startedAt,
    completedAt: o.completedAt,
    items: o.items.map((i) => ({
      id: i.id,
      productName: i.productName,
      quantity: Number(i.quantity),
      unitPrice: i.unitPrice ? Number(i.unitPrice.toString()) : null,
      notes: i.notes,
      status: i.status as KdsItemStatus,
    })),
  }));
}

/**
 * Server Action: contar órdenes pendientes.
 */
export async function countPosKdsPendingAction(): Promise<number> {
  const ctx = await requireContext();
  return db.posKdsOrder.count({
    where: {
      companyId: ctx.company.id,
      status: "PENDING",
    },
  });
}

/**
 * Server Action: contar órdenes en preparación.
 */
export async function countPosKdsPreparingAction(): Promise<number> {
  const ctx = await requireContext();
  return db.posKdsOrder.count({
    where: {
      companyId: ctx.company.id,
      status: "PREPARING",
    },
  });
}

async function nextKdsOrderNumber(companyId: string): Promise<string> {
  const count = await db.posKdsOrder.count({
    where: { companyId },
  });
  return `K-${String(count + 1).padStart(4, "0")}`;
}
