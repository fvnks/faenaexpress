-- AlterTable
ALTER TABLE "Sale" ADD COLUMN     "dispatchGuide" TEXT,
ADD COLUMN     "hesNumber" TEXT,
ADD COLUMN     "purchaseOrder" TEXT,
ADD COLUMN     "retentionAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN     "salespersonId" TEXT;

-- CreateTable
CREATE TABLE "Salesperson" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Salesperson_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Salesperson_name_key" ON "Salesperson"("name");

-- CreateIndex
CREATE INDEX "Sale_salespersonId_idx" ON "Sale"("salespersonId");

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_salespersonId_fkey" FOREIGN KEY ("salespersonId") REFERENCES "Salesperson"("id") ON DELETE SET NULL ON UPDATE CASCADE;
