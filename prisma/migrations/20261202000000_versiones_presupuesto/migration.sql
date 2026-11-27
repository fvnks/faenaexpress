-- Versiones del presupuesto: cada importación o plantilla deja una copia
-- congelada del itemizado anterior y permite volver a ella.

-- CreateTable
CREATE TABLE "PresupuestoVersion" (
    "id" TEXT NOT NULL,
    "obraId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "vigente" BOOLEAN NOT NULL DEFAULT false,
    "total" DOUBLE PRECISION NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PresupuestoVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PresupuestoVersionPartida" (
    "id" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "unidad" TEXT NOT NULL DEFAULT 'UN',
    "cantidad" DOUBLE PRECISION NOT NULL,
    "precioUnitario" DOUBLE PRECISION NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "esCapitulo" BOOLEAN NOT NULL DEFAULT false,
    "orden" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "PresupuestoVersionPartida_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Obra" ADD COLUMN "presupuestoVigenteId" TEXT;

-- CreateIndex
CREATE INDEX "PresupuestoVersion_obraId_createdAt_idx" ON "PresupuestoVersion"("obraId", "createdAt");
CREATE INDEX "PresupuestoVersionPartida_versionId_idx" ON "PresupuestoVersionPartida"("versionId");

-- AddForeignKey
ALTER TABLE "PresupuestoVersion" ADD CONSTRAINT "PresupuestoVersion_obraId_fkey" FOREIGN KEY ("obraId") REFERENCES "Obra"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PresupuestoVersionPartida" ADD CONSTRAINT "PresupuestoVersionPartida_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "PresupuestoVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Obra" ADD CONSTRAINT "Obra_presupuestoVigenteId_fkey" FOREIGN KEY ("presupuestoVigenteId") REFERENCES "PresupuestoVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
