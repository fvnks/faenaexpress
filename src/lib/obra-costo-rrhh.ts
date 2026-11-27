// La mano de obra imputada a una obra entra al costo real como `PAYROLL`.
// `sourceId` es la remuneración (o la liquidación de nómina), nunca el gasto:
// un documento = una sola fuente, para no duplicar el `Expense` automático.

import type { Prisma } from "@/generated/prisma/client";

export async function sincronizarCostoNomina(
  tx: Prisma.TransactionClient,
  input: {
    sourceId: string;
    obraId: string;
    monto: number;
    fecha: Date;
    descripcion: string;
  },
): Promise<void> {
  await tx.costoObra.upsert({
    where: { sourceType_sourceId: { sourceType: "PAYROLL", sourceId: input.sourceId } },
    create: {
      obraId: input.obraId,
      partidaId: null,
      sourceType: "PAYROLL",
      sourceId: input.sourceId,
      descripcion: input.descripcion.slice(0, 300),
      monto: input.monto,
      fecha: input.fecha,
    },
    update: { obraId: input.obraId, monto: input.monto, fecha: input.fecha },
  });
}
