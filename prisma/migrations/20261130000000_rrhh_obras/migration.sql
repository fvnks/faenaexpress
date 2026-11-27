-- Las remuneraciones y las liquidaciones pueden imputarse a una obra para
-- que la mano de obra llegue al costo real como sourceType PAYROLL.

-- AlterTable
ALTER TABLE "Remuneration" ADD COLUMN "obraId" TEXT;
ALTER TABLE "PayrollEntry" ADD COLUMN "obraId" TEXT;

-- CreateIndex
CREATE INDEX "Remuneration_obraId_idx" ON "Remuneration"("obraId");
CREATE INDEX "PayrollEntry_obraId_idx" ON "PayrollEntry"("obraId");

-- AddForeignKey
ALTER TABLE "Remuneration" ADD CONSTRAINT "Remuneration_obraId_fkey" FOREIGN KEY ("obraId") REFERENCES "Obra"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PayrollEntry" ADD CONSTRAINT "PayrollEntry_obraId_fkey" FOREIGN KEY ("obraId") REFERENCES "Obra"("id") ON DELETE SET NULL ON UPDATE CASCADE;
