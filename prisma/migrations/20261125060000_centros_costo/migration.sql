-- CreateTable
CREATE TABLE "CentroCosto" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CentroCosto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RepartoCentroCosto" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "centroCostoId" TEXT NOT NULL,
    "purchaseId" TEXT,
    "saleId" TEXT,
    "monto" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RepartoCentroCosto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CentroCosto_companyId_codigo_key" ON "CentroCosto"("companyId", "codigo");
CREATE INDEX "CentroCosto_companyId_active_idx" ON "CentroCosto"("companyId", "active");
CREATE INDEX "RepartoCentroCosto_companyId_purchaseId_idx" ON "RepartoCentroCosto"("companyId", "purchaseId");
CREATE INDEX "RepartoCentroCosto_companyId_saleId_idx" ON "RepartoCentroCosto"("companyId", "saleId");
CREATE INDEX "RepartoCentroCosto_centroCostoId_idx" ON "RepartoCentroCosto"("centroCostoId");

-- AddForeignKey
ALTER TABLE "CentroCosto" ADD CONSTRAINT "CentroCosto_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RepartoCentroCosto" ADD CONSTRAINT "RepartoCentroCosto_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RepartoCentroCosto" ADD CONSTRAINT "RepartoCentroCosto_centroCostoId_fkey" FOREIGN KEY ("centroCostoId") REFERENCES "CentroCosto"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RepartoCentroCosto" ADD CONSTRAINT "RepartoCentroCosto_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RepartoCentroCosto" ADD CONSTRAINT "RepartoCentroCosto_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;
