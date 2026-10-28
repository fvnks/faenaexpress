/**
 * GET /api/ecommerce/products/[id]
 *
 * Detalle de un producto específico con su stock por bodega.
 * No requiere autenticación.
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const { id } = await params;

    const product = await db.product.findFirst({
      where: { id, active: true },
      select: {
        id: true,
        sku: true,
        name: true,
        description: true,
        priceNet: true,
        ivaAffected: true,
        tracksStock: true,
        category: { select: { id: true, name: true } },
        stocks: { select: { warehouseId: true, quantity: true } },
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: "Producto no encontrado" },
        { status: 404 },
      );
    }

    const stocks = product.stocks.map((s) => ({
      warehouseId: s.warehouseId,
      quantity: Number(s.quantity.toString()),
    }));
    const totalStock = stocks.reduce((sum, s) => sum + s.quantity, 0);

    return NextResponse.json({
      id: product.id,
      sku: product.sku,
      name: product.name,
      description: product.description,
      priceNet: product.priceNet ?? 0,
      ivaAffected: product.ivaAffected,
      tracksStock: product.tracksStock,
      stock: totalStock,
      stocks,
      category: product.category?.name ?? null,
    });
  } catch (error) {
    console.error("Error fetching ecommerce product:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
