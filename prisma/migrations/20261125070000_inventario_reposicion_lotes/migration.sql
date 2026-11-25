-- Idempotente a propósito: si un deploy anterior dejó parte del schema,
-- reintentar la migración no debe volver a fallar.
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "reorderPoint" DECIMAL(14,3);
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "reorderQty" DECIMAL(14,3);
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "leadTimeDays" INTEGER;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "trackLots" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "StockMovement" ADD COLUMN IF NOT EXISTS "lotId" TEXT;

CREATE INDEX IF NOT EXISTS "StockMovement_lotId_idx" ON "StockMovement"("lotId");

DO $mig$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'StockMovement_lotId_fkey') THEN
    ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_lotId_fkey"
      FOREIGN KEY ("lotId") REFERENCES "ProductLot"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$mig$;

ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'LOW_STOCK';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'LOT_EXPIRING';
