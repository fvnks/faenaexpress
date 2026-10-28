-- POS TPV: tabla de transacciones de pago con tarjeta (Transbank Webpay Plus).

-- CreateTable
CREATE TABLE IF NOT EXISTS "PosTpvTransaction" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "buyOrder" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "tokenWs" TEXT,
    "authorizationCode" TEXT,
    "responseCode" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PosTpvTransaction_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey: PosTpvTransaction.companyId → Company.id
DO $$ BEGIN
    ALTER TABLE "PosTpvTransaction" ADD CONSTRAINT "PosTpvTransaction_companyId_fkey"
        FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey: PosTpvTransaction.saleId → PosSale.id
DO $$ BEGIN
    ALTER TABLE "PosTpvTransaction" ADD CONSTRAINT "PosTpvTransaction_saleId_fkey"
        FOREIGN KEY ("saleId") REFERENCES "PosSale"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "PosTpvTransaction_saleId_key" ON "PosTpvTransaction"("saleId");
CREATE INDEX IF NOT EXISTS "PosTpvTransaction_companyId_idx" ON "PosTpvTransaction"("companyId");
