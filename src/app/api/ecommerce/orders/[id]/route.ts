/**
 * GET /api/ecommerce/orders/[id]
 *
 * Detalle de un pedido de e-commerce específico.
 * Requiere autenticación por API key.
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticateApiKey, extractApiKey } from "@/lib/ecommerce-auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const apiKey = extractApiKey(request.headers);
    const auth = await authenticateApiKey(apiKey);

    if (!auth) {
      return NextResponse.json(
        { error: "API key inválida o no proporcionada" },
        { status: 401 },
      );
    }

    const { id } = await params;

    const order = await db.ecommerceOrder.findFirst({
      where: { id, companyId: auth.companyId },
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
    });

    if (!order) {
      return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
    }

    return NextResponse.json({
      id: order.id,
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      customerPhone: order.customerPhone,
      customerAddress: order.customerAddress,
      subtotal: order.subtotal,
      tax: order.tax,
      total: order.total,
      status: order.status,
      paymentMethod: order.paymentMethod,
      paymentReference: order.paymentReference,
      notes: order.notes,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      items: order.items.map((i) => ({
        productSku: i.productSku,
        productName: i.productName,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        lineTotal: i.lineTotal,
      })),
    });
  } catch (error) {
    console.error("Error fetching ecommerce order:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
