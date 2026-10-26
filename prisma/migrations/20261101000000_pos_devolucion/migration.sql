-- Devoluciones del POS: una devolución es una PosSale con los montos en
-- negativo, ligada al ticket original (relatedSaleId).

-- AlterTable
ALTER TABLE "PosSale" ADD COLUMN "relatedSaleId" TEXT;

-- AddForeignKey
ALTER TABLE "PosSale" ADD CONSTRAINT "PosSale_relatedSaleId_fkey" FOREIGN KEY ("relatedSaleId") REFERENCES "PosSale"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "PosSale_relatedSaleId_idx" ON "PosSale"("relatedSaleId");
