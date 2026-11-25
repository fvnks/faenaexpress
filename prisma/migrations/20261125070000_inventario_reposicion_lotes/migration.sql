-- AlterTable
ALTER TABLE "Product" ADD COLUMN "reorderPoint" DECIMAL(14,3),
ADD COLUMN "reorderQty" DECIMAL(14,3),
ADD COLUMN "leadTimeDays" INTEGER,
ADD COLUMN "trackLots" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "StockMovement" ADD COLUMN "lotId" TEXT;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "ProductLot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "StockMovement_lotId_idx" ON "StockMovement"("lotId");

-- AlterEnum: tipos de alerta de inventario
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'LOW_STOCK';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'LOT_EXPIRING';
