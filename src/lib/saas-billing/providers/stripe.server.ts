// Proveedor Stripe (tarjetas guardadas / PaymentIntents)
//
// Implementado con fetch directo a la API de Stripe para evitar depender
// del paquete npm de Stripe (que no es compatible con el navegador).
//
// Documentación: https://stripe.com/docs/api
// Requiere: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
//
// Variables de entorno:
//   STRIPE_SECRET_KEY
//   STRIPE_WEBHOOK_SECRET
//   NEXT_PUBLIC_APP_URL
//
"use server";

import type { PaymentProvider, PaymentIntent, PaymentVerification } from "./index";

const STRIPE_BASE_URL = "https://api.stripe.com";

async function stripeRequest(
  method: "GET" | "POST",
  path: string,
  body?: any,
  idempotencyKey?: string,
): Promise<any> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
    "Content-Type": "application/x-www-form-urlencoded",
  };

  const response = await fetch(`${STRIPE_BASE_URL}${path}`, {
    method,
    headers,
    body: body ? new URLSearchParams(body as Record<string, string>) : undefined,
    ...(idempotencyKey ? { idempotencyKey } : {}),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Stripe API error: ${response.status} ${text}`);
  }

  return response.json();
}

export const stripeProvider: PaymentProvider = {
  name: "CARD",
  displayName: "Tarjeta guardada (Stripe)",
  requiresRedirect: false,
  supportsRefund: true,

  async createPayment({
    amountCLP,
    description,
    returnUrl,
    metadata,
  }: {
    amountCLP: number;
    description: string;
    returnUrl: string;
    metadata: Record<string, string>;
  }): Promise<PaymentIntent> {
    const customerId = metadata.customerId;
    if (!customerId) {
      throw new Error(
        "No hay customer_id de Stripe para este método de pago",
      );
    }

    const paymentIntent = await stripeRequest("POST", "/v1/payment_intents", {
      amount: Math.round(amountCLP / 100).toString(), // Stripe usa centavos
      currency: "clp",
      customer: customerId,
      payment_method_types: ["card"],
      description,
      return_url: returnUrl,
      setup_future_usage: "off_session",
      "metadata[invoiceId]": metadata.invoiceId,
      "metadata[organizationId]": metadata.organizationId,
    });

    return {
      paymentUrl: "",
      providerRef: paymentIntent.id,
      amountCLP: Math.round(paymentIntent.amount * 100),
      currency: "CLP",
      metadata: { clientSecret: paymentIntent.client_secret },
    };
  },

  async verifyPayment(
    providerRef: string,
  ): Promise<PaymentVerification> {
    const paymentIntent = await stripeRequest("GET", `/v1/payment_intents/${providerRef}`);

    const statusMap: Record<
      string,
      | "PENDING"
      | "PROCESSING"
      | "COMPLETED"
      | "FAILED"
      | "REFUNDED"
      | "CANCELED"
    > = {
      requires_payment_method: "PENDING",
      requires_confirmation: "PROCESSING",
      requires_action: "PROCESSING",
      processing: "PROCESSING",
      succeeded: "COMPLETED",
      canceled: "CANCELED",
    };

    const status = statusMap[paymentIntent.status] ?? "PENDING";
    const amountCLP = paymentIntent.amount
      ? Math.round(paymentIntent.amount * 100)
      : undefined;

    return {
      status,
      amountCLP,
      rawData: paymentIntent,
    };
  },

  async refundPayment({
    providerRef,
    amountCLP,
    reason,
  }: {
    providerRef: string;
    amountCLP?: number;
    reason?: string;
  }): Promise<PaymentVerification> {
    const refund = await stripeRequest("POST", "/v1/refunds", {
      payment_intent: providerRef,
      ...(amountCLP ? { amount: Math.round(amountCLP / 100).toString() } : {}),
      reason: reason ? "requested_by_customer" : "duplicate",
      "metadata[reason]": reason ?? "",
    });

    return {
      status: refund.status === "succeeded" ? "REFUNDED" : "FAILED",
      rawData: refund,
    };
  },
};