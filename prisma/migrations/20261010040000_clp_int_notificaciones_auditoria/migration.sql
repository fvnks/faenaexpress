-- Montos en pesos chilenos: sin decimales. Las columnas pasan de Decimal(14,2)
-- a entero (los valores existentes son enteros).
ALTER TABLE "Purchase" ALTER COLUMN "netAmount" SET DATA TYPE INTEGER USING "netAmount"::integer;
ALTER TABLE "Purchase" ALTER COLUMN "ivaAmount" SET DATA TYPE INTEGER USING "ivaAmount"::integer;
ALTER TABLE "Purchase" ALTER COLUMN "totalAmount" SET DATA TYPE INTEGER USING "totalAmount"::integer;

ALTER TABLE "Sale" ALTER COLUMN "netAmount" SET DATA TYPE INTEGER USING "netAmount"::integer;
ALTER TABLE "Sale" ALTER COLUMN "ivaAmount" SET DATA TYPE INTEGER USING "ivaAmount"::integer;
ALTER TABLE "Sale" ALTER COLUMN "totalAmount" SET DATA TYPE INTEGER USING "totalAmount"::integer;
ALTER TABLE "Sale" ALTER COLUMN "retentionAmount" SET DATA TYPE INTEGER USING "retentionAmount"::integer;

ALTER TABLE "Expense" ALTER COLUMN "netAmount" SET DATA TYPE INTEGER USING "netAmount"::integer;
ALTER TABLE "Expense" ALTER COLUMN "ivaAmount" SET DATA TYPE INTEGER USING "ivaAmount"::integer;
ALTER TABLE "Expense" ALTER COLUMN "totalAmount" SET DATA TYPE INTEGER USING "totalAmount"::integer;

-- Retención de honorarios configurable por empresa.
ALTER TABLE "Company" ADD COLUMN "retentionRate" INTEGER NOT NULL DEFAULT 0;

-- Folio del documento original en notas de crédito/débito.
ALTER TABLE "Purchase" ADD COLUMN "referenceDocumentNumber" TEXT;
ALTER TABLE "Sale" ADD COLUMN "referenceDocumentNumber" TEXT;

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('PURCHASE_DUE_SOON', 'PURCHASE_OVERDUE', 'SALE_DUE_SOON', 'SALE_OVERDUE');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'IMPORT');

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "href" TEXT,
    "dedupeKey" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT,
    "userName" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "summary" TEXT NOT NULL,
    "changes" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Notification_companyId_dedupeKey_key" ON "Notification"("companyId", "dedupeKey");

-- CreateIndex
CREATE INDEX "Notification_companyId_readAt_idx" ON "Notification"("companyId", "readAt");

-- CreateIndex
CREATE INDEX "Notification_companyId_createdAt_idx" ON "Notification"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_companyId_createdAt_idx" ON "AuditLog"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_companyId_entityType_entityId_idx" ON "AuditLog"("companyId", "entityType", "entityId");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
