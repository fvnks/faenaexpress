-- Ecommerce API: tablas para exposicion de productos y pedidos de tienda online.
-- Claves de API para autenticar requests desde canales externos.
-- Pedidos creados desde el canal online que pueden convertirse en ventas POS.

-- CreateTable: EcommerceApiKey
CREATE TABLE IF NOT EXISTS "EcommerceApiKey" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EcommerceApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable: EcommerceOrder
CREATE TABLE IF NOT EXISTS "EcommerceOrder" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT,
    "customerPhone" TEXT,
    "customerAddress" TEXT,
    "subtotal" INTEGER NOT NULL,
    "tax" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "paymentMethod" TEXT,
    "paymentReference" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EcommerceOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable: EcommerceOrderItem
CREATE TABLE IF NOT EXISTS "EcommerceOrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT,
    "productSku" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" INTEGER NOT NULL,
    "lineTotal" INTEGER NOT NULL,

    CONSTRAINT "EcommerceOrderItem_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey: EcommerceApiKey.companyId -> Company.id
DO $$ BEGIN
    ALTER TABLE "EcommerceApiKey" ADD CONSTRAINT "EcommerceApiKey_companyId_fkey"
        FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey: EcommerceOrder.companyId -> Company.id
DO $$ BEGIN
    ALTER TABLE "EcommerceOrder" ADD CONSTRAINT "EcommerceOrder_companyId_fkey"
        FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey: EcommerceOrderItem.orderId -> EcommerceOrder.id
DO $$ BEGIN
    ALTER TABLE "EcommerceOrderItem" ADD CONSTRAINT "EcommerceOrderItem_orderId_fkey"
        FOREIGN KEY ("orderId") REFERENCES "EcommerceOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey: EcommerceOrderItem.productId -> Product.id
DO $$ BEGIN
    ALTER TABLE "EcommerceOrderItem" ADD CONSTRAINT "EcommerceOrderItem_productId_fkey"
        FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "EcommerceApiKey_keyHash_key" ON "EcommerceApiKey"("keyHash");
CREATE UNIQUE INDEX IF NOT EXISTS "EcommerceApiKey_companyId_key" ON "EcommerceApiKey"("companyId");
CREATE INDEX IF NOT EXISTS "EcommerceApiKey_companyId_idx" ON "EcommerceApiKey"("companyId");
CREATE INDEX IF NOT EXISTS "EcommerceOrder_companyId_idx" ON "EcommerceOrder"("companyId");
CREATE INDEX IF NOT EXISTS "EcommerceOrder_companyId_status_idx" ON "EcommerceOrder"("companyId", "status");
CREATE UNIQUE INDEX IF NOT EXISTS "EcommerceOrder_companyId_orderNumber_key" ON "EcommerceOrder"("companyId", "orderNumber");
CREATE INDEX IF NOT EXISTS "EcommerceOrderItem_orderId_idx" ON "EcommerceOrderItem"("orderId");
CREATE INDEX IF NOT EXISTS "EcommerceOrderItem_productId_idx" ON "EcommerceOrderItem"("productId");
