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
import { db } from "@/lib/db";

export const FORMAS_DE_PAGO_BASE = [
  "Efectivo",
  "Transferencia",
  "Tarjeta de crédito",
  "Tarjeta de débito",
  "Cheque",
  "Otro",
] as const;

/**
 * Las formas de pago que ya usa la empresa en sus documentos.
 *
 * Una forma puede desaparecer del catálogo (si la desactivan) o cambiar de
 * nombre, pero los documentos oldos la conservan: si al editarlos no aparece,
 * el dato se pierde en silencio. Por eso también se ofrecen.
 */
export async function listPaymentMethodsInUse(companyId: string): Promise<string[]> {
  const rows = await db.$queryRaw<{ medio: string }[]>`
    SELECT DISTINCT medio FROM (
      SELECT "paymentMethod" AS medio FROM "Purchase"
        WHERE "companyId" = ${companyId} AND "paymentMethod" IS NOT NULL
      UNION
      SELECT "paymentMethod" FROM "Sale"
        WHERE "companyId" = ${companyId} AND "paymentMethod" IS NOT NULL
      UNION
      SELECT "paymentMethod" FROM "Expense"
        WHERE "companyId" = ${companyId} AND "paymentMethod" IS NOT NULL
      UNION
      SELECT "method" FROM "Payment"
        WHERE "companyId" = ${companyId} AND "method" IS NOT NULL
    ) t
    WHERE medio <> ''
  `;
  return rows.map((row) => row.medio);
}

/**
 * Las formas de pago que se ofrecen para una empresa: su catálogo, las que ya
 * usan sus documentos y, si no hay catálogo, las formas base.
 */
export async function paymentMethodOptions(companyId: string): Promise<string[]> {
  const [catalogo, enUso] = await Promise.all([
    listPaymentMethods(companyId),
    listPaymentMethodsInUse(companyId),
  ]);

  const nombres: string[] = [];
  const agregar = (nombre: string) => {
    if (!nombre) return;
    if (!nombres.some((n) => n.toLowerCase() === nombre.toLowerCase())) nombres.push(nombre);
  };

  for (const metodo of catalogo) agregar(metodo.name);
  for (const metodo of enUso) agregar(metodo);

  // Una empresa sin catálogo no se queda sin formas de pago.
  if (nombres.length === 0) for (const base of FORMAS_DE_PAGO_BASE) agregar(base);

  return nombres;
}
