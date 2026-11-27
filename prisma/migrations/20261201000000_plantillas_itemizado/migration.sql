-- Itemizados reutilizables: se guarda el presupuesto de una obra como plantilla
-- y se aplica en otra sin volver a digitar las partidas.

-- CreateTable
CREATE TABLE "PlantillaItemizado" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PlantillaItemizado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlantillaItemizadoLinea" (
    "id" TEXT NOT NULL,
    "plantillaId" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "unidad" TEXT NOT NULL DEFAULT 'UN',
    "cantidad" DOUBLE PRECISION NOT NULL,
    "precioUnitario" DOUBLE PRECISION NOT NULL,
    "esCapitulo" BOOLEAN NOT NULL DEFAULT false,
    "orden" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "PlantillaItemizadoLinea_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlantillaItemizado_organizationId_nombre_key" ON "PlantillaItemizado"("organizationId", "nombre");
CREATE INDEX "PlantillaItemizado_organizationId_idx" ON "PlantillaItemizado"("organizationId");
CREATE INDEX "PlantillaItemizadoLinea_plantillaId_idx" ON "PlantillaItemizadoLinea"("plantillaId");

-- AddForeignKey
ALTER TABLE "PlantillaItemizado" ADD CONSTRAINT "PlantillaItemizado_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PlantillaItemizadoLinea" ADD CONSTRAINT "PlantillaItemizadoLinea_plantillaId_fkey" FOREIGN KEY ("plantillaId") REFERENCES "PlantillaItemizado"("id") ON DELETE CASCADE ON UPDATE CASCADE;
