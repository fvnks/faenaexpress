"use server";

import { requireContext, canInventoryEdit } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { moneyToInt, registerMovement, MOVEMENT_TYPES, getOrCreateDefaultWarehouse, aggregateStock } from "@/lib/inventory";
import { reverseStockMovement } from "@/lib/inventory-reversal";
import { recordAudit } from "@/lib/audit";
import { stockMovementTypeLabel } from "@/lib/labels";

export type ProductFormState = { error?: string; ok?: boolean } | undefined;

export async function createProduct(
  _prev: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  const ctx = await requireContext("inventario");
  if (!canInventoryEdit(ctx)) redirect("/dashboard/inventario");
  const sku = String(formData.get("sku") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  if (!sku || !name) return { error: "SKU y nombre son obligatorios." };
  const exists = await db.product.findFirst({ where: { companyId: ctx.company.id, sku } });
  if (exists) return { error: "Ya existe un producto con ese SKU." };
  const costNet = moneyToInt(String(formData.get("costNet") ?? ""));
  const priceNetRaw = String(formData.get("priceNet") ?? "");
  const priceNet = priceNetRaw === "" ? null : moneyToInt(priceNetRaw);
  const minStockRaw = formData.get("minStock");
  const minStock = minStockRaw === null || minStockRaw === "" ? null : Number(String(minStockRaw).replace(",", "."));
  const unitId = String(formData.get("unitId") ?? "") || null;
  const categoryId = String(formData.get("categoryId") ?? "") || null;
  const supplierId = String(formData.get("supplierId") ?? "") || null;
  const location = String(formData.get("location") ?? "").trim() || null;
  const tracksStock = String(formData.get("tracksStock") ?? "true") === "true";
  const ivaAffected = String(formData.get("ivaAffected") ?? "true") === "true";
  const product = await db.product.create({
    data: {
      companyId: ctx.company.id,
      sku,
      name,
      unitId,
      categoryId,
      supplierId,
      location,
      costNet,
      priceNet,
      minStock: minStock === null ? null : new Prisma.Decimal(minStock.toFixed(3)),
      tracksStock,
      ivaAffected,
    },
  });
  // El saldo nace en la bodega por defecto de la empresa.
  const warehouse = await getOrCreateDefaultWarehouse(ctx.company.id);
  await db.productStock.create({
    data: {
      productId: product.id,
      companyId: ctx.company.id,
      warehouseId: warehouse.id,
      quantity: new Prisma.Decimal("0"),
      avgCost: new Prisma.Decimal("0"),
    },
  });
  revalidatePath("/dashboard/inventario");
  redirect(`/dashboard/inventario/productos/${product.id}`);
}

// Lee los campos comunes de los formularios de producto.
function readProductFields(formData: FormData) {
  const costNet = moneyToInt(String(formData.get("costNet") ?? ""));
  const priceNetRaw = String(formData.get("priceNet") ?? "");
  const minStockRaw = String(formData.get("minStock") ?? "").replace(",", ".");
  return {
    sku: String(formData.get("sku") ?? "").trim(),
    name: String(formData.get("name") ?? "").trim(),
    unitId: String(formData.get("unitId") ?? "") || null,
    categoryId: String(formData.get("categoryId") ?? "") || null,
    supplierId: String(formData.get("supplierId") ?? "") || null,
    location: String(formData.get("location") ?? "").trim() || null,
    costNet,
    priceNet: priceNetRaw === "" ? null : moneyToInt(priceNetRaw),
    minStock: minStockRaw === "" ? null : Number(minStockRaw),
    tracksStock: String(formData.get("tracksStock") ?? "true") === "true",
    ivaAffected: String(formData.get("ivaAffected") ?? "true") === "true",
  };
}

// Edición de un producto existente. El stock y el PPP no se tocan aquí.
export async function updateProduct(
  id: string,
  _prev: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  const ctx = await requireContext("inventario");
  if (!canInventoryEdit(ctx)) redirect("/dashboard/inventario");

  const fields = readProductFields(formData);
  if (!fields.sku || !fields.name) return { error: "SKU y nombre son obligatorios." };

  const clash = await db.product.findFirst({
    where: { companyId: ctx.company.id, sku: fields.sku },
  });
  if (clash && clash.id !== id) return { error: "Ya existe un producto con ese SKU." };

  // Con stock en cualquier bodega, el costo lo fija el PPP consolidado.
  const stockRows = await db.productStock.findMany({ where: { productId: id } });
  const total = aggregateStock(stockRows);

  await db.product.update({
    where: { id, companyId: ctx.company.id },
    data: {
      ...fields,
      minStock:
        fields.minStock === null ? null : new Prisma.Decimal(fields.minStock.toFixed(3)),
      // Sin stock, el costo editable es el del formulario; con stock manda el PPP.
      costNet: total.quantity.gt(0) ? Math.round(total.avgCost.toNumber()) : fields.costNet,
    },
  });

  revalidatePath("/dashboard/inventario");
  revalidatePath(`/dashboard/inventario/productos/${id}`);
  redirect(`/dashboard/inventario/productos/${id}`);
}

export type MovementFormState = { error?: string; ok?: boolean } | undefined;

// Alta de movimiento de stock (entrada, salida, ajuste, merma, inicial o
// transferencia entre bodegas).
export async function createStockMovement(
  _prev: MovementFormState,
  formData: FormData,
): Promise<MovementFormState> {
  const ctx = await requireContext("inventario");
  if (!canInventoryEdit(ctx)) return { error: "No tienes permiso para editar inventario." };

  const productId = String(formData.get("productId") ?? "");
  const type = String(formData.get("type") ?? "") as (typeof MOVEMENT_TYPES)[number];
  if (!productId) return { error: "Selecciona un producto." };
  if (!MOVEMENT_TYPES.includes(type)) return { error: "Tipo de movimiento inválido." };

  const qtyRaw = String(formData.get("quantity") ?? "").replace(",", ".");
  const quantity = Number(qtyRaw);
  if (!Number.isFinite(quantity) || quantity <= 0) return { error: "Ingresa una cantidad mayor que cero." };

  const needsCost = type === "IN" || type === "INITIAL";
  const costRaw = String(formData.get("unitCost") ?? "").trim().replace(/\./g, "").replace(",", ".");
  const unitCost = costRaw === "" ? null : Number(costRaw);
  if (needsCost && (unitCost === null || !Number.isFinite(unitCost) || unitCost < 0)) {
    return { error: "Ingresa el costo unitario neto." };
  }

  const warehouseId = String(formData.get("warehouseId") ?? "") || null;
  const toWarehouseId = String(formData.get("toWarehouseId") ?? "") || null;
  if (type === "TRANSFER") {
    if (!toWarehouseId) return { error: "Selecciona la bodega de destino." };
    if (toWarehouseId === warehouseId) {
      return { error: "La bodega de destino debe ser distinta de la de origen." };
    }
  }

  const dateRaw = String(formData.get("date") ?? "");
  const date = dateRaw ? new Date(`${dateRaw}T12:00:00`) : new Date();
  if (Number.isNaN(date.getTime())) return { error: "Fecha inválida." };

  const result = await registerMovement({
    companyId: ctx.company.id,
    productId,
    type,
    date,
    quantity: new Prisma.Decimal(quantity.toFixed(3)),
    unitCost,
    warehouseId,
    toWarehouseId,
    reason: String(formData.get("reason") ?? "").trim() || null,
    reference: String(formData.get("reference") ?? "").trim() || null,
    notes: String(formData.get("notes") ?? "").trim() || null,
    createdById: ctx.user.id,
  });
  if (!result.ok) return { error: result.error };

  const product = await db.product.findUnique({ where: { id: productId }, select: { name: true } });
  await recordAudit(ctx, {
    action: "CREATE",
    entityType: "StockMovement",
    entityId: result.movementId,
    summary: `Registró ${stockMovementTypeLabel(type)} de ${quantity.toFixed(3)} «${product?.name ?? "producto"}».`,
  });

  revalidatePath("/dashboard/inventario");
  revalidatePath("/dashboard/inventario/movimientos");
  revalidatePath(`/dashboard/inventario/productos/${productId}`);
  return { ok: true };
}

export async function reverseStockMovementAction(formData: FormData): Promise<void> {
  const ctx = await requireContext("inventario");
  if (!canInventoryEdit(ctx)) redirect("/dashboard/inventario/movimientos");

  const movementId = String(formData.get("movementId") ?? "");
  if (!movementId) redirect("/dashboard/inventario/movimientos");

  const result = await reverseStockMovement(ctx.company.id, movementId, ctx.user.id);
  if (!result.ok) {
    redirect(`/dashboard/inventario/movimientos?error=${encodeURIComponent(result.error)}`);
  }

  await recordAudit(ctx, {
    action: "CREATE",
    entityType: "StockMovement",
    entityId: result.movementId ?? "reverse",
    summary: `Revirtio el movimiento ${movementId}.`,
  });

  revalidatePath("/dashboard/inventario");
  revalidatePath("/dashboard/inventario/movimientos");
  redirect("/dashboard/inventario/movimientos");
}