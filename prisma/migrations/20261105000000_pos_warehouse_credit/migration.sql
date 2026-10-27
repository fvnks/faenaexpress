-- POS: stock por bodega y venta a crédito / cuenta corriente.
-- 1. Agrega warehouseId a PosSession para saber qué bodega usa cada caja.
-- 2. Agrega amountPaid / balanceDue / creditDueDate a PosSale para ventas a crédito.
-- 3. Agrega el estado PENDING al enum PosSaleStatus.

-- 1. warehouseId en PosSession
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'PosSession' AND column_name = 'warehouseId'
    ) THEN
        ALTER TABLE "PosSession" ADD COLUMN "warehouseId" TEXT;
    END IF;
END $$;

DO $$ BEGIN
    ALTER TABLE "PosSession" ADD CONSTRAINT "PosSession_warehouseId_fkey"
        FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "PosSession_warehouseId_idx" ON "PosSession"("warehouseId");

-- 2. Campos de crédito en PosSale
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'PosSale' AND column_name = 'amountPaid'
    ) THEN
        ALTER TABLE "PosSale" ADD COLUMN "amountPaid" INTEGER NOT NULL DEFAULT 0;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'PosSale' AND column_name = 'balanceDue'
    ) THEN
        ALTER TABLE "PosSale" ADD COLUMN "balanceDue" INTEGER NOT NULL DEFAULT 0;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'PosSale' AND column_name = 'creditDueDate'
    ) THEN
        ALTER TABLE "PosSale" ADD COLUMN "creditDueDate" TIMESTAMP(3);
    END IF;
END $$;

-- 3. Estado PENDING en el enum PosSaleStatus
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'PosSaleStatus' AND e.enumlabel = 'PENDING'
    ) THEN
        ALTER TYPE "PosSaleStatus" ADD VALUE 'PENDING';
    END IF;
END $$;
