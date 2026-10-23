// Webhook de MercadoPago (servidor a servidor)
// POST /api/billing/mercadopago/webhook
//
// MercadoPago envía: {"id": 12345, "type": "payment", "action": "payment.created", ...}
//
import { NextResponse } from "next/server";

import { getPaymentProvider } from "@/lib/saas-billing/providers";

export async function POST(req: Request): Promise<Response> {
  try {
    const body = await req.json();
    const { id: paymentId, type, action } = body;

    if (!paymentId || type !== "payment") {
      return NextResponse.json({ error: "Notificación inválida" }, { status: 400 });
    }

    const provider = await getPaymentProvider("MERCADOPAGO");
    const verification = await provider.verifyPayment(paymentId.toString());

    const { db } = await import("@/lib/db");
    const payment = await db.platformPayment.findFirst({
      where: { providerRef: paymentId.toString() },
      include: { invoice: true },
    });

    if (!payment) {
      return NextResponse.json({ error: "Pago no encontrado" }, { status: 404 });
    }

    await db.platformPayment.update({
      where: { id: payment.id },
      data: {
        status: verification.status,
        paidAt: verification.status === "COMPLETED" ? new Date() : null,
        providerData: JSON.stringify(verification.rawData ?? {}),
      },
    });

    if (verification.status === "COMPLETED" && payment.invoice) {
      const pagadoTotal = await db.platformPayment.aggregate({
        where: { invoiceId: payment.invoiceId, status: "COMPLETED" },
        _sum: { amountCLP: true },
      });
      const totalPagado = pagadoTotal._sum.amountCLP ?? 0;
      const nuevoStatus = totalPagado >= payment.invoice.totalCLP ? "PAID" : "PARTIAL";

      await db.platformInvoice.update({
        where: { id: payment.invoiceId },
        data: {
          status: nuevoStatus,
          paidAt: nuevoStatus === "PAID" ? new Date() : null,
        },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("MercadoPago webhook error:", e);
    return NextResponse.json({ error: "Error procesando webhook" }, { status: 500 });
  }
}