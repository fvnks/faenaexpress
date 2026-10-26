-- Missing indexes and foreign keys for POS SII tables
-- This migration adds the missing indexes and foreign keys that were missing from the initial migration
-- Uses IF NOT EXISTS / IF NOT EXISTS patterns to handle already-applied constraints

-- PosSiiConfig: Missing unique index on companyId, index on companyId, foreign key on companyId
CREATE UNIQUE INDEX IF NOT EXISTS "PosSiiConfig_companyId_key" ON "PosSiiConfig"("companyId");
CREATE INDEX IF NOT EXISTS "PosSiiConfig_companyId_idx" ON "PosSiiConfig"("companyId");
DO $$ BEGIN
    ALTER TABLE "PosSiiConfig" ADD CONSTRAINT "PosSiiConfig_companyId_fkey" 
        FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- PosCaf: Missing index on companyId, index on configId, unique index on (configId, tipoDte), foreign key on configId
CREATE INDEX IF NOT EXISTS "PosCaf_companyId_idx" ON "PosCaf"("companyId");
CREATE INDEX IF NOT EXISTS "PosCaf_configId_idx" ON "PosCaf"("configId");
CREATE UNIQUE INDEX IF NOT EXISTS "PosCaf_configId_tipoDte_key" ON "PosCaf"("configId", "tipoDte");
DO $$ BEGIN
    ALTER TABLE "PosCaf" ADD CONSTRAINT "PosCaf_configId_fkey" 
        FOREIGN KEY ("configId") REFERENCES "PosSiiConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- PosDte: Missing unique index on saleId, index on companyId, index on configId, index on saleId, 
-- foreign key on configId, foreign key on saleId
CREATE UNIQUE INDEX IF NOT EXISTS "PosDte_saleId_key" ON "PosDte"("saleId");
CREATE INDEX IF NOT EXISTS "PosDte_companyId_idx" ON "PosDte"("companyId");
CREATE INDEX IF NOT EXISTS "PosDte_configId_idx" ON "PosDte"("configId");
CREATE INDEX IF NOT EXISTS "PosDte_saleId_idx" ON "PosDte"("saleId");
DO $$ BEGIN
    ALTER TABLE "PosDte" ADD CONSTRAINT "PosDte_configId_fkey" 
        FOREIGN KEY ("configId") REFERENCES "PosSiiConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    ALTER TABLE "PosDte" ADD CONSTRAINT "PosDte_saleId_fkey" 
        FOREIGN KEY ("saleId") REFERENCES "PosSale"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;