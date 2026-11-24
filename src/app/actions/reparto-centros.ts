"use server";

import { revalidatePath } from "next/cache";

import { canWrite, requireContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { documentSign } from "@/lib/money";
import { saleSettleTotal } from "@/lib/payments";

export type RepartoFormState = { error?: string; ok?: boolean; message?: string } | undefined;

type Fila = { centroCostoId: string; monto: number };

/** Guarda el reparto completo de una factura entre centros de costo.
 *  Reemplaza las filas anteriores en una transacción. La suma debe cuadrar
 *  exactamente con el total asignable del documento (ya con signo de NC). */
export async function guardarRepartoCentroCosto(
  _prev: RepartoFormState,
  formData: FormData,
): Promise<RepartoFormState> {
  const ctx = await requireContext();
  const kind = String(formData.get("kind") ?? "");
  const documentId = String(formData.get("documentId") ?? "");
  if (kind !== "purchase" && kind !== "sale") return { error: "Tipo de documento no válido." };
  const seccion = kind === "purchase" ? "compras" : "ventas";
  if (!canWrite(ctx, seccion)) return { error: "No tienes permiso para asignar centros de costo." };
  if (!documentId) return { error: "Falta el documento." };

  let filas: Fila[] = [];
  try {
    const crudo = JSON.parse(String(formData.get("repartos") ?? "[]"));
    if (!Array.isArray(crudo)) throw new Error();
    filas = crudo.map((f) => ({
      centroCostoId: String(f?.centroCostoId ?? ""),
      monto: Math.round(Number(String(f?.monto ?? "").replace(",", "."))),
    }));
  } catch {
    return { error: "El reparto enviado no es válido." };
  }
  if (filas.some((f) => !f.centroCostoId || !Number.isFinite(f.monto) || f.monto === 0)) {
    return { error: "Cada centro debe tener un monto distinto de cero." };
  }
  // Un mismo centro no puede repetirse: se sumaría dos veces el mismo registro.
  const ids = [...new Set(filas.map((f) => f.centroCostoId))];
  if (ids.length !== filas.length) return { error: "No repitas un centro de costo." };

  let total: number;
  if (kind === "purchase") {
    const doc = await db.purchase.findFirst({
      where: { id: documentId, companyId: ctx.company.id },
      select: { totalAmount: true, documentType: true },
    });
    if (!doc) return { error: "La compra no existe o no pertenece a tu empresa." };
    total = documentSign(doc.documentType) * doc.totalAmount;
  } else {
    const doc = await db.sale.findFirst({
      where: { id: documentId, companyId: ctx.company.id },
      select: { totalAmount: true, retentionAmount: true, documentType: true },
    });
    if (!doc) return { error: "La venta no existe o no pertenece a tu empresa." };
    total = documentSign(doc.documentType) * saleSettleTotal(doc.totalAmount, doc.retentionAmount);
  }

  if (filas.length > 0) {
    const existentes = await db.centroCosto.count({
      where: { id: { in: ids }, companyId: ctx.company.id },
    });
    if (existentes !== ids.length) return { error: "Algún centro de costo no existe." };
    // Un centro inactivo puede conservarse si ya estaba asignado a ESTE documento;
    // lo que no se permite es agregar uno nuevo que esté dado de baja.
    const anteriores = await db.repartoCentroCosto.findMany({
      where: {
        companyId: ctx.company.id,
        ...(kind === "purchase" ? { purchaseId: documentId } : { saleId: documentId }),
      },
      select: { centroCostoId: true },
    });
    const permitidos = new Set(anteriores.map((a) => a.centroCostoId));
    const inactivos = await db.centroCosto.findMany({
      where: { id: { in: ids }, companyId: ctx.company.id, active: false },
      select: { id: true },
    });
    if (inactivos.some((c) => !permitidos.has(c.id))) {
      return { error: "No puedes asignar un centro de costo inactivo." };
    }
    const suma = filas.reduce((acc, f) => acc + f.monto, 0);
    if (suma !== total) {
      return {
        error: `El reparto suma $${suma.toLocaleString("es-CL")} pero el documento es $${total.toLocaleString("es-CL")}. Ajusta los montos.`,
      };
    }
  }

  await db.$transaction(async (tx) => {
    await tx.repartoCentroCosto.deleteMany({
      where: {
        companyId: ctx.company.id,
        ...(kind === "purchase" ? { purchaseId: documentId } : { saleId: documentId }),
      },
    });
    if (filas.length > 0) {
      await tx.repartoCentroCosto.createMany({
        data: filas.map((f) => ({
          companyId: ctx.company.id,
          centroCostoId: f.centroCostoId,
          purchaseId: kind === "purchase" ? documentId : null,
          saleId: kind === "sale" ? documentId : null,
          monto: f.monto,
        })),
      });
    }
  });

  const ruta = kind === "purchase" ? `/facturas/compras/${documentId}` : `/facturas/ventas/${documentId}`;
  revalidatePath(ruta);
  revalidatePath("/facturas/reportes/centros-costo");
  revalidatePath(kind === "purchase" ? "/facturas/compras" : "/facturas/ventas");
  return {
    ok: true,
    message: filas.length > 0 ? "Reparto guardado." : "Factura sin centro de costo asignado.",
  };
}
