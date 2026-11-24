import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";

export type BulkField = "categoria" | "area" | "metodoPago";

/** Valida el campo y valor recibidos en una acción masiva. */
export function parseBulkChange(
  field: unknown,
  value: unknown,
): { field: BulkField; value: string } | null {
  const f = String(field ?? "");
  const v = String(value ?? "").trim();
  if (!["categoria", "area", "metodoPago"].includes(f) || !v) return null;
  return { field: f as BulkField, value: v };
}

/** Construye el `data` de Prisma para el modelo indicado. */
export function bulkData(
  model: "sale" | "purchase" | "expense",
  change: { field: BulkField; value: string },
): Prisma.SaleUpdateInput | Prisma.PurchaseUpdateInput | Prisma.ExpenseUpdateInput {
  switch (change.field) {
    case "categoria":
      return { category: { connect: { id: change.value } } } as never;
    case "area":
      return { area: { connect: { id: change.value } } } as never;
    case "metodoPago":
      return { paymentMethod: change.value } as never;
  }
}

/** Ejecuta el updateMany verificando que el valor pertenezca a la empresa. */
export async function applyBulkEdit(
  model: "sale" | "purchase" | "expense",
  companyId: string,
  ids: string[],
  change: { field: BulkField; value: string },
): Promise<number> {
  // categoryId/areaId deben existir en la empresa para no asignar un id ajeno.
  if (change.field === "categoria") {
    const found = await db.category.findFirst({ where: { id: change.value, companyId } });
    if (!found) return 0;
  } else if (change.field === "area") {
    const found = await db.area.findFirst({ where: { id: change.value, companyId } });
    if (!found) return 0;
  }

  const where = { id: { in: ids }, companyId };
  const data = bulkData(model, change) as never;

  if (model === "sale") return (await db.sale.updateMany({ where, data })).count;
  if (model === "purchase") return (await db.purchase.updateMany({ where, data })).count;
  return (await db.expense.updateMany({ where, data })).count;
}
