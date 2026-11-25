// Acceso a datos de centros de costo. Todo filtrado por companyId: el
// aislamiento entre empresas depende de esto, igual que en catálogos.

import { db } from "@/lib/db";
import { documentSign } from "@/lib/money";
import { saleSettleTotal } from "@/lib/payments";

export function listCentrosCosto(companyId: string) {
  return db.centroCosto.findMany({
    where: { companyId },
    orderBy: [{ active: "desc" }, { codigo: "asc" }],
    include: { _count: { select: { repartos: true, gastos: true, categorias: true } } },
  });
}

/**
 * Centro que se imputa a un gasto indirecto, en orden de prioridad:
 * 1) el que eligió la persona en el formulario;
 * 2) el centro por defecto de la categoría (gasolina → Vehículos);
 * 3) el centro «sin asignar» de la empresa, para que ningún gasto quede fuera.
 *
 * Se resuelve también en el servidor: el formulario puede prellenar, pero un
 * POST directo no debe poder saltarse la imputación.
 */
export async function resolverCentroGasto(
  companyId: string,
  categoryId: string | undefined,
  centroCostoElegido: string | undefined,
): Promise<{ centroCostoId: string | null; error?: string }> {
  if (centroCostoElegido) {
    const centro = await db.centroCosto.findFirst({
      where: { id: centroCostoElegido, companyId },
      select: { id: true },
    });
    if (!centro) return { centroCostoId: null, error: "Ese centro de costo no pertenece a la empresa." };
    return { centroCostoId: centro.id };
  }

  if (categoryId) {
    const categoria = await db.category.findFirst({
      where: { id: categoryId, companyId },
      select: { centroCosto: { select: { id: true, active: true } } },
    });
    if (categoria?.centroCosto?.active) return { centroCostoId: categoria.centroCosto.id };
  }

  const general = await db.centroCosto.findFirst({
    where: { companyId, esSinAsignar: true, active: true },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });
  return { centroCostoId: general?.id ?? null };
}

/** El centro por defecto de una categoría debe ser de la empresa y estar activo. */
export async function validarCentroDeCategoria(
  companyId: string,
  centroCostoId: string | undefined,
  anteriorId?: string | null,
): Promise<string | null> {
  if (!centroCostoId) return null;
  const centro = await db.centroCosto.findFirst({
    where: { id: centroCostoId, companyId },
    select: { id: true, active: true },
  });
  if (!centro) return "Ese centro de costo no pertenece a la empresa.";
  if (!centro.active && centro.id !== anteriorId) return "Ese centro de costo está inactivo.";
  return null;
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
