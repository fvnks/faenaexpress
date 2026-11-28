-- Guarda el XML completo del CAF del SII. Sin él, el TED que se genera no es
-- válido: la firma FRMT se calcula sobre el CAF, no solo sobre el rango de folios.

-- AlterTable
ALTER TABLE "PosCaf" ADD COLUMN "cafXml" TEXT;
