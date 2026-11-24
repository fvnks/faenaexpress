-- CreateEnum
CREATE TYPE "EstadoPagoStatus" AS ENUM ('BORRADOR', 'APROBADO', 'FACTURADO', 'PAGADO');

-- CreateTable
CREATE TABLE "EstadoPago" (
    "id" TEXT NOT NULL,
    "obraId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "periodo" TEXT NOT NULL,
    "estado" "EstadoPagoStatus" NOT NULL DEFAULT 'BORRADOR',
    "total" DOUBLE PRECISION NOT NULL,
    "saleId" TEXT,
    "facturadoAt" TIMESTAMP(3),
    "aprobadoById" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EstadoPago_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EstadoPagoPartida" (
    "id" TEXT NOT NULL,
    "estadoPagoId" TEXT NOT NULL,
    "partidaId" TEXT NOT NULL,
    "cantidad" DOUBLE PRECISION NOT NULL,
    "precioUnitario" DOUBLE PRECISION NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    CONSTRAINT "EstadoPagoPartida_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EstadoPago_obraId_numero_key" ON "EstadoPago"("obraId", "numero");
CREATE INDEX "EstadoPago_obraId_periodo_idx" ON "EstadoPago"("obraId", "periodo");
CREATE UNIQUE INDEX "EstadoPago_saleId_key" ON "EstadoPago"("saleId");
CREATE INDEX "EstadoPagoPartida_estadoPagoId_idx" ON "EstadoPagoPartida"("estadoPagoId");

-- AddForeignKey
ALTER TABLE "EstadoPago" ADD CONSTRAINT "EstadoPago_obraId_fkey" FOREIGN KEY ("obraId") REFERENCES "Obra"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EstadoPagoPartida" ADD CONSTRAINT "EstadoPagoPartida_estadoPagoId_fkey" FOREIGN KEY ("estadoPagoId") REFERENCES "EstadoPago"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EstadoPagoPartida" ADD CONSTRAINT "EstadoPagoPartida_partidaId_fkey" FOREIGN KEY ("partidaId") REFERENCES "Partida"("id") ON DELETE CASCADE ON UPDATE CASCADE;
