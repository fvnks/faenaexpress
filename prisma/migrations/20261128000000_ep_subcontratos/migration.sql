-- Estados de pago de subcontratos: avance aprobado de las partidas asignadas,
-- con anticipo y retención descontados. El costo real se genera al pagarlos.

-- CreateTable
CREATE TABLE "EstadoPagoSubcontrato" (
    "id" TEXT NOT NULL,
    "subcontratoId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "periodo" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'BORRADOR',
    "bruto" DOUBLE PRECISION NOT NULL,
    "anticipo" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "retencion" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EstadoPagoSubcontrato_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EstadoPagoSubcontratoPartida" (
    "id" TEXT NOT NULL,
    "epId" TEXT NOT NULL,
    "partidaId" TEXT NOT NULL,
    "cantidad" DOUBLE PRECISION NOT NULL,
    "precioUnitario" DOUBLE PRECISION NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    CONSTRAINT "EstadoPagoSubcontratoPartida_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EstadoPagoSubcontrato_subcontratoId_numero_key" ON "EstadoPagoSubcontrato"("subcontratoId", "numero");
CREATE INDEX "EstadoPagoSubcontrato_subcontratoId_periodo_idx" ON "EstadoPagoSubcontrato"("subcontratoId", "periodo");
CREATE INDEX "EstadoPagoSubcontratoPartida_epId_idx" ON "EstadoPagoSubcontratoPartida"("epId");

-- AddForeignKey
ALTER TABLE "EstadoPagoSubcontrato" ADD CONSTRAINT "EstadoPagoSubcontrato_subcontratoId_fkey" FOREIGN KEY ("subcontratoId") REFERENCES "Subcontrato"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EstadoPagoSubcontratoPartida" ADD CONSTRAINT "EstadoPagoSubcontratoPartida_epId_fkey" FOREIGN KEY ("epId") REFERENCES "EstadoPagoSubcontrato"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EstadoPagoSubcontratoPartida" ADD CONSTRAINT "EstadoPagoSubcontratoPartida_partidaId_fkey" FOREIGN KEY ("partidaId") REFERENCES "Partida"("id") ON DELETE CASCADE ON UPDATE CASCADE;
