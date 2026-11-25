"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { recordAudit } from "@/lib/audit";
import { canInventoryEdit, requireContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { getOrCreateDefaultWarehouse, registerMovement } from "@/lib/inventory";
import { Prisma } from "@/generated/prisma/client";

export async function createProductLot(formData: FormData): Promise<void> {
  const ctx = await requireContext("inventario");
  if (!canInventoryEdit(ctx)) redirect("/facturas/inventario/lotes");

  const productId = String(formData.get("productId") ?? "");
  const code = String(formData.get("code") ?? "").trim();
  const quantityRaw = String(formData.get("quantity") ?? "").trim().replace(",", ".");
  const expirationRaw = String(formData.get("expirationDate") ?? "").trim();
  const warehouseId = String(formData.get("warehouseId") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!productId || !code) {
    redirect("/facturas/inventario/lotes?error=" + encodeURIComponent("Producto y código de lote son obligatorios."));
  }
  const quantity = Number(quantityRaw);
  if (!Number.isFinite(quantity) || quantity <= 0) {
    redirect("/facturas/inventario/lotes?error=" + encodeURIComponent("Cantidad inválida."));
  }

  const product = await db.product.findFirst({ where: { id: productId, companyId: ctx.company.id } });
  if (!product) {
    redirect("/facturas/inventario/lotes?error=" + encodeURIComponent("Producto no encontrado."));
  }
  if (warehouseId) {
    const warehouse = await db.warehouse.findFirst({ where: { id: warehouseId, companyId: ctx.company.id } });
    if (!warehouse) {
      redirect("/facturas/inventario/lotes?error=" + encodeURIComponent("Bodega no encontrada."));
    }
  }

  const exists = await db.productLot.findFirst({
    where: { companyId: ctx.company.id, productId, code },
  });
  if (exists) {
    redirect("/facturas/inventario/lotes?error=" + encodeURIComponent("Ya existe un lote con ese código para este producto."));
  }

  // Un lote trazable siempre pertenece a una bodega concreta; si el formulario
  // dice "Por defecto", se resuelve aquí para que FEFO lo encuentre.
  const almacenId =
    warehouseId ?? (await getOrCreateDefaultWarehouse(ctx.company.id)).id;

  const lot = await db.productLot.create({
    data: {
      companyId: ctx.company.id,
      productId,
      warehouseId: almacenId,
      code,
      // En productos trazables el stock se registra con un movimiento INITIAL
      // ligado al lote; aquí nace en 0 para no contarlo dos veces.
      quantity: product.trackLots ? new Prisma.Decimal(0) : new Prisma.Decimal(quantity.toFixed(3)),
      expirationDate: expirationRaw ? new Date(`${expirationRaw}T00:00:00.000Z`) : null,
      notes,
      createdById: ctx.user.id,
    },
  });

  if (product.trackLots) {
    const almacen = await db.warehouse.findFirst({ where: { id: almacenId, companyId: ctx.company.id }, select: { id: true } });
    if (!almacen) {
      redirect("/facturas/inventario/lotes?error=" + encodeURIComponent("No hay bodega para registrar el lote."));
    }
    const resultado = await registerMovement({
      companyId: ctx.company.id,
      productId,
      type: "INITIAL",
      date: new Date(),
      quantity: new Prisma.Decimal(quantity.toFixed(3)),
      unitCost: product.costNet,
      warehouseId: almacen.id,
      lotId: lot.id,
      reason: `Inventario inicial del lote ${code}`,
      reference: `lote:${lot.id}`,
      createdById: ctx.user.id,
    });
    if (!resultado.ok) {
      redirect("/facturas/inventario/lotes?error=" + encodeURIComponent(resultado.error));
    }
  }

  await recordAudit(ctx, {
    action: "CREATE",
    entityType: "ProductLot",
    entityId: lot.id,
    summary: `Registró el lote ${code} del producto ${product.name}.`,
  });

  revalidatePath("/facturas/inventario/lotes");
  revalidatePath("/facturas/inventario");
  redirect("/facturas/inventario/lotes");
}

export async function deleteLotAction(formData: FormData): Promise<void> {
  const ctx = await requireContext("inventario");
  if (!canInventoryEdit(ctx)) redirect("/facturas/inventario/lotes");

  const lotId = String(formData.get("lotId") ?? "");
  if (!lotId) redirect("/facturas/inventario/lotes");

  const lot = await db.productLot.findFirst({
    where: { id: lotId, companyId: ctx.company.id },
    include: { product: { select: { name: true, trackLots: true } } },
  });
  if (!lot) redirect("/facturas/inventario/lotes");
  if (lot.product.trackLots && Number(lot.quantity) > 0) {
    redirect("/facturas/inventario/lotes?error=" + encodeURIComponent(
      "El lote todavía tiene stock; haz un ajuste de salida antes de eliminarlo.",
    ));
  }

  await db.productLot.delete({ where: { id: lotId, companyId: ctx.company.id } });
  await recordAudit(ctx, {
    action: "DELETE",
    entityType: "ProductLot",
    entityId: lotId,
    summary: `Eliminó el lote ${lot.code} (${lot.product.name}).`,
  });

  revalidatePath("/facturas/inventario/lotes");
  revalidatePath("/facturas/inventario");
}