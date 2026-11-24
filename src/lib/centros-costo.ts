// Acceso a datos de centros de costo. Todo filtrado por companyId: el
// aislamiento entre empresas depende de esto, igual que en catálogos.

import { db } from "@/lib/db";
import { documentSign } from "@/lib/money";
import { saleSettleTotal } from "@/lib/payments";

export function listCentrosCosto(companyId: string) {
  return db.centroCosto.findMany({
    where: { companyId },
    orderBy: [{ active: "desc" }, { codigo: "asc" }],
    include: { _count: { select: { repartos: true } } },
  });
}

export function listReparto(
  companyId: string,
  kind: "purchase" | "sale",
  documentId: string,
) {
  return db.repartoCentroCosto.findMany({
    where: {
      companyId,
      ...(kind === "purchase" ? { purchaseId: documentId } : { saleId: documentId }),
    },
    orderBy: { centroCosto: { codigo: "asc" } },
    select: { id: true, centroCostoId: true, monto: true, centroCosto: { select: { id: true, codigo: true, nombre: true } } },
  });
}

/** Total que se puede distribuir en una factura (ya con signo de nota de crédito). */
export async function totalAsignable(
  companyId: string,
  kind: "purchase" | "sale",
  documentId: string,
): Promise<number | null> {
  if (kind === "purchase") {
    const doc = await db.purchase.findFirst({
      where: { id: documentId, companyId },
      select: { totalAmount: true, documentType: true },
    });
    return doc ? documentSign(doc.documentType) * doc.totalAmount : null;
  }
  const doc = await db.sale.findFirst({
    where: { id: documentId, companyId },
    select: { totalAmount: true, retentionAmount: true, documentType: true },
  });
  return doc ? documentSign(doc.documentType) * saleSettleTotal(doc.totalAmount, doc.retentionAmount) : null;
}
