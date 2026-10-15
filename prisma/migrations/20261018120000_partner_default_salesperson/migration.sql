-- AlterTable
ALTER TABLE "Partner" ADD COLUMN IF NOT EXISTS "salespersonId" TEXT;

CREATE INDEX IF NOT EXISTS "Partner_salespersonId_idx" ON "Partner"("companyId", "salespersonId");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Partner_salespersonId_fkey') THEN
    ALTER TABLE "Partner"
    ADD CONSTRAINT "Partner_salespersonId_fkey"
    FOREIGN KEY ("salespersonId") REFERENCES "Salesperson"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
