// Las formas de pago de una empresa.
//
// Antes eran un enum fijo (Efectivo, Transferencia, Tarjeta de crédito, Cheque…),
// pero cada empresa tiene las formas de pago que necesita: la tarjeta de un banco
// concreto, un vale, una transferencia a una cuenta particular. El catálogo
// (`PaymentMethodCatalog`) es lo que la empresa administra en Catálogos, así que
// es lo que se ofrece al marcar un documento como pagado.
//
// Estas son las formas base: se siembran en el catálogo de cada empresa, y
// además se ofrecen siempre, para que una empresa sin catálogo no se quede sin
// opciones.

import { listPaymentMethods } from "@/lib/catalogs";

export const FORMAS_DE_PAGO_BASE = [
  "Efectivo",
  "Transferencia",
  "Tarjeta de crédito",
  "Tarjeta de débito",
  "Cheque",
  "Otro",
] as const;

/** Las formas de pago que se ofrecen para una empresa: su catálogo + las base. */
export async function paymentMethodOptions(companyId: string): Promise<string[]> {
  const catalogo = await listPaymentMethods(companyId);
  const nombres = catalogo.map((m) => m.name);
  for (const base of FORMAS_DE_PAGO_BASE) {
    if (!nombres.some((n) => n.toLowerCase() === base.toLowerCase())) {
      nombres.push(base);
    }
  }
  return nombres;
}
