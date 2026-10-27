-- POS DTE: agregar soporte para facturas de compra (tipo 46).
-- Agrega purchaseId a PosDte para vincular DTEs de compra.

-- AlterTable: agregar purchaseId a PosDte
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'PosDte' AND column_name = 'purchaseId'
    ) THEN
        ALTER TABLE "PosDte" ADD COLUMN "purchaseId" TEXT;
    END IF;
END $$;

-- AddForeignKey: PosDte.purchaseId → Purchase.id
DO $$ BEGIN
    ALTER TABLE "PosDte" ADD CONSTRAINT "PosDte_purchaseId_fkey"
        FOREIGN KEY ("purchaseId") REFERENCES "Purchase"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PosDte_purchaseId_idx" ON "PosDte"("purchaseId");
