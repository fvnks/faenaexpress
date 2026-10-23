// Abstracción de proveedores de pago para facturación SaaS.
//
// Cada proveedor implementa la misma interfaz:
// - createPayment: inicia un pago y devuelve URL + referencia
// - verifyPayment: verifica el estado de un pago
// - refundPayment: reembolsa (si el proveedor lo soporta)
//
// Las credenciales se leen de variables de entorno, no se guardan en BD.

export type PaymentProviderName = "FLOW" | "MERCADOPAGO" | "TRANSFER" | "MANUAL" | "CARD";

export interface PaymentIntent {
  /** URL a la que redirigir al usuario para pagar */
  paymentUrl: string;
  /** Referencia única en el proveedor (para consultar estado luego) */
  providerRef: string;
  /** Monto en centavos (CLP) */
  amountCLP: number;
  /** Moneda */
  currency: string;
  /** Datos extra para guardar en la transacción */
  metadata?: Record<string, string>;
}

export interface PaymentVerification {
  /** Estado del pago en el proveedor */
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "REFUNDED" | "CANCELED";
  /** Monto confirmado (en centavos) */
  amountCLP?: number;
  /** Datos crudos de la respuesta del proveedor */
  rawData?: Record<string, unknown>;
}

export interface PaymentProvider {
  /** Nombre técnico del proveedor */
  readonly name: PaymentProviderName;
  /** Nombre visible para el usuario */
  readonly displayName: string;
  /** Si requiere redirección del usuario (Flow, MercadoPago) */
  readonly requiresRedirect: boolean;
  /** Si soporta reembolsos */
  readonly supportsRefund: boolean;

  /**
   * Crea una intención de pago.
   * @param amountCLP Monto en centavos (CLP)
   * @param description Descripción del pago
   * @param returnUrl URL a la que volver tras pagar
   * @param metadata Datos extra (invoiceId, organizationId, etc.)
   */
  createPayment(params: {
    amountCLP: number;
    description: string;
    returnUrl: string;
    metadata: Record<string, string>;
  }): Promise<PaymentIntent>;

  /**
   * Verifica el estado de un pago usando la referencia del proveedor.
   */
  verifyPayment(providerRef: string): Promise<PaymentVerification>;

  /**
   * Solicita un reembolso (si el proveedor lo soporta).
   */
  refundPayment?(params: {
    providerRef: string;
    amountCLP?: number;
    reason?: string;
  }): Promise<PaymentVerification>;
}

/** Factory para obtener el proveedor por nombre. */
export function getPaymentProvider(
  name: PaymentProviderName,
): Promise<PaymentProvider> {
  // Importación dinámica para no cargar SDKs innecesarios
  switch (name) {
    case "FLOW":
      return import("./flow").then((m) => m.flowProvider);
    case "MERCADOPAGO":
      return import("./mercadopago").then((m) => m.mercadoPagoProvider);
    case "TRANSFER":
      return import("./manual").then((m) => m.manualProvider);
    case "MANUAL":
      return import("./manual").then((m) => m.manualProvider);
    case "CARD":
      return import("./stripe.server").then((m) => m.stripeProvider);
    default:
      throw new Error(`Proveedor desconocido: ${name}`);
  }
}

/** Verifica si un proveedor está configurado (tiene credenciales). */
export function isProviderConfigured(
  name: PaymentProviderName,
): boolean {
  switch (name) {
    case "FLOW":
      return !!process.env.FLOW_API_KEY && !!process.env.FLOW_SECRET_KEY;
    case "MERCADOPAGO":
      return !!process.env.MERCADOPAGO_ACCESS_TOKEN;
    case "TRANSFER":
    case "MANUAL":
      return true; // No requiere credenciales externas
    case "CARD":
      return !!process.env.STRIPE_SECRET_KEY;
    default:
      return false;
  }
}

/** Lista de proveedores disponibles (configurados o no). */
export const PAYMENT_PROVIDERS: {
  name: PaymentProviderName;
  configured: boolean;
}[] = [
  { name: "FLOW", configured: !!process.env.FLOW_API_KEY && !!process.env.FLOW_SECRET_KEY },
  { name: "MERCADOPAGO", configured: !!process.env.MERCADOPAGO_ACCESS_TOKEN },
  { name: "TRANSFER", configured: true },
  { name: "MANUAL", configured: true },
  { name: "CARD", configured: !!process.env.STRIPE_SECRET_KEY },
];

/** Obtiene el proveedor por defecto (el primero configurado, o MANUAL). */
export async function getDefaultProvider(): Promise<PaymentProviderName> {
  for (const p of PAYMENT_PROVIDERS) {
    if (p.configured) return p.name;
  }
  return "MANUAL";
}