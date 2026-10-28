-- POS TPV: configuración de Terminal Punto de Venta para pagos con tarjeta
-- a través de Transbank Webpay Plus.

-- CreateTable
CREATE TABLE IF NOT EXISTS "PosTpvConfig" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "comercioId" TEXT,
    "apiKey" TEXT,
    "ambiente" TEXT NOT NULL DEFAULT 'integracion',
    "habilitado" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PosTpvConfig_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey: PosTpvConfig.companyId → Company.id
DO $$ BEGIN
    ALTER TABLE "PosTpvConfig" ADD CONSTRAINT "PosTpvConfig_companyId_fkey"
        FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "PosTpvConfig_companyId_key" ON "PosTpvConfig"("companyId");
CREATE INDEX IF NOT EXISTS "PosTpvConfig_companyId_idx" ON "PosTpvConfig"("companyId");
