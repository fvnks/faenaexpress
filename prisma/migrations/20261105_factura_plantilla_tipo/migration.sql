-- Create enum
CREATE TYPE "FacturaPlantillaTipo" AS ENUM ('VENTA', 'COMPRA');

-- Drop unique constraint first, then indexes
ALTER TABLE "FacturaPlantilla" DROP CONSTRAINT "FacturaPlantilla_companyId_key";
DROP INDEX "FacturaPlantilla_companyId_nombre_key";

-- Alter tables
ALTER TABLE "FacturaConfiguracion" ALTER COLUMN "creadoEn" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "actualizadoEn" DROP DEFAULT,
ALTER COLUMN "actualizadoEn" SET DATA TYPE TIMESTAMP(3);

ALTER TABLE "FacturaPlantilla" ADD COLUMN "tipo" "FacturaPlantillaTipo" NOT NULL DEFAULT 'VENTA',
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "configuracion" DROP DEFAULT,
ALTER COLUMN "configuracion" SET DATA TYPE JSONB,
ALTER COLUMN "creadoEn" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "actualizadoEn" DROP DEFAULT,
ALTER COLUMN "actualizadoEn" SET DATA TYPE TIMESTAMP(3);

-- Create new indexes
CREATE INDEX "FacturaPlantilla_companyId_tipo_idx" ON "FacturaPlantilla"("companyId", "tipo");
CREATE UNIQUE INDEX "FacturaPlantilla_companyId_tipo_nombre_key" ON "FacturaPlantilla"("companyId", "tipo", "nombre");
CREATE UNIQUE INDEX "FacturaPlantilla_companyId_tipo_key" ON "FacturaPlantilla"("companyId", "tipo");

-- Re-add foreign keys
ALTER TABLE "FacturaConfiguracion" ADD CONSTRAINT "FacturaConfiguracion_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FacturaPlantilla" ADD CONSTRAINT "FacturaPlantilla_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;