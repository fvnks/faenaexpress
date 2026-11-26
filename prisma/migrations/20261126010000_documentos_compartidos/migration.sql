-- Marca explícita de los documentos que el colegio comparte con la familia.
ALTER TABLE "StudentDocument" ADD COLUMN IF NOT EXISTS "compartidoConFamilia" BOOLEAN NOT NULL DEFAULT false;
