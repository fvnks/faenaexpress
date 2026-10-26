-- CreateEnum
CREATE TYPE "PlatformInvoiceStatus" AS ENUM ('DRAFT', 'PENDING', 'PARTIAL', 'PAID', 'VOID', 'OVERDUE');

-- CreateEnum
CREATE TYPE "PlatformPaymentStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REFUNDED', 'CANCELED');

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('FLOW', 'MERCADOPAGO', 'TRANSFER', 'MANUAL', 'CARD');

-- CreateTable
CREATE TABLE "PlatformInvoice" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "status" "PlatformInvoiceStatus" NOT NULL DEFAULT 'PENDING',
    "amountCLP" INTEGER NOT NULL,
    "taxCLP" INTEGER NOT NULL DEFAULT 0,
    "totalCLP" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'CLP',
    "description" TEXT NOT NULL,
    "siiTrackId" TEXT,
    "siiFolio" INTEGER,
    "siiStatus" TEXT,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "planCode" TEXT NOT NULL,
    "planName" TEXT NOT NULL,
    "planPriceCLP" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformPayment" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "providerRef" TEXT,
    "amountCLP" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'CLP',
    "status" "PlatformPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "providerData" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformPaymentMethod" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "providerToken" TEXT,
    "displayName" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformPaymentMethod_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlatformInvoice_organizationId_status_idx" ON "PlatformInvoice"("organizationId", "status");

-- CreateIndex
CREATE INDEX "PlatformInvoice_organizationId_period_idx" ON "PlatformInvoice"("organizationId", "period");

-- CreateIndex
CREATE INDEX "PlatformInvoice_dueAt_idx" ON "PlatformInvoice"("dueAt");

-- CreateIndex
CREATE INDEX "PlatformInvoice_siiTrackId_idx" ON "PlatformInvoice"("siiTrackId");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformInvoice_organizationId_number_key" ON "PlatformInvoice"("organizationId", "number");

-- CreateIndex
CREATE INDEX "PlatformPayment_invoiceId_idx" ON "PlatformPayment"("invoiceId");

-- CreateIndex
CREATE INDEX "PlatformPayment_organizationId_idx" ON "PlatformPayment"("organizationId");

-- CreateIndex
CREATE INDEX "PlatformPayment_provider_providerRef_idx" ON "PlatformPayment"("provider", "providerRef");

-- CreateIndex
CREATE INDEX "PlatformPayment_status_idx" ON "PlatformPayment"("status");

-- CreateIndex
CREATE INDEX "PlatformPaymentMethod_organizationId_idx" ON "PlatformPaymentMethod"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformPaymentMethod_organizationId_provider_providerToken_key" ON "PlatformPaymentMethod"("organizationId", "provider", "providerToken");

-- AddForeignKey
ALTER TABLE "PlatformInvoice" ADD CONSTRAINT "PlatformInvoice_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformPayment" ADD CONSTRAINT "PlatformPayment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "PlatformInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformPaymentMethod" ADD CONSTRAINT "PlatformPaymentMethod_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;