-- AlterTable
ALTER TABLE "School" ADD COLUMN IF NOT EXISTS "slug" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "School_slug_key" ON "School"("slug");

-- Relleno de los colegios que ya existen: el slug sale del nombre, sin acentos ni
-- signos, y con un sufijo numérico si dos colegios quedaran iguales. Los colegios
-- nuevos lo reciben al crearse (`slugDesdeNombre`).
--
-- Sin la extensión `unaccent` (no está instalada): los acentos del español se
-- sacan con `translate`, que es suficiente para un nombre de colegio.
WITH base AS (
  SELECT
    "id",
    NULLIF(
      TRIM(BOTH '-' FROM
        REGEXP_REPLACE(
          REGEXP_REPLACE(LOWER(TRANSLATE("name", 'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunAEIOUUN')), '[^a-z0-9]+', '-', 'g'),
          '-{2,}', '-', 'g'
        )
      ),
      ''
    ) AS candidato
  FROM "School"
  WHERE "slug" IS NULL
),
numerado AS (
  SELECT
    "id",
    COALESCE("candidato", 'colegio') AS candidato,
    ROW_NUMBER() OVER (PARTITION BY COALESCE("candidato", 'colegio') ORDER BY "id") AS n
  FROM base
)
UPDATE "School" s
SET "slug" = CASE WHEN n.n = 1 THEN n.candidato ELSE n.candidato || '-' || n.n END
FROM numerado n
WHERE s."id" = n."id";
