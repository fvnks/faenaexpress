-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "areaId" TEXT;

-- AlterTable
ALTER TABLE "Purchase" ADD COLUMN     "areaId" TEXT;

-- AlterTable
ALTER TABLE "Sale" ADD COLUMN     "areaId" TEXT;

-- CreateTable
CREATE TABLE "Area" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Area_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Area_name_key" ON "Area"("name");

-- CreateIndex
CREATE INDEX "Expense_areaId_idx" ON "Expense"("areaId");

-- CreateIndex
CREATE INDEX "Purchase_areaId_idx" ON "Purchase"("areaId");

-- CreateIndex
CREATE INDEX "Sale_areaId_idx" ON "Sale"("areaId");

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE SET NULL ON UPDATE CASCADE;
