-- POS SII Configuration tables
-- These tables enable electronic invoicing (SII) for POS-only clients

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "PosDteStatus" AS ENUM ('BORRADOR', 'EMITIDO', 'ANULADO', 'RECHAZADO');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable
CREATE TABLE "PosSiiConfig" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "certificadoPfx" TEXT,
    "certificadoPass" TEXT,
    "certificadoVence" TIMESTAMP(3),
    "resolucionSii" TEXT,
    "resolucionFecha" TIMESTAMP(3),
    "acteco" TEXT,
    "habilitado" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PosSiiConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PosCaf" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "configId" TEXT NOT NULL,
    "tipoDte" INTEGER NOT NULL,
    "folioInicio" INTEGER NOT NULL,
    "folioFinal" INTEGER NOT NULL,
    "folioActual" INTEGER NOT NULL DEFAULT 0,
    "vigenteDesde" TIMESTAMP(3) NOT NULL,
    "vigenteHasta" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PosCaf_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PosDte" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "configId" TEXT NOT NULL,
    "saleId" TEXT,
    "tipoDte" INTEGER NOT NULL,
    "folio" INTEGER NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'BORRADOR',
    "trackId" TEXT,
    "xmlEnviado" TEXT,
    "xmlRespuesta" TEXT,
    "pdfPath" TEXT,
    "enviadoEmail" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(),
    "emitidoAt" TIMESTAMP(3),
    "anuladoAt" TIMESTAMP(3),

    CONSTRAINT "PosDte_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PosSiiConfig_companyId_key" ON "PosSiiConfig"("companyId");

-- CreateIndex
CREATE INDEX "PosSiiConfig_companyId_idx" ON "PosSiiConfig"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "PosCaf_configId_tipoDte_key" ON "PosCaf"("configId", "tipoDte");

-- CreateIndex
CREATE INDEX "PosCaf_companyId_idx" ON "PosCaf"("companyId");

-- CreateIndex
CREATE INDEX "PosCaf_configId_idx" ON "PosCaf"("configId");

-- CreateIndex
CREATE UNIQUE INDEX "PosDte_saleId_key" ON "PosDte"("saleId");

-- CreateIndex
CREATE INDEX "PosDte_companyId_idx" ON "PosDte"("companyId");

-- CreateIndex
CREATE INDEX "PosDte_configId_idx" ON "PosDte"("configId");

-- CreateIndex
CREATE INDEX "PosDte_saleId_idx" ON "PosDte"("saleId");

-- AddForeignKey
ALTER TABLE "PosSiiConfig" ADD CONSTRAINT "PosSiiConfig_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosCaf" ADD CONSTRAINT "PosCaf_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosCaf" ADD CONSTRAINT "PosCaf_configId_fkey" FOREIGN KEY ("configId") REFERENCES "PosSiiConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosDte" ADD CONSTRAINT "PosDte_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosDte" ADD CONSTRAINT "PosDte_configId_fkey" FOREIGN KEY ("configId") REFERENCES "PosSiiConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosDte" ADD CONSTRAINT "PosDte_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "PosSale"("id") ON DELETE SET NULL ON UPDATE CASCADE;