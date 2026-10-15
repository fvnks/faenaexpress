import { db } from "@/lib/db";
import { registerMovement } from "@/lib/inventory";
import { MovementResult, MovementType } from "@/lib/inventory";

export async function reverseStockMovement(
  companyId: string,
  movementId: string,
  createdById: string,
): Promise<MovementResult> {
  const original = await db.stockMovement.findFirst({
    where: { id: movementId, companyId },
    include: { product: true, warehouse: true, toWarehouse: true },
  });
  if (!original) return { ok: false, error: "Movimiento no encontrado." };

  const key = `reverse:${movementId}`;
  const already = await db.stockMovement.findFirst({
    where: { companyId, reference: key },
    select: { id: true },
  });
  if (already) return { ok: false, error: "El movimiento ya fue revertido." };
  if (original.reference?.startsWith("reverse:")) {
    return { ok: false, error: "No se puede revertir una reversión." };
  }

  let inverseType: MovementType;
  let originId = original.warehouseId;
  let destinationId: string | null = null;

  switch (original.type) {
    case "IN":
    case "INITIAL":
    case "ADJUST_IN":
      inverseType = "ADJUST_OUT";
      break;
    case "OUT":
    case "WASTE":
    case "ADJUST_OUT":
      inverseType = "ADJUST_IN";
      break;
    case "TRANSFER":
      inverseType = "TRANSFER";
      originId = original.toWarehouseId;
      destinationId = original.warehouseId;
      break;
    default:
      return { ok: false, error: "Tipo de movimiento no reversible." };
  }

  if (!originId) return { ok: false, error: "El movimiento original no tiene bodega." };

  return registerMovement({
    companyId,
    productId: original.productId,
    type: inverseType,
    date: new Date(),
    quantity: original.quantity,
    unitCost: inverseType === "ADJUST_IN" ? original.unitCost : null,
    warehouseId: originId,
    toWarehouseId: destinationId,
    reason: `Reversión del movimiento ${original.id}`,
    reference: key,
    notes: original.notes,
    createdById,
  });
}