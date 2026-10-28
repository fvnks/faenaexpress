-- POS Kitchen Display System (KDS): pantallas de cocina para restaurantes.
-- Tablas para órdenes de cocina y sus ítems.

-- CreateEnum: PosKdsStatus
DO $$ BEGIN
    CREATE TYPE "PosKdsStatus" AS ENUM ('PENDING', 'PREPARING', 'READY', 'SERVED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum: PosKdsItemStatus
DO $$ BEGIN
    CREATE TYPE "PosKdsItemStatus" AS ENUM ('PENDING', 'PREPARING', 'READY', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable: PosKdsOrder
CREATE TABLE IF NOT EXISTS "PosKdsOrder" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "saleId" TEXT,
    "tableNumber" TEXT,
    "customerName" TEXT,
    "status" "PosKdsStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "PosKdsOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable: PosKdsOrderItem
CREATE TABLE IF NOT EXISTS "PosKdsOrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT,
    "productName" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" INTEGER,
    "notes" TEXT,
    "status" "PosKdsItemStatus" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "PosKdsOrderItem_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey: PosKdsOrder.companyId -> Company.id
DO $$ BEGIN
    ALTER TABLE "PosKdsOrder" ADD CONSTRAINT "PosKdsOrder_companyId_fkey"
        FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey: PosKdsOrder.saleId -> PosSale.id
DO $$ BEGIN
    ALTER TABLE "PosKdsOrder" ADD CONSTRAINT "PosKdsOrder_saleId_fkey"
        FOREIGN KEY ("saleId") REFERENCES "PosSale"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey: PosKdsOrderItem.orderId -> PosKdsOrder.id
DO $$ BEGIN
    ALTER TABLE "PosKdsOrderItem" ADD CONSTRAINT "PosKdsOrderItem_orderId_fkey"
        FOREIGN KEY ("orderId") REFERENCES "PosKdsOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey: PosKdsOrderItem.productId -> Product.id
DO $$ BEGIN
    ALTER TABLE "PosKdsOrderItem" ADD CONSTRAINT "PosKdsOrderItem_productId_fkey"
        FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PosKdsOrder_companyId_idx" ON "PosKdsOrder"("companyId");
CREATE INDEX IF NOT EXISTS "PosKdsOrder_companyId_status_idx" ON "PosKdsOrder"("companyId", "status");
CREATE INDEX IF NOT EXISTS "PosKdsOrder_companyId_createdAt_idx" ON "PosKdsOrder"("companyId", "createdAt");
CREATE INDEX IF NOT EXISTS "PosKdsOrderItem_orderId_idx" ON "PosKdsOrderItem"("orderId");
CREATE INDEX IF NOT EXISTS "PosKdsOrderItem_productId_idx" ON "PosKdsOrderItem"("productId");
