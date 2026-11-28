-- Guarda el timbre electrónico (TED) firmado para poder imprimir la carta DTE
-- con su PDF417 real, tanto en documentos emitidos como importados del SII.

-- AlterTable
ALTER TABLE "Purchase" ADD COLUMN "tedXml" TEXT;
ALTER TABLE "Sale" ADD COLUMN "tedXml" TEXT;
ALTER TABLE "PosDte" ADD COLUMN "tedXml" TEXT;
