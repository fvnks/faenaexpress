// Callback de pago de MercadoPago (redirect del navegador)
// GET /api/billing/mercadopago/callback?payment_id=...&status=...&external_reference=...
//
import { NextResponse } from "next/server";

import { getPaymentProvider } from "@/lib/saas-billing/providers";

export async function GET(req: Request): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const paymentId = searchParams.get("payment_id");
  const status = searchParams.get("status");
  const externalReference = searchParams.get("external_reference");

  if (!paymentId) {
    return NextResponse.redirect(
      new URL("/billing?error=payment_not_found", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000")
    );
  }

  try {
    const provider = await getPaymentProvider("MERCADOPAGO");
    const verification = await provider.verifyPayment(paymentId);

    const { db } = await import("@/lib/db");
    const payment = await db.platformPayment.findFirst({
      where: { providerRef: paymentId },
      include: { invoice: true },
    });

    if (!payment) {
      return NextResponse.redirect(
        new URL("/billing?error=payment_not_found", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000")
      );
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

    return NextResponse.redirect(
      new URL(`/billing?paid=${payment.invoiceId}`, process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000")
    );
  } catch (e) {
    console.error("MercadoPago callback error:", e);
    return NextResponse.redirect(
      new URL("/billing?error=callback_error", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000")
    );
  }
}