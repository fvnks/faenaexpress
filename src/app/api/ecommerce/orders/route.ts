/**
 * GET /api/ecommerce/orders
 *
 * Lista pedidos de e-commerce de la empresa autenticada.
 * Requiere autenticación por API key.
 * Query params opcionales: status, desde, hasta, q (búsqueda por cliente o número de orden)
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticateApiKey, extractApiKey } from "@/lib/ecommerce-auth";

export async function GET(request: Request): Promise<Response> {
  try {
    const apiKey = extractApiKey(request.headers);
    const auth = await authenticateApiKey(apiKey);

    if (!auth) {
      return NextResponse.json(
        { error: "API key inválida o no proporcionada" },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") ?? undefined;
    const desde = searchParams.get("desde") ?? undefined;
    const hasta = searchParams.get("hasta") ?? undefined;
    const q = searchParams.get("q") ?? undefined;

    const where: Record<string, unknown> = {
      companyId: auth.companyId,
    };

    if (status) where.status = status;
    if (desde || hasta) {
      where.createdAt = {};
      if (desde) (where.createdAt as Record<string, unknown>).gte = new Date(`${desde}T00:00:00.000Z`);
      if (hasta) (where.createdAt as Record<string, unknown>).lte = new Date(`${hasta}T23:59:59.999Z`);
    }
    if (q) {
      (where as Record<string, unknown>).OR = [
        { orderNumber: { contains: q, mode: "insensitive" } },
        { customerName: { contains: q, mode: "insensitive" } },
        { customerEmail: { contains: q, mode: "insensitive" } },
      ];
    }

    const orders = await db.ecommerceOrder.findMany({
      where,
      include: {
        items: {
          select: {
            productSku: true,
            productName: true,
            quantity: true,
            unitPrice: true,
            lineTotal: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({
      orders: orders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        customerName: o.customerName,
        customerEmail: o.customerEmail,
        customerPhone: o.customerPhone,
        subtotal: o.subtotal,
        tax: o.tax,
        total: o.total,
        status: o.status,
        paymentMethod: o.paymentMethod,
        paymentReference: o.paymentReference,
        notes: o.notes,
        createdAt: o.createdAt,
        items: o.items.map((i) => ({
          productSku: i.productSku,
          productName: i.productName,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          lineTotal: i.lineTotal,
        })),
      })),
      count: orders.length,
    });
  } catch (error) {
    console.error("Error fetching ecommerce orders:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
