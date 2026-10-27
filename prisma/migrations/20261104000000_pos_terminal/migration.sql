-- Terminales del POS: punto de venta físico desde el que se opera cada turno.
-- Agrega la tabla PosTerminal y la columna terminalId en PosSession para saber
-- desde qué dispositivo se registró cada caja.

-- CreateTable
CREATE TABLE IF NOT EXISTS "PosTerminal" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PosTerminal_pkey" PRIMARY KEY ("id")
);

-- AlterTable: agregar terminalId a PosSession
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'PosSession' AND column_name = 'terminalId'
    ) THEN
        ALTER TABLE "PosSession" ADD COLUMN "terminalId" TEXT;
    END IF;
END $$;

-- AddForeignKey: PosTerminal.companyId → Company.id
DO $$ BEGIN
    ALTER TABLE "PosTerminal" ADD CONSTRAINT "PosTerminal_companyId_fkey"
        FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey: PosSession.terminalId → PosTerminal.id
DO $$ BEGIN
    ALTER TABLE "PosSession" ADD CONSTRAINT "PosSession_terminalId_fkey"
        FOREIGN KEY ("terminalId") REFERENCES "PosTerminal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PosTerminal_companyId_idx" ON "PosTerminal"("companyId");
CREATE INDEX IF NOT EXISTS "PosTerminal_companyId_active_idx" ON "PosTerminal"("companyId", "active");
CREATE INDEX IF NOT EXISTS "PosSession_terminalId_idx" ON "PosSession"("terminalId");
