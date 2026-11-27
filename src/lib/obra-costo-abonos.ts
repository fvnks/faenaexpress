// Costo real de una compra con abonos: un documento, una sola fuente.
// El costo pendiente vive en `PURCHASE` y cada abono en `PAYMENT`, de modo que
// `PURCHASE + PAYMENT = total de la compra` y el abono nunca se cuenta dos veces.

import type { Prisma } from "@/generated/prisma/client";

type Base = {
  purchaseId: string;
  obraId: string;
  totalCompra: number;
  descripcionCompra: string;
};

async function ajustarPendiente(
  tx: Prisma.TransactionClient,
  input: Base,
): Promise<void> {
  const abonado = await tx.payment.aggregate({
    where: { purchaseId: input.purchaseId },
    _sum: { amount: true },
  });
  const pendiente = Math.round((input.totalCompra - (abonado._sum.amount ?? 0)) * 100) / 100;
  await tx.costoObra.upsert({
    where: { sourceType_sourceId: { sourceType: "PURCHASE", sourceId: input.purchaseId } },
    create: {
      obraId: input.obraId,
      partidaId: null,
      sourceType: "PURCHASE",
      sourceId: input.purchaseId,
      descripcion: input.descripcionCompra.slice(0, 300),
      monto: pendiente,
      fecha: new Date(),
    },
    update: { monto: pendiente },
  });
}

/** Registra el abono como `PAYMENT` y deja `PURCHASE` en total − abonado. */
export async function sincronizarCostoAbono(
  tx: Prisma.TransactionClient,
  input: Base & { paymentId: string; monto: number; fecha: Date; descripcionAbono: string },
): Promise<void> {
  await tx.costoObra.upsert({
    where: { sourceType_sourceId: { sourceType: "PAYMENT", sourceId: input.paymentId } },
    create: {
      obraId: input.obraId,
      partidaId: null,
      sourceType: "PAYMENT",
      sourceId: input.paymentId,
      descripcion: input.descripcionAbono.slice(0, 300),
      monto: input.monto,
      fecha: input.fecha,
    },
    update: { monto: input.monto, fecha: input.fecha },
  });
  await ajustarPendiente(tx, input);
}

/** Quita el `PAYMENT` y vuelve a calcular el pendiente del `PURCHASE`. */
export async function sincronizarCostoAbonoEliminado(
  tx: Prisma.TransactionClient,
  input: Base & { paymentId: string },
): Promise<void> {
  await tx.costoObra.deleteMany({
    where: { sourceType: "PAYMENT", sourceId: input.paymentId },
  });
  await ajustarPendiente(tx, input);
}
