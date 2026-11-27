-- El mandante deja de ser texto libre: pasa a ser una entidad para agrupar
-- obras y navegar por mandante. Los campos de texto se conservan y se migra
-- su valor a la nueva fila para no perder información.

-- CreateTable
CREATE TABLE "MandanteObra" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "name" TEXT NOT NULL,
    "rut" TEXT,
    "direccion" TEXT,
    "comuna" TEXT,
    "contacto" TEXT,
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MandanteObra_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MandanteObra_organizationId_name_key" ON "MandanteObra"("organizationId", "name");
CREATE INDEX "MandanteObra_organizationId_idx" ON "MandanteObra"("organizationId");

-- AlterTable
ALTER TABLE "Obra" ADD COLUMN "mandanteId" TEXT;
CREATE INDEX "Obra_mandanteId_idx" ON "Obra"("mandanteId");

-- AddForeignKey
ALTER TABLE "MandanteObra" ADD CONSTRAINT "MandanteObra_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Obra" ADD CONSTRAINT "Obra_mandanteId_fkey" FOREIGN KEY ("mandanteId") REFERENCES "MandanteObra"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: un mandante por (organización, nombre), con el RUT que aparezca.
INSERT INTO "MandanteObra" ("id", "organizationId", "name", "rut", "createdAt", "updatedAt")
SELECT
    'mandante-' || md5(COALESCE(o."organizationId", '') || '|' || btrim(o."mandante")),
    o."organizationId",
    btrim(o."mandante"),
    MIN(btrim(COALESCE(o."rutMandante", ''))) FILTER (WHERE btrim(COALESCE(o."rutMandante", '')) <> ''),
    NOW(),
    NOW()
FROM "Obra" o
WHERE o."mandante" IS NOT NULL AND btrim(o."mandante") <> ''
GROUP BY o."organizationId", btrim(o."mandante")
ON CONFLICT ("organizationId", "name") DO NOTHING;

UPDATE "Obra" o
SET "mandanteId" = m."id"
FROM "MandanteObra" m
WHERE o."mandante" IS NOT NULL
  AND m."name" = btrim(o."mandante")
  AND m."organizationId" IS NOT DISTINCT FROM o."organizationId";
