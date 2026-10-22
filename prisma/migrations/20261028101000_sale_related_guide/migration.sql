-- AlterTable
ALTER TABLE "Sale" ADD COLUMN "relatedGuideId" TEXT;

-- CreateIndex
CREATE INDEX "Sale_companyId_relatedGuideId_idx" ON "Sale"("companyId", "relatedGuideId");

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_relatedGuideId_fkey" FOREIGN KEY ("relatedGuideId") REFERENCES "DispatchGuide"("id") ON DELETE SET NULL ON UPDATE CASCADE;
