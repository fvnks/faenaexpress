-- Reparación idempotente de `20261125090000_gastos_centro_costo`.
--
-- Esa migración quedó registrada como fallida en producción (P3009) y bloquea
-- las siguientes. En una BD nueva se aplica normalmente y este archivo no hace
-- nada; en una BD donde el DDL quedó a medias, crea solo lo que falta.

ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "centroCostoId" TEXT;
ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "centroCostoId" TEXT;
ALTER TABLE "CentroCosto" ADD COLUMN IF NOT EXISTS "esSinAsignar" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "Category_companyId_centroCostoId_idx" ON "Category"("companyId", "centroCostoId");
CREATE INDEX IF NOT EXISTS "Expense_companyId_centroCostoId_idx" ON "Expense"("companyId", "centroCostoId");

DO $repair_gastos_centro$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Category_centroCostoId_fkey'
  ) THEN
    ALTER TABLE "Category" ADD CONSTRAINT "Category_centroCostoId_fkey"
      FOREIGN KEY ("centroCostoId") REFERENCES "CentroCosto"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Expense_centroCostoId_fkey'
  ) THEN
    ALTER TABLE "Expense" ADD CONSTRAINT "Expense_centroCostoId_fkey"
      FOREIGN KEY ("centroCostoId") REFERENCES "CentroCosto"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$repair_gastos_centro$;
