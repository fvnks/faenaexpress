// Proveedor Flow (Webpay / Flow.cl)
//
// Documentación: https://developer.flow.cl/
// Requiere: FLOW_API_KEY, FLOW_SECRET_KEY, FLOW_COMMERCE_ID (opcional)
//
// Variables de entorno:
//   FLOW_API_KEY, FLOW_SECRET_KEY
//   FLOW_COMMERCE_ID (opcional)
//   FLOW_ENV: production | sandbox (default: sandbox)
//   NEXT_PUBLIC_APP_URL
//
"use server";

import type { PaymentProvider, PaymentIntent, PaymentVerification } from "./index";

const FLOW_BASE_URL =
  process.env.FLOW_ENV === "production"
    ? "https://api.flow.cl"
    : "https://sandbox.flow.cl/api";

function generateSignature(
  params: Record<string, string>,
  secretKey: string,
): string {
  const crypto = require("crypto");
  const sortedKeys = Object.keys(params).sort();
  const stringToSign = sortedKeys.map((k) => `${k}${params[k]}`).join("");
  return crypto.createHmac("sha256", secretKey).update(stringToSign).digest("hex");
}

async function flowRequest(
  endpoint: string,
  params: Record<string, string>,
): Promise<any> {
  const apiKey = process.env.FLOW_API_KEY!;
  const secretKey = process.env.FLOW_SECRET_KEY!;
  const commerceId = process.env.FLOW_COMMERCE_ID;

  const paramsWithAuth: Record<string, string> = {
    ...params,
    apiKey,
    ...(commerceId ? { commerceId } : {}),
  };

  const signature = generateSignature(paramsWithAuth, secretKey);

  const response = await fetch(`${FLOW_BASE_URL}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ ...paramsWithAuth, s: signature }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Flow API error: ${response.status} ${text}`);
  }

  return response.json();
}

export const flowProvider: PaymentProvider = {
  name: "FLOW",
  displayName: "Flow (Webpay / Tarjeta)",
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
    const order = metadata.invoiceId ?? `inv-${Date.now()}`;
    const amount = Math.round(amountCLP / 100); // Flow usa pesos enteros

    const params: Record<string, string> = {
      amount: String(amount),
      commerceOrder: order,
      subject: description,
      currency: "CLP",
      email: metadata.customerEmail ?? "",
      urlConfirmation: `${process.env.NEXT_PUBLIC_APP_URL}/billing/flow/callback`,
      urlReturn: returnUrl,
      optional: JSON.stringify({ ...metadata, flowOrder: order }),
    };

    const response = await flowRequest("/payment/create", params);
    if (!response.token || !response.url) {
      throw new Error(
        "Flow no devolvió token/url: " + JSON.stringify(response),
      );
    }

    return {
      paymentUrl: `${FLOW_BASE_URL}/payment/pay/${response.token}`,
      providerRef: response.token,
      amountCLP,
      currency: "CLP",
      metadata: { flowToken: response.token, flowOrder: order },
    };
  },

  async verifyPayment(
    providerRef: string,
  ): Promise<PaymentVerification> {
    const params = { token: providerRef };
    const response = await flowRequest("/payment/getStatus", params);

    const statusMap: Record<
      string,
      | "PENDING"
      | "PROCESSING"
      | "COMPLETED"
      | "FAILED"
      | "REFUNDED"
      | "CANCELED"
    > = {
      1: "PENDING",
      2: "COMPLETED",
      3: "FAILED",
      4: "CANCELED",
      5: "REFUNDED",
      6: "REFUNDED",
      7: "PENDING",
      8: "CANCELED",
    };

    const status =
      statusMap[String(response.status)] ?? "PENDING";
    const amountCLP = response.amount
      ? Math.round(Number(response.amount) * 100)
      : undefined;

    return {
      status,
      amountCLP,
      rawData: response,
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
    const params: Record<string, string> = {
      token: providerRef,
      ...(amountCLP ? { amount: String(Math.round(amountCLP / 100)) } : {}),
      cause: reason ?? "Solicitud de cliente",
    };

    const response = await flowRequest("/payment/refund", params);
    return {
      status: response.status === 0 ? "REFUNDED" : "FAILED",
      rawData: response,
    };
  },
};