import { db } from "@/lib/db";

export async function getAvailableStock(
  companyId: string,
  productId: string,
): Promise<{ tracksStock: boolean; quantity: number; productName?: string | null }> {
  const product = await db.product.findFirst({
    where: { id: productId, companyId },
    select: { name: true, tracksStock: true, stocks: { select: { quantity: true } } },
  });
  if (!product) return { tracksStock: true, quantity: 0 };
  const quantity = product.stocks.reduce((sum, stock) => sum + Number(stock.quantity), 0);
  return { tracksStock: product.tracksStock, quantity, productName: product.name };
}