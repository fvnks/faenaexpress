"use server";

import { revalidatePath } from "next/cache";

import { recordAudit } from "@/lib/audit";
import { canInventoryEdit, requireContext } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  closeStockCount,
  createStockCount,
  saveCountedQuantity,
} from "@/lib/stock-counts";

export type StockCountFormState = { error?: string; ok?: boolean } | undefined;

export type CountItemState =
  | { error?: string; ok?: boolean; saved?: number }
  | undefined;

// Abre un conteo físico sobre una bodega.
export async function openStockCount(
  _prev: StockCountFormState,
  formData: FormData,
): Promise<StockCountFormState> {
  const ctx = await requireContext("inventario");
  if (!canInventoryEdit(ctx)) return { error: "No tienes permiso para editar inventario." };

  const warehouseId = String(formData.get("warehouseId") ?? "") || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const dateRaw = String(formData.get("date") ?? "");
  const date = dateRaw ? new Date(`${dateRaw}T12:00:00`) : new Date();
  if (Number.isNaN(date.getTime())) return { error: "Fecha inválida." };

  const result = await createStockCount({
    companyId: ctx.company.id,
    warehouseId,
    date,
    notes,
    createdById: ctx.user.id,
  });
  if (!result.ok) return { error: result.error };

  await recordAudit(ctx, {
    action: "CREATE",
    entityType: "StockCount",
    entityId: result.id,
    summary: "Abrió un conteo físico de inventario.",
  });

  revalidatePath("/dashboard/inventario/conteos");
  return { ok: true };
}

// Guarda las cantidades contadas de un conteo. El form envía un input por item
// (nombre `qty-<itemId>`); los vacíos se ignoran.
export async function saveStockCount(
  _prev: CountItemState,
  formData: FormData,
): Promise<CountItemState> {
  const ctx = await requireContext("inventario");
  if (!canInventoryEdit(ctx)) return { error: "No tienes permiso para editar inventario." };

  const countId = String(formData.get("countId") ?? "");
  const count = await db.stockCount.findFirst({
    where: { id: countId, companyId: ctx.company.id },
    select: { id: true, status: true },
  });
  if (!count) return { error: "Conteo no encontrado." };
  if (count.status !== "OPEN") return { error: "El conteo ya está cerrado." };

  let saved = 0;
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("qty-")) continue;
    const itemId = key.slice(4);
    const raw = String(value ?? "").trim().replace(",", ".");
    const counted = raw === "" ? null : Number(raw);
    if (counted !== null && (!Number.isFinite(counted) || counted < 0)) {
      return { error: `Cantidad inválida en un producto.` };
    }
    const result = await saveCountedQuantity(ctx.company.id, itemId, counted);
    if (!result.ok) return { error: result.error };
    saved += 1;
  }

  revalidatePath(`/dashboard/inventario/conteos/${countId}`);
  return { ok: true, saved };
}

export type CloseCountState = { error?: string; ok?: boolean; summary?: string } | undefined;

// Cierra el conteo y aplica los ajustes. El id va en el form (hidden), igual
// que el resto de acciones del módulo.
export async function closeStockCountAction(
  _prev: CloseCountState,
  formData: FormData,
): Promise<CloseCountState> {
  const countId = String(formData.get("countId") ?? "");
  const ctx = await requireContext("inventario");
  if (!canInventoryEdit(ctx)) return { error: "No tienes permiso para editar inventario." };
  if (!countId) return { error: "Falta el conteo." };

  const result = await closeStockCount(ctx.company.id, countId, ctx.user.id);
  if (!result.ok) return { error: result.error };

  const { adjustments, increases, decreases, skipped } = result.summary;
  await recordAudit(ctx, {
    action: "UPDATE",
    entityType: "StockCount",
    entityId: countId,
    summary: `Cerró un conteo físico: ${adjustments} ajustes (${increases} al alza, ${decreases} a la baja).`,
  });

  revalidatePath("/dashboard/inventario/conteos");
  revalidatePath(`/dashboard/inventario/conteos/${countId}`);
  revalidatePath("/dashboard/inventario");
  revalidatePath("/dashboard/inventario/movimientos");

  const parts = [
    `${adjustments} ajuste${adjustments === 1 ? "" : "s"}`,
    `${increases} al alza`,
    `${decreases} a la baja`,
  ];
  if (skipped > 0) parts.push(`${skipped} sin contar`);

  return { ok: true, summary: parts.join(" · ") };
}
