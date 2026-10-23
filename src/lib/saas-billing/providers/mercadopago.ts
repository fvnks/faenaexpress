// Proveedor Mercado Pago (Checkout Pro)
//
// Documentación: https://www.mercadopago.com/developers/es/docs/checkout-pro/landing
// Requiere: MERCADOPAGO_ACCESS_TOKEN
//
// Variables de entorno:
//   MERCADOPAGO_ACCESS_TOKEN
//   MERCADOPAGO_ENV: production | sandbox
//   NEXT_PUBLIC_APP_URL
//
"use server";

import type { PaymentProvider, PaymentIntent, PaymentVerification } from "./index";

const MP_BASE_URL =
  process.env.MERCADOPAGO_ENV === "production"
    ? "https://api.mercadopago.com"
    : "https://api.mercadopago.com";

async function mpRequest(
  endpoint: string,
  method: "GET" | "POST" | "PUT",
  body?: any,
): Promise<any> {
  const response = await fetch(`${MP_BASE_URL}${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `MercadoPago API error: ${response.status} ${text}`,
    );
  }

  return response.json();
}

export const mercadoPagoProvider: PaymentProvider = {
  name: "MERCADOPAGO",
  displayName: "Mercado Pago",
  requiresRedirect: true,
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
    const externalReference = metadata.invoiceId ?? `inv-${Date.now()}`;
    const amount = amountCLP / 100; // MercadoPago usa pesos con decimales

    const preference = {
      items: [
        {
          title: description,
          quantity: 1,
          currency_id: "CLP",
          unit_price: amount,
        },
      ],
      external_reference: externalReference,
      back_urls: {
        success: `${process.env.NEXT_PUBLIC_APP_URL}/billing/mercadopago/success`,
        failure: `${process.env.NEXT_PUBLIC_APP_URL}/billing/mercadopago/failure`,
        pending: `${process.env.NEXT_PUBLIC_APP_URL}/billing/mercadopago/pending`,
      },
      auto_return: "approved",
      notification_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing/mercadopago/webhook`,
      metadata: {
        invoiceId: metadata.invoiceId,
        organizationId: metadata.organizationId,
      },
    };

    const response = await mpRequest("/checkout/preferences", "POST", preference);
    if (!response.id || !response.init_point) {
      throw new Error(
        "MercadoPago no devolvió preferencia: " + JSON.stringify(response),
      );
    }

    return {
      paymentUrl: response.init_point,
      providerRef: response.id,
      amountCLP: Math.round(amount * 100),
      currency: "CLP",
      metadata: { mpPreferenceId: response.id },
    };
  },

  async verifyPayment(
    providerRef: string,
  ): Promise<PaymentVerification> {
    // providerRef es el preference_id, buscamos el payment por external_reference
    const search = await mpRequest(
      `/v1/payments/search?external_reference=${providerRef}`,
      "GET",
    );
    const payment = search.results?.[0];

    if (!payment) {
      return {
        status: "PENDING",
        rawData: { message: "Pago no encontrado aún" },
      };
    }

    const statusMap: Record<
      string,
      | "PENDING"
      | "PROCESSING"
      | "COMPLETED"
      | "FAILED"
      | "REFUNDED"
      | "CANCELED"
    > = {
      pending: "PENDING",
      approved: "COMPLETED",
      authorized: "PROCESSING",
      in_process: "PROCESSING",
      in_mediation: "PROCESSING",
      rejected: "FAILED",
      cancelled: "CANCELED",
      refunded: "REFUNDED",
      charged_back: "REFUNDED",
    };

    const status = statusMap[payment.status] ?? "PENDING";
    const amountCLP = payment.transaction_amount
      ? Math.round(Number(payment.transaction_amount) * 100)
      : undefined;

    return {
      status,
      amountCLP,
      rawData: payment,
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
    const paymentId = providerRef; // payment_id de MercadoPago
    const body: Record<string, unknown> = {};
    if (amountCLP) body.amount = amountCLP / 100;
    if (reason) body.reason = reason;

    const response = await mpRequest(
      `/v1/payments/${paymentId}/refunds`,
      "POST",
      body,
    );
    return {
      status: response.status === "approved" ? "REFUNDED" : "FAILED",
      rawData: response,
    };
  },
};