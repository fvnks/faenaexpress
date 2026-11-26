-- Facturas de combustible: desglose del impuesto específico (Ley 18.502 /
-- MEPCO) y categorías que lo exigen. El impuesto específico no entra en la base
-- del IVA, pero sí en el total del documento.

ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "esCombustible" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Purchase" ADD COLUMN IF NOT EXISTS "combustibleTipo" TEXT;
ALTER TABLE "Purchase" ADD COLUMN IF NOT EXISTS "combustibleLitros" DOUBLE PRECISION;
ALTER TABLE "Purchase" ADD COLUMN IF NOT EXISTS "impuestoEspecifico" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Purchase" ADD COLUMN IF NOT EXISTS "impuestoEspecificoGlosa" TEXT;
ALTER TABLE "Purchase" ADD COLUMN IF NOT EXISTS "impuestoEspecificoRecuperable" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "Category_companyId_esCombustible_idx" ON "Category"("companyId", "esCombustible");

-- Las categorías ya creadas con nombres habituales de combustible quedan
-- marcadas; el administrador puede cambiar el flag después en Catálogos.
UPDATE "Category"
SET "esCombustible" = true
WHERE lower("name") LIKE '%combustible%'
   OR lower("name") LIKE '%bencina%'
   OR lower("name") LIKE '%gasolina%'
   OR lower("name") LIKE '%diesel%'
   OR lower("name") LIKE '%diésel%';
