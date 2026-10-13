import { db } from "@/lib/db";

/**
 * Conversión de las líneas de un documento DTE (`itemsDetalle` de src/lib/dte.ts)
 * a filas listas para `PurchaseItem` / `SaleItem`.
 *
 * El neto del documento NO se recalcula desde los ítems: manda el encabezado.
 * Aquí solo se limpia cada línea y se intenta vincular al catálogo.
 */

/** Línea tal como sale del parser del XML. */
export type DocItemSource = {
  nombre: string;
  cantidad: string;
  precio: number;
  monto: number;
};

/** Fila normalizada, lista para createMany. */
export type DocItemRow = {
  productId: string | null;
  name: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  position: number;
};

/** Índice nombre→producto, normalizado en minúsculas. */
export type ProductNameIndex = Map<string, string>;

/** Tope de líneas por documento, para no recibir archivos desbordados. */
export const MAX_DOC_ITEMS = 200;

/**
 * Cantidad del XML: el SII puede escribir "2", "2,5" o "2.5".
 * No numérico o ≤ 0 → 1. Máximo 3 decimales (igual que el esquema).
 */
function parseQuantity(raw: string): number {
  const normalized = String(raw ?? "").trim().replace(",", ".");
  const value = Number(normalized);
  if (!Number.isFinite(value) || value <= 0) return 1;
  return Math.round(value * 1000) / 1000;
}

/**
 * Índice de productos activos por nombre, listo para resolver varios documentos
 * con una sola consulta (los importados traen hasta 200 facturas).
 *
 * Solo entra el nombre de UN producto: si dos productos se llaman igual, el
 * vínculo sería una adivinanza, así que se deja fuera y el ítem queda
 * "sin vincular".
 */
export async function loadProductIndex(companyId: string): Promise<ProductNameIndex> {
  const products = await db.product.findMany({
    where: { companyId, active: true },
    select: { id: true, name: true },
  });

  const conteo = new Map<string, number>();
  for (const product of products) {
    const key = product.name.trim().toLowerCase();
    conteo.set(key, (conteo.get(key) ?? 0) + 1);
  }

  const index: ProductNameIndex = new Map();
  for (const product of products) {
    const key = product.name.trim().toLowerCase();
    if (conteo.get(key) === 1) index.set(key, product.id);
  }
  return index;
}

/** Normaliza las líneas del documento; devuelve [] si no hay detalle utilizable. */
export function prepareDocItems(
  index: ProductNameIndex,
  items: DocItemSource[] | null | undefined,
): DocItemRow[] {
  if (!Array.isArray(items) || items.length === 0) return [];

  const limpias = items
    .map((item) => {
      const name = String(item?.nombre ?? "").trim().slice(0, 200);
      if (!name) return null;
      const quantity = parseQuantity(String(item?.cantidad ?? ""));
      const unitPrice = Math.max(0, Math.round(Number(item?.precio) || 0));
      const monto = Math.max(0, Math.round(Number(item?.monto) || 0));
      // Si el XML no trae monto, se deriva del precio unitario.
      const amount = monto > 0 ? monto : Math.round(unitPrice * quantity);
      return { name, quantity, unitPrice, amount };
    })
    .filter((item): item is { name: string; quantity: number; unitPrice: number; amount: number } => item !== null)
    .slice(0, MAX_DOC_ITEMS);

  return limpias.map((item, position) => ({
    productId: index.get(item.name.toLowerCase()) ?? null,
    name: item.name,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    amount: item.amount,
    position,
  }));
}

/** Guarda las líneas de una compra. */
export async function createPurchaseItems(
  purchaseId: string,
  companyId: string,
  rows: DocItemRow[],
): Promise<void> {
  if (rows.length === 0) return;
  await db.purchaseItem.createMany({
    data: rows.map((row) => ({ ...row, purchaseId, companyId })),
  });
}

/** Guarda las líneas de una venta. */
export async function createSaleItems(
  saleId: string,
  companyId: string,
  rows: DocItemRow[],
): Promise<void> {
  if (rows.length === 0) return;
  await db.saleItem.createMany({
    data: rows.map((row) => ({ ...row, saleId, companyId })),
  });
}
