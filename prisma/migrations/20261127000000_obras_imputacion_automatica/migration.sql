-- Las compras y los gastos pueden imputarse a una obra al momento de guardarse.
-- El CostoObra se crea en la misma transacción (sourceType PURCHASE/EXPENSE),
-- sin tener que volver a la pestaña de imputación manual.

-- AlterTable
ALTER TABLE "Purchase" ADD COLUMN "obraId" TEXT;
ALTER TABLE "Expense" ADD COLUMN "obraId" TEXT;

-- CreateIndex
CREATE INDEX "Purchase_obraId_idx" ON "Purchase"("obraId");
CREATE INDEX "Expense_obraId_idx" ON "Expense"("obraId");

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_obraId_fkey" FOREIGN KEY ("obraId") REFERENCES "Obra"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_obraId_fkey" FOREIGN KEY ("obraId") REFERENCES "Obra"("id") ON DELETE SET NULL ON UPDATE CASCADE;
