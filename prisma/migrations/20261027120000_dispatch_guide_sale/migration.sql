-- AlterTable
ALTER TABLE "DispatchGuide" ADD COLUMN "saleId" TEXT;

-- CreateIndex
CREATE INDEX "DispatchGuide_saleId_idx" ON "DispatchGuide"("saleId");

-- AddForeignKey
ALTER TABLE "DispatchGuide" ADD CONSTRAINT "DispatchGuide_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE SET NULL ON UPDATE CASCADE;
