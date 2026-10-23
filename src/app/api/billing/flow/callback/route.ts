// Callback de pago de Flow (Webpay)
// POST /api/billing/flow/callback
// Flow envía: token, commerceOrder, status, amount, signature
//
import { NextResponse } from "next/server";

import { getPaymentProvider } from "@/lib/saas-billing/providers";

export async function POST(req: Request): Promise<Response> {
  try {
    const body = await req.json();
    const { token, status, amount, commerceOrder } = body;

    if (!token) {
      return NextResponse.json({ error: "Falta token" }, { status: 400 });
    }

    const provider = await getPaymentProvider("FLOW");
    const verification = await provider.verifyPayment(token);

    const { db } = await import("@/lib/db");
    const payment = await db.platformPayment.findFirst({
      where: { providerRef: token },
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

    return NextResponse.json({ ok: true, status: verification.status });
  } catch (e) {
    console.error("Flow callback error:", e);
    return NextResponse.json({ error: "Error procesando callback" }, { status: 500 });
  }
}

export const GET = POST;