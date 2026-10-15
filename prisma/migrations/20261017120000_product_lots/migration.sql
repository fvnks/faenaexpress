-- CreateTable
CREATE TABLE "ProductLot" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "warehouseId" TEXT,
    "code" TEXT NOT NULL,
    "expirationDate" DATE,
    "quantity" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductLot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductLot_companyId_productId_idx" ON "ProductLot"("companyId", "productId");

-- CreateIndex
CREATE INDEX "ProductLot_expirationDate_idx" ON "ProductLot"("expirationDate");

-- CreateIndex
CREATE INDEX "ProductLot_companyId_expirationDate_idx" ON "ProductLot"("companyId", "expirationDate");

-- AddForeignKey
ALTER TABLE "ProductLot" ADD CONSTRAINT "ProductLot_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductLot" ADD CONSTRAINT "ProductLot_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductLot" ADD CONSTRAINT "ProductLot_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductLot" ADD CONSTRAINT "ProductLot_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
