-- Los gastos indirectos (gasolina, luz, arriendo...) también tienen centro de
-- costo. La categoría guarda el centro por defecto y el gasto guarda el centro
-- imputado (automático o elegido a mano).

-- AlterTable
ALTER TABLE "Category" ADD COLUMN "centroCostoId" TEXT;
ALTER TABLE "Expense" ADD COLUMN "centroCostoId" TEXT;
ALTER TABLE "CentroCosto" ADD COLUMN "esSinAsignar" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Category_companyId_centroCostoId_idx" ON "Category"("companyId", "centroCostoId");
CREATE INDEX "Expense_companyId_centroCostoId_idx" ON "Expense"("companyId", "centroCostoId");

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_centroCostoId_fkey" FOREIGN KEY ("centroCostoId") REFERENCES "CentroCosto"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_centroCostoId_fkey" FOREIGN KEY ("centroCostoId") REFERENCES "CentroCosto"("id") ON DELETE SET NULL ON UPDATE CASCADE;
