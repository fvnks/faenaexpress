-- CreateEnum
CREATE TYPE "ApuTipo" AS ENUM ('MATERIAL', 'MANO_OBRA', 'MAQUINARIA', 'GGASTOS');

-- CreateTable
CREATE TABLE "Partida" (
    "id" TEXT NOT NULL,
    "obraId" TEXT NOT NULL,
    "parentId" TEXT,
    "codigo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "unidad" TEXT NOT NULL DEFAULT 'UN',
    "cantidad" DOUBLE PRECISION NOT NULL,
    "precioUnitario" DOUBLE PRECISION NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "estado" TEXT NOT NULL DEFAULT 'VIGENTE',
    "motivoAnulacion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Partida_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Apu" (
    "id" TEXT NOT NULL,
    "partidaId" TEXT NOT NULL,
    "tipo" "ApuTipo" NOT NULL,
    "descripcion" TEXT NOT NULL,
    "cantidad" DOUBLE PRECISION NOT NULL,
    "precioUnitario" DOUBLE PRECISION NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Apu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CostoObra" (
    "id" TEXT NOT NULL,
    "obraId" TEXT NOT NULL,
    "partidaId" TEXT,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "monto" DOUBLE PRECISION NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CostoObra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cubicacion" (
    "id" TEXT NOT NULL,
    "partidaId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cantidad" DOUBLE PRECISION NOT NULL,
    "registradoById" TEXT NOT NULL,
    "aprobada" BOOLEAN NOT NULL DEFAULT false,
    "aprobadaById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Cubicacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Partida_obraId_codigo_key" ON "Partida"("obraId", "codigo");
CREATE INDEX "Partida_obraId_parentId_idx" ON "Partida"("obraId", "parentId");
CREATE INDEX "Apu_partidaId_idx" ON "Apu"("partidaId");
CREATE UNIQUE INDEX "CostoObra_sourceType_sourceId_key" ON "CostoObra"("sourceType", "sourceId");
CREATE INDEX "CostoObra_obraId_fecha_idx" ON "CostoObra"("obraId", "fecha");
CREATE INDEX "CostoObra_partidaId_idx" ON "CostoObra"("partidaId");
CREATE INDEX "Cubicacion_partidaId_fecha_idx" ON "Cubicacion"("partidaId", "fecha");

-- AddForeignKey
ALTER TABLE "Partida" ADD CONSTRAINT "Partida_obraId_fkey" FOREIGN KEY ("obraId") REFERENCES "Obra"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Partida" ADD CONSTRAINT "Partida_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Partida"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Apu" ADD CONSTRAINT "Apu_partidaId_fkey" FOREIGN KEY ("partidaId") REFERENCES "Partida"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CostoObra" ADD CONSTRAINT "CostoObra_obraId_fkey" FOREIGN KEY ("obraId") REFERENCES "Obra"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CostoObra" ADD CONSTRAINT "CostoObra_partidaId_fkey" FOREIGN KEY ("partidaId") REFERENCES "Partida"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Cubicacion" ADD CONSTRAINT "Cubicacion_partidaId_fkey" FOREIGN KEY ("partidaId") REFERENCES "Partida"("id") ON DELETE CASCADE ON UPDATE CASCADE;
