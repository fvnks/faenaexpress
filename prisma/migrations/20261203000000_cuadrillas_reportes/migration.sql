-- Cuadrillas para medir productividad por equipo en las cubicaciones.

-- CreateTable
CREATE TABLE "Cuadrilla" (
    "id" TEXT NOT NULL,
    "obraId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "integrantes" INTEGER NOT NULL DEFAULT 1,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Cuadrilla_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Cubicacion" ADD COLUMN "cuadrillaId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Cuadrilla_obraId_nombre_key" ON "Cuadrilla"("obraId", "nombre");
CREATE INDEX "Cuadrilla_obraId_idx" ON "Cuadrilla"("obraId");
CREATE INDEX "Cubicacion_cuadrillaId_idx" ON "Cubicacion"("cuadrillaId");

-- AddForeignKey
ALTER TABLE "Cuadrilla" ADD CONSTRAINT "Cuadrilla_obraId_fkey" FOREIGN KEY ("obraId") REFERENCES "Obra"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Cubicacion" ADD CONSTRAINT "Cubicacion_cuadrillaId_fkey" FOREIGN KEY ("cuadrillaId") REFERENCES "Cuadrilla"("id") ON DELETE SET NULL ON UPDATE CASCADE;
