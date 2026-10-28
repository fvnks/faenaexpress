/**
 * GET /api/ecommerce/products
 *
 * Lista productos activos del catálogo POS con precio y stock.
 * No requiere autenticación (catálogo público).
 * Query params opcionales: q (búsqueda), categoryId, sku
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: Request): Promise<Response> {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") ?? undefined;
    const categoryId = searchParams.get("categoryId") ?? undefined;
    const sku = searchParams.get("sku") ?? undefined;

    const where: Record<string, unknown> = {
      companyId: { not: null },
      active: true,
      priceNet: { not: null },
    };

    if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { sku: { contains: q, mode: "insensitive" } },
      ];
    }
    if (categoryId) where.categoryId = categoryId;
    if (sku) where.sku = sku;

    const products = await db.product.findMany({
      where,
      select: {
        id: true,
        sku: true,
        name: true,
        description: true,
        priceNet: true,
        ivaAffected: true,
        tracksStock: true,
        category: { select: { id: true, name: true } },
        stocks: {
          select: { warehouseId: true, quantity: true },
        },
      },
      orderBy: [{ name: "asc" }],
      take: 200,
    });

    // Consolidar stock por producto y calcular stock total
    const result = products.map((product) => {
      const totalStock = product.stocks.reduce(
        (sum, s) => sum + Number(s.quantity.toString()),
        0,
      );
      return {
        id: product.id,
        sku: product.sku,
        name: product.name,
        description: product.description,
        priceNet: product.priceNet ?? 0,
        ivaAffected: product.ivaAffected,
        tracksStock: product.tracksStock,
        stock: totalStock,
        category: product.category?.name ?? null,
      };
    });

    return NextResponse.json({ products: result, count: result.length });
  } catch (error) {
    console.error("Error fetching ecommerce products:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
