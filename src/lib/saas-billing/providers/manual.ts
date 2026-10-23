// Proveedor Manual / Transferencia bancaria
//
// Para pagos por transferencia, efectivo, cheque, etc.
// No requiere credenciales externas. El pago se confirma manualmente.

import type { PaymentProvider, PaymentIntent, PaymentVerification } from "./index";

export const manualProvider: PaymentProvider = {
  name: "MANUAL",
  displayName: "Transferencia / Manual",
  requiresRedirect: false,
  supportsRefund: false,

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
    const reference = `MAN-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const bankInfo = {
      banco: "Banco Estado",
      cuenta: "Cuenta Corriente 1234567890",
      rut: "76.123.456-7",
      titular: "Yellow ERP SpA",
      email: "pagos@yellow-erp.cl",
    };

    return {
      paymentUrl: `${process.env.NEXT_PUBLIC_APP_URL}/billing/pagar/${metadata.invoiceId}?ref=${encodeURIComponent(reference)}`,
      providerRef: reference,
      amountCLP,
      currency: "CLP",
      metadata: {
        bankInfo: JSON.stringify(bankInfo),
        reference,
        instructions: `Transfiera $${(amountCLP / 100).toLocaleString("es-CL")} CLP a los datos arriba indicados. Incluya la referencia ${reference} en el asunto.`,
      },
    };
  },

  async verifyPayment(
    providerRef: string,
  ): Promise<PaymentVerification> {
    return {
      status: "PENDING",
      rawData: { message: "Pago manual pendiente de confirmación administrativa", reference: providerRef },
    };
  },
};