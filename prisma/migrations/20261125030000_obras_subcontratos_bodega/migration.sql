-- CreateTable
CREATE TABLE "Subcontrato" (
    "id" TEXT NOT NULL,
    "obraId" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "descripcion" TEXT,
    "total" DOUBLE PRECISION NOT NULL,
    "anticipo" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "retencionPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "estado" TEXT NOT NULL DEFAULT 'VIGENTE',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Subcontrato_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubcontratoPartida" (
    "id" TEXT NOT NULL,
    "subcontratoId" TEXT NOT NULL,
    "partidaId" TEXT NOT NULL,
    "cantidad" DOUBLE PRECISION NOT NULL,
    "precioUnitario" DOUBLE PRECISION NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    CONSTRAINT "SubcontratoPartida_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BodegaObra" (
    "id" TEXT NOT NULL,
    "obraId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "cantidad" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BodegaObra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovimientoBodegaObra" (
    "id" TEXT NOT NULL,
    "bodegaObraId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "cantidad" DOUBLE PRECISION NOT NULL,
    "unitCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "referencia" TEXT,
    "partidaId" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MovimientoBodegaObra_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Subcontrato_obraId_numero_key" ON "Subcontrato"("obraId", "numero");
CREATE INDEX "Subcontrato_obraId_partnerId_idx" ON "Subcontrato"("obraId", "partnerId");
CREATE INDEX "SubcontratoPartida_subcontratoId_idx" ON "SubcontratoPartida"("subcontratoId");
CREATE UNIQUE INDEX "BodegaObra_obraId_productId_key" ON "BodegaObra"("obraId", "productId");
CREATE INDEX "BodegaObra_obraId_idx" ON "BodegaObra"("obraId");
CREATE UNIQUE INDEX "MovimientoBodegaObra_referencia_key" ON "MovimientoBodegaObra"("referencia");
CREATE INDEX "MovimientoBodegaObra_bodegaObraId_fecha_idx" ON "MovimientoBodegaObra"("bodegaObraId", "fecha");

-- AddForeignKey
ALTER TABLE "Subcontrato" ADD CONSTRAINT "Subcontrato_obraId_fkey" FOREIGN KEY ("obraId") REFERENCES "Obra"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Subcontrato" ADD CONSTRAINT "Subcontrato_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SubcontratoPartida" ADD CONSTRAINT "SubcontratoPartida_subcontratoId_fkey" FOREIGN KEY ("subcontratoId") REFERENCES "Subcontrato"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SubcontratoPartida" ADD CONSTRAINT "SubcontratoPartida_partidaId_fkey" FOREIGN KEY ("partidaId") REFERENCES "Partida"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BodegaObra" ADD CONSTRAINT "BodegaObra_obraId_fkey" FOREIGN KEY ("obraId") REFERENCES "Obra"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BodegaObra" ADD CONSTRAINT "BodegaObra_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MovimientoBodegaObra" ADD CONSTRAINT "MovimientoBodegaObra_bodegaObraId_fkey" FOREIGN KEY ("bodegaObraId") REFERENCES "BodegaObra"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MovimientoBodegaObra" ADD CONSTRAINT "MovimientoBodegaObra_partidaId_fkey" FOREIGN KEY ("partidaId") REFERENCES "Partida"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MovimientoBodegaObra" ADD CONSTRAINT "MovimientoBodegaObra_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
