-- AlterTable
ALTER TABLE "Sale" ADD COLUMN "relatedSaleId" TEXT;

-- CreateIndex
CREATE INDEX "Sale_companyId_relatedSaleId_idx" ON "Sale"("companyId", "relatedSaleId");

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_relatedSaleId_fkey" FOREIGN KEY ("relatedSaleId") REFERENCES "Sale"("id") ON DELETE SET NULL ON UPDATE CASCADE;
