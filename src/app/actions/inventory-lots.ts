"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { recordAudit } from "@/lib/audit";
import { canInventoryEdit, requireContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";

export async function createProductLot(formData: FormData): Promise<void> {
  const ctx = await requireContext("inventario");
  if (!canInventoryEdit(ctx)) redirect("/dashboard/inventario/lotes");

  const productId = String(formData.get("productId") ?? "");
  const code = String(formData.get("code") ?? "").trim();
  const quantityRaw = String(formData.get("quantity") ?? "").trim().replace(",", ".");
  const expirationRaw = String(formData.get("expirationDate") ?? "").trim();
  const warehouseId = String(formData.get("warehouseId") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!productId || !code) {
    redirect("/dashboard/inventario/lotes?error=" + encodeURIComponent("Producto y código de lote son obligatorios."));
  }
  const quantity = Number(quantityRaw);
  if (!Number.isFinite(quantity) || quantity <= 0) {
    redirect("/dashboard/inventario/lotes?error=" + encodeURIComponent("Cantidad inválida."));
  }

  const product = await db.product.findFirst({ where: { id: productId, companyId: ctx.company.id } });
  if (!product) {
    redirect("/dashboard/inventario/lotes?error=" + encodeURIComponent("Producto no encontrado."));
  }
  if (warehouseId) {
    const warehouse = await db.warehouse.findFirst({ where: { id: warehouseId, companyId: ctx.company.id } });
    if (!warehouse) {
      redirect("/dashboard/inventario/lotes?error=" + encodeURIComponent("Bodega no encontrada."));
    }
  }

  const exists = await db.productLot.findFirst({
    where: { companyId: ctx.company.id, productId, code },
  });
  if (exists) {
    redirect("/dashboard/inventario/lotes?error=" + encodeURIComponent("Ya existe un lote con ese código para este producto."));
  }

  const lot = await db.productLot.create({
    data: {
      companyId: ctx.company.id,
      productId,
      warehouseId,
      code,
      quantity: new Prisma.Decimal(quantity.toFixed(3)),
      expirationDate: expirationRaw ? new Date(`${expirationRaw}T00:00:00.000Z`) : null,
      notes,
      createdById: ctx.user.id,
    },
  });

  await recordAudit(ctx, {
    action: "CREATE",
    entityType: "ProductLot",
    entityId: lot.id,
    summary: `Registró el lote ${code} del producto ${product.name}.`,
  });

  revalidatePath("/dashboard/inventario/lotes");
  revalidatePath("/dashboard/inventario");
  redirect("/dashboard/inventario/lotes");
}

export async function deleteLotAction(formData: FormData): Promise<void> {
  const ctx = await requireContext("inventario");
  if (!canInventoryEdit(ctx)) redirect("/dashboard/inventario/lotes");

  const lotId = String(formData.get("lotId") ?? "");
  if (!lotId) redirect("/dashboard/inventario/lotes");

  const lot = await db.productLot.findFirst({
    where: { id: lotId, companyId: ctx.company.id },
    include: { product: { select: { name: true } } },
  });
  if (!lot) redirect("/dashboard/inventario/lotes");

  await db.productLot.delete({ where: { id: lotId, companyId: ctx.company.id } });
  await recordAudit(ctx, {
    action: "DELETE",
    entityType: "ProductLot",
    entityId: lotId,
    summary: `Eliminó el lote ${lot.code} (${lot.product.name}).`,
  });

  revalidatePath("/dashboard/inventario/lotes");
  revalidatePath("/dashboard/inventario");
}