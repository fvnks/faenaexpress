-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'ACCOUNTANT', 'SALES', 'VIEWER');

-- CreateEnum
CREATE TYPE "InventoryAccess" AS ENUM ('NONE', 'VIEW', 'EDIT');

-- CreateEnum
CREATE TYPE "PartnerType" AS ENUM ('CUSTOMER', 'SUPPLIER', 'BOTH');

-- CreateEnum
CREATE TYPE "CategoryKind" AS ENUM ('EXPENSE', 'INCOME', 'BOTH');

-- CreateEnum
CREATE TYPE "CommissionRule" AS ENUM ('INVOICE', 'GUIDE');

-- CreateEnum
CREATE TYPE "AbsenceType" AS ENUM ('SICK', 'VACATION', 'PERSONAL', 'UNPAID', 'OTHER');

-- CreateEnum
CREATE TYPE "AbsenceStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "WorkerDocumentType" AS ENUM ('CONTRACT', 'ANNEX', 'CERTIFICATE', 'OTHER');

-- CreateEnum
CREATE TYPE "RemunerationType" AS ENUM ('SUELDO', 'AGUINALDO', 'BONO', 'ADELANTO', 'OTRO');

-- CreateEnum
CREATE TYPE "StockMovementType" AS ENUM ('IN', 'OUT', 'ADJUST_IN', 'ADJUST_OUT', 'WASTE', 'INITIAL', 'TRANSFER');

-- CreateEnum
CREATE TYPE "StockCountStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('INVOICE', 'RECEIPT', 'CREDIT_NOTE', 'DEBIT_NOTE', 'QUOTATION', 'OTHER');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID');

-- CreateEnum
CREATE TYPE "SaleStatus" AS ENUM ('PENDING', 'PAID', 'PARTIAL', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'TRANSFER', 'CREDIT_CARD', 'DEBIT_CARD', 'CHECK', 'OTHER');

-- CreateEnum
CREATE TYPE "CommissionSource" AS ENUM ('AUTO', 'MANUAL');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('PURCHASE_DUE_SOON', 'PURCHASE_OVERDUE', 'SALE_DUE_SOON', 'SALE_OVERDUE', 'LIMIT_EXCEEDED');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'IMPORT');

-- CreateEnum
CREATE TYPE "PayrollStatus" AS ENUM ('DRAFT', 'CLOSED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'VIEWER',
    "inventoryAccess" "InventoryAccess" NOT NULL DEFAULT 'NONE',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rut" TEXT,
    "address" TEXT,
    "city" TEXT,
    "commune" TEXT,
    "giro" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "ivaRate" INTEGER NOT NULL DEFAULT 19,
    "retentionRate" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'CLP',
    "alertDueSoonDays" INTEGER NOT NULL DEFAULT 5,
    "alertPorCobrarLimit" INTEGER,
    "alertPorPagarLimit" INTEGER,
    "alertReembolsosLimit" INTEGER,
    "afpRate" INTEGER NOT NULL DEFAULT 10,
    "healthRate" INTEGER NOT NULL DEFAULT 7,
    "unemploymentRate" INTEGER NOT NULL DEFAULT 1,
    "anualBonusRate" INTEGER NOT NULL DEFAULT 0,
    "siiRut" TEXT,
    "siiClaveEnc" TEXT,
    "defontanaEmail" TEXT,
    "defontanaClaveEnc" TEXT,
    "defontanaTokenEnc" TEXT,
    "defontanaTokenExp" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Partner" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "type" "PartnerType" NOT NULL DEFAULT 'CUSTOMER',
    "name" TEXT NOT NULL,
    "rut" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "commune" TEXT,
    "giro" TEXT,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "salespersonId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Partner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "CategoryKind" NOT NULL DEFAULT 'EXPENSE',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Area" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Area_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Salesperson" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "commissionRate" INTEGER NOT NULL DEFAULT 0,
    "commissionRule" "CommissionRule" NOT NULL DEFAULT 'INVOICE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Salesperson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payer" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Worker" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rut" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "position" TEXT,
    "areaId" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "birthDate" DATE,
    "hireDate" DATE,
    "terminationDate" DATE,
    "contractType" TEXT,
    "baseAmount" INTEGER,
    "bankName" TEXT,
    "bankAccount" TEXT,
    "afp" TEXT,
    "healthPlan" TEXT,
    "status" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Worker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Absence" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "type" "AbsenceType" NOT NULL,
    "status" "AbsenceStatus" NOT NULL DEFAULT 'PENDING',
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "paid" BOOLEAN NOT NULL DEFAULT false,
    "reason" TEXT,
    "notes" TEXT,
    "approvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Absence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkerDocument" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "WorkerDocumentType" NOT NULL DEFAULT 'OTHER',
    "description" TEXT,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "fileData" BYTEA NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkerDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Remuneration" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "type" "RemunerationType" NOT NULL,
    "period" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "amount" INTEGER NOT NULL,
    "paidById" TEXT NOT NULL,
    "expenseId" TEXT,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Remuneration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentMethodCatalog" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentMethodCatalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Unit" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Unit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductCategory" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Warehouse" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Warehouse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "unitId" TEXT,
    "categoryId" TEXT,
    "supplierId" TEXT,
    "ivaAffected" BOOLEAN NOT NULL DEFAULT true,
    "costNet" INTEGER NOT NULL DEFAULT 0,
    "priceNet" INTEGER,
    "minStock" DECIMAL(14,3),
    "location" TEXT,
    "tracksStock" BOOLEAN NOT NULL DEFAULT true,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductStock" (
    "productId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "avgCost" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductStock_pkey" PRIMARY KEY ("productId","warehouseId")
);

-- CreateTable
CREATE TABLE "StockMovement" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "type" "StockMovementType" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,
    "unitCost" INTEGER,
    "warehouseId" TEXT,
    "toWarehouseId" TEXT,
    "reason" TEXT,
    "reference" TEXT,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockCount" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "warehouseId" TEXT,
    "code" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "status" "StockCountStatus" NOT NULL DEFAULT 'OPEN',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockCount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockCountItem" (
    "id" TEXT NOT NULL,
    "stockCountId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "systemQuantity" DECIMAL(14,3) NOT NULL,
    "countedQuantity" DECIMAL(14,3),
    "movementId" TEXT,
    "notes" TEXT,

    CONSTRAINT "StockCountItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Purchase" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3),
    "partnerId" TEXT NOT NULL,
    "categoryId" TEXT,
    "areaId" TEXT,
    "documentType" "DocumentType" NOT NULL DEFAULT 'INVOICE',
    "documentNumber" TEXT,
    "referenceDocumentNumber" TEXT,
    "purchaseOrder" TEXT,
    "dispatchGuide" TEXT,
    "hesNumber" TEXT,
    "facturaOriginal" TEXT,
    "tipoDocRefOriginal" TEXT,
    "fechaRecepcion" TIMESTAMP(3),
    "estadoReceptor" TEXT,
    "description" TEXT,
    "xmlContent" TEXT,
    "netAmount" INTEGER NOT NULL,
    "ivaAmount" INTEGER NOT NULL DEFAULT 0,
    "exento" INTEGER NOT NULL DEFAULT 0,
    "ivaRecargo" INTEGER NOT NULL DEFAULT 0,
    "totalAmount" INTEGER NOT NULL,
    "tasaIVA" DOUBLE PRECISION,
    "formaPago" TEXT,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paymentDate" TIMESTAMP(3),
    "paymentMethod" "PaymentMethod",
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Purchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sale" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3),
    "partnerId" TEXT NOT NULL,
    "categoryId" TEXT,
    "areaId" TEXT,
    "salespersonId" TEXT,
    "documentType" "DocumentType" NOT NULL DEFAULT 'INVOICE',
    "documentNumber" TEXT,
    "referenceDocumentNumber" TEXT,
    "purchaseOrder" TEXT,
    "dispatchGuide" TEXT,
    "hesNumber" TEXT,
    "description" TEXT,
    "xmlContent" TEXT,
    "netAmount" INTEGER NOT NULL,
    "ivaAmount" INTEGER NOT NULL DEFAULT 0,
    "totalAmount" INTEGER NOT NULL,
    "retentionAmount" INTEGER NOT NULL DEFAULT 0,
    "formaPago" TEXT,
    "exento" INTEGER NOT NULL DEFAULT 0,
    "ivaRecargo" INTEGER NOT NULL DEFAULT 0,
    "tasaIVA" DOUBLE PRECISION,
    "facturaOriginal" TEXT,
    "tipoDocRefOriginal" TEXT,
    "fechaRecepcion" TIMESTAMP(3),
    "estadoReceptor" TEXT,
    "status" "SaleStatus" NOT NULL DEFAULT 'PENDING',
    "paymentDate" TIMESTAMP(3),
    "confirmingAt" TIMESTAMP(3),
    "paymentMethod" "PaymentMethod",
    "notes" TEXT,
    "cancellationType" TEXT,
    "cancellationNoteNumber" TEXT,
    "cancellationReason" TEXT,
    "cancellationComment" TEXT,
    "refacturadaNumber" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseItem" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "purchaseId" TEXT NOT NULL,
    "productId" TEXT,
    "name" TEXT NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL DEFAULT 1,
    "unitPrice" INTEGER NOT NULL DEFAULT 0,
    "amount" INTEGER NOT NULL DEFAULT 0,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PurchaseItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaleItem" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "productId" TEXT,
    "name" TEXT NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL DEFAULT 1,
    "unitPrice" INTEGER NOT NULL DEFAULT 0,
    "amount" INTEGER NOT NULL DEFAULT 0,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SaleItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommissionAssignment" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "saleId" TEXT,
    "dispatchGuideId" TEXT,
    "period" TEXT NOT NULL,
    "salespersonId" TEXT NOT NULL,
    "note" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommissionAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommissionEntry" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "salespersonId" TEXT NOT NULL,
    "saleId" TEXT,
    "dispatchGuideId" TEXT,
    "source" "CommissionSource" NOT NULL DEFAULT 'AUTO',
    "baseAmount" INTEGER NOT NULL,
    "rateBps" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommissionEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommissionClose" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "closedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedById" TEXT NOT NULL,

    CONSTRAINT "CommissionClose_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DispatchGuide" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "guideNumber" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "partnerId" TEXT NOT NULL,
    "salespersonId" TEXT,
    "netAmount" INTEGER NOT NULL,
    "note" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DispatchGuide_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "categoryId" TEXT,
    "areaId" TEXT,
    "workerId" TEXT,
    "documentNumber" TEXT,
    "netAmount" INTEGER NOT NULL,
    "ivaAmount" INTEGER NOT NULL DEFAULT 0,
    "totalAmount" INTEGER NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'CASH',
    "reimbursed" BOOLEAN NOT NULL DEFAULT false,
    "reimbursedAt" TIMESTAMP(3),
    "notes" TEXT,
    "paidById" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "PayrollPeriod" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "status" "PayrollStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ratesSource" TEXT,
    "indicatorsSnapshot" JSONB,

    CONSTRAINT "PayrollPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollEntry" (
    "id" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "baseAmount" INTEGER NOT NULL,
    "allowances" INTEGER NOT NULL DEFAULT 0,
    "overtime" INTEGER NOT NULL DEFAULT 0,
    "grossAmount" INTEGER NOT NULL,
    "afpAmount" INTEGER NOT NULL DEFAULT 0,
    "healthAmount" INTEGER NOT NULL DEFAULT 0,
    "unemploymentAmount" INTEGER NOT NULL DEFAULT 0,
    "taxAmount" INTEGER NOT NULL DEFAULT 0,
    "otherDeductions" INTEGER NOT NULL DEFAULT 0,
    "deductionsTotal" INTEGER NOT NULL,
    "netAmount" INTEGER NOT NULL,
    "expenseId" TEXT,
    "paidAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollEntry_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "BankAccount" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "bankId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'account',
    "balance" INTEGER,
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankMovement" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "description" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "balance" INTEGER,
    "source" TEXT NOT NULL DEFAULT 'account',
    "fingerprint" TEXT NOT NULL,
    "ignoredAt" TIMESTAMP(3),
    "ignoredReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BankMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankSync" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "bankId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "message" TEXT,
    "imported" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "userId" TEXT NOT NULL,

    CONSTRAINT "BankSync_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reconciliation" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "movementId" TEXT NOT NULL,
    "purchaseId" TEXT,
    "saleId" TEXT,
    "expenseId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "Reconciliation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Membership_companyId_idx" ON "Membership"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_userId_companyId_key" ON "Membership"("userId", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE INDEX "Partner_companyId_name_idx" ON "Partner"("companyId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Partner_companyId_rut_key" ON "Partner"("companyId", "rut");

-- CreateIndex
CREATE INDEX "Category_companyId_idx" ON "Category"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "Category_companyId_name_key" ON "Category"("companyId", "name");

-- CreateIndex
CREATE INDEX "Area_companyId_idx" ON "Area"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "Area_companyId_name_key" ON "Area"("companyId", "name");

-- CreateIndex
CREATE INDEX "Salesperson_companyId_idx" ON "Salesperson"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "Salesperson_companyId_name_key" ON "Salesperson"("companyId", "name");

-- CreateIndex
CREATE INDEX "Payer_companyId_idx" ON "Payer"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "Payer_companyId_name_key" ON "Payer"("companyId", "name");

-- CreateIndex
CREATE INDEX "Worker_companyId_idx" ON "Worker"("companyId");

-- CreateIndex
CREATE INDEX "Worker_companyId_areaId_idx" ON "Worker"("companyId", "areaId");

-- CreateIndex
CREATE INDEX "Worker_companyId_active_idx" ON "Worker"("companyId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "Worker_companyId_name_key" ON "Worker"("companyId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Worker_companyId_rut_key" ON "Worker"("companyId", "rut");

-- CreateIndex
CREATE INDEX "Absence_companyId_workerId_idx" ON "Absence"("companyId", "workerId");

-- CreateIndex
CREATE INDEX "Absence_companyId_startDate_idx" ON "Absence"("companyId", "startDate");

-- CreateIndex
CREATE INDEX "Absence_companyId_type_idx" ON "Absence"("companyId", "type");

-- CreateIndex
CREATE INDEX "WorkerDocument_companyId_workerId_idx" ON "WorkerDocument"("companyId", "workerId");

-- CreateIndex
CREATE INDEX "Remuneration_companyId_date_idx" ON "Remuneration"("companyId", "date");

-- CreateIndex
CREATE INDEX "Remuneration_companyId_workerId_idx" ON "Remuneration"("companyId", "workerId");

-- CreateIndex
CREATE INDEX "Remuneration_companyId_type_idx" ON "Remuneration"("companyId", "type");

-- CreateIndex
CREATE INDEX "PaymentMethodCatalog_companyId_idx" ON "PaymentMethodCatalog"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentMethodCatalog_companyId_name_key" ON "PaymentMethodCatalog"("companyId", "name");

-- CreateIndex
CREATE INDEX "Unit_companyId_idx" ON "Unit"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "Unit_companyId_name_key" ON "Unit"("companyId", "name");

-- CreateIndex
CREATE INDEX "ProductCategory_companyId_idx" ON "ProductCategory"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductCategory_companyId_name_key" ON "ProductCategory"("companyId", "name");

-- CreateIndex
CREATE INDEX "Warehouse_companyId_idx" ON "Warehouse"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "Warehouse_companyId_name_key" ON "Warehouse"("companyId", "name");

-- CreateIndex
CREATE INDEX "Product_companyId_name_idx" ON "Product"("companyId", "name");

-- CreateIndex
CREATE INDEX "Product_companyId_categoryId_idx" ON "Product"("companyId", "categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "Product_companyId_sku_key" ON "Product"("companyId", "sku");

-- CreateIndex
CREATE INDEX "ProductStock_companyId_idx" ON "ProductStock"("companyId");

-- CreateIndex
CREATE INDEX "ProductStock_companyId_warehouseId_idx" ON "ProductStock"("companyId", "warehouseId");

-- CreateIndex
CREATE INDEX "StockMovement_companyId_productId_date_idx" ON "StockMovement"("companyId", "productId", "date");

-- CreateIndex
CREATE INDEX "StockMovement_companyId_date_idx" ON "StockMovement"("companyId", "date");

-- CreateIndex
CREATE INDEX "StockMovement_companyId_warehouseId_idx" ON "StockMovement"("companyId", "warehouseId");

-- CreateIndex
CREATE INDEX "StockCount_companyId_status_idx" ON "StockCount"("companyId", "status");

-- CreateIndex
CREATE INDEX "StockCount_companyId_date_idx" ON "StockCount"("companyId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "StockCount_companyId_code_key" ON "StockCount"("companyId", "code");

-- CreateIndex
CREATE INDEX "StockCountItem_productId_idx" ON "StockCountItem"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "StockCountItem_stockCountId_productId_key" ON "StockCountItem"("stockCountId", "productId");

-- CreateIndex
CREATE INDEX "Purchase_companyId_date_idx" ON "Purchase"("companyId", "date");

-- CreateIndex
CREATE INDEX "Purchase_companyId_partnerId_idx" ON "Purchase"("companyId", "partnerId");

-- CreateIndex
CREATE INDEX "Purchase_companyId_status_idx" ON "Purchase"("companyId", "status");

-- CreateIndex
CREATE INDEX "Purchase_companyId_categoryId_idx" ON "Purchase"("companyId", "categoryId");

-- CreateIndex
CREATE INDEX "Purchase_companyId_areaId_idx" ON "Purchase"("companyId", "areaId");

-- CreateIndex
CREATE INDEX "Sale_companyId_date_idx" ON "Sale"("companyId", "date");

-- CreateIndex
CREATE INDEX "Sale_companyId_partnerId_idx" ON "Sale"("companyId", "partnerId");

-- CreateIndex
CREATE INDEX "Sale_companyId_status_idx" ON "Sale"("companyId", "status");

-- CreateIndex
CREATE INDEX "Sale_companyId_categoryId_idx" ON "Sale"("companyId", "categoryId");

-- CreateIndex
CREATE INDEX "Sale_companyId_areaId_idx" ON "Sale"("companyId", "areaId");

-- CreateIndex
CREATE INDEX "Sale_companyId_salespersonId_idx" ON "Sale"("companyId", "salespersonId");

-- CreateIndex
CREATE UNIQUE INDEX "Sale_companyId_documentNumber_key" ON "Sale"("companyId", "documentNumber");

-- CreateIndex
CREATE INDEX "PurchaseItem_purchaseId_idx" ON "PurchaseItem"("purchaseId");

-- CreateIndex
CREATE INDEX "PurchaseItem_companyId_productId_idx" ON "PurchaseItem"("companyId", "productId");

-- CreateIndex
CREATE INDEX "SaleItem_saleId_idx" ON "SaleItem"("saleId");

-- CreateIndex
CREATE INDEX "SaleItem_companyId_productId_idx" ON "SaleItem"("companyId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "CommissionAssignment_saleId_key" ON "CommissionAssignment"("saleId");

-- CreateIndex
CREATE UNIQUE INDEX "CommissionAssignment_dispatchGuideId_key" ON "CommissionAssignment"("dispatchGuideId");

-- CreateIndex
CREATE INDEX "CommissionAssignment_companyId_period_idx" ON "CommissionAssignment"("companyId", "period");

-- CreateIndex
CREATE INDEX "CommissionAssignment_companyId_salespersonId_idx" ON "CommissionAssignment"("companyId", "salespersonId");

-- CreateIndex
CREATE INDEX "CommissionEntry_companyId_period_salespersonId_idx" ON "CommissionEntry"("companyId", "period", "salespersonId");

-- CreateIndex
CREATE UNIQUE INDEX "CommissionEntry_companyId_period_saleId_key" ON "CommissionEntry"("companyId", "period", "saleId");

-- CreateIndex
CREATE UNIQUE INDEX "CommissionEntry_companyId_period_dispatchGuideId_key" ON "CommissionEntry"("companyId", "period", "dispatchGuideId");

-- CreateIndex
CREATE INDEX "CommissionClose_companyId_idx" ON "CommissionClose"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "CommissionClose_companyId_period_key" ON "CommissionClose"("companyId", "period");

-- CreateIndex
CREATE INDEX "DispatchGuide_companyId_date_idx" ON "DispatchGuide"("companyId", "date");

-- CreateIndex
CREATE INDEX "DispatchGuide_companyId_salespersonId_idx" ON "DispatchGuide"("companyId", "salespersonId");

-- CreateIndex
CREATE UNIQUE INDEX "DispatchGuide_companyId_guideNumber_key" ON "DispatchGuide"("companyId", "guideNumber");

-- CreateIndex
CREATE INDEX "Expense_companyId_date_idx" ON "Expense"("companyId", "date");

-- CreateIndex
CREATE INDEX "Expense_companyId_paidById_idx" ON "Expense"("companyId", "paidById");

-- CreateIndex
CREATE INDEX "Expense_companyId_workerId_idx" ON "Expense"("companyId", "workerId");

-- CreateIndex
CREATE INDEX "Expense_companyId_categoryId_idx" ON "Expense"("companyId", "categoryId");

-- CreateIndex
CREATE INDEX "Expense_companyId_areaId_idx" ON "Expense"("companyId", "areaId");

-- CreateIndex
CREATE INDEX "Notification_companyId_readAt_idx" ON "Notification"("companyId", "readAt");

-- CreateIndex
CREATE INDEX "Notification_companyId_createdAt_idx" ON "Notification"("companyId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Notification_companyId_dedupeKey_key" ON "Notification"("companyId", "dedupeKey");

-- CreateIndex
CREATE INDEX "AuditLog_companyId_createdAt_idx" ON "AuditLog"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_companyId_entityType_entityId_idx" ON "AuditLog"("companyId", "entityType", "entityId");

-- CreateIndex
CREATE INDEX "PayrollPeriod_companyId_status_idx" ON "PayrollPeriod"("companyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollPeriod_companyId_year_month_key" ON "PayrollPeriod"("companyId", "year", "month");

-- CreateIndex
CREATE INDEX "PayrollEntry_workerId_idx" ON "PayrollEntry"("workerId");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollEntry_periodId_workerId_key" ON "PayrollEntry"("periodId", "workerId");

-- CreateIndex
CREATE INDEX "ProductLot_companyId_productId_idx" ON "ProductLot"("companyId", "productId");

-- CreateIndex
CREATE INDEX "ProductLot_expirationDate_idx" ON "ProductLot"("expirationDate");

-- CreateIndex
CREATE INDEX "ProductLot_companyId_expirationDate_idx" ON "ProductLot"("companyId", "expirationDate");

-- CreateIndex
CREATE INDEX "BankAccount_companyId_idx" ON "BankAccount"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "BankAccount_companyId_bankId_label_key" ON "BankAccount"("companyId", "bankId", "label");

-- CreateIndex
CREATE INDEX "BankMovement_companyId_date_idx" ON "BankMovement"("companyId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "BankMovement_accountId_fingerprint_key" ON "BankMovement"("accountId", "fingerprint");

-- CreateIndex
CREATE INDEX "BankSync_companyId_startedAt_idx" ON "BankSync"("companyId", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Reconciliation_movementId_key" ON "Reconciliation"("movementId");

-- CreateIndex
CREATE INDEX "Reconciliation_companyId_idx" ON "Reconciliation"("companyId");

-- CreateIndex
CREATE INDEX "Reconciliation_purchaseId_idx" ON "Reconciliation"("purchaseId");

-- CreateIndex
CREATE INDEX "Reconciliation_saleId_idx" ON "Reconciliation"("saleId");

-- CreateIndex
CREATE INDEX "Reconciliation_expenseId_idx" ON "Reconciliation"("expenseId");

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Partner" ADD CONSTRAINT "Partner_salespersonId_fkey" FOREIGN KEY ("salespersonId") REFERENCES "Salesperson"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Partner" ADD CONSTRAINT "Partner_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Area" ADD CONSTRAINT "Area_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Salesperson" ADD CONSTRAINT "Salesperson_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payer" ADD CONSTRAINT "Payer_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Worker" ADD CONSTRAINT "Worker_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Worker" ADD CONSTRAINT "Worker_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Absence" ADD CONSTRAINT "Absence_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Absence" ADD CONSTRAINT "Absence_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Absence" ADD CONSTRAINT "Absence_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkerDocument" ADD CONSTRAINT "WorkerDocument_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkerDocument" ADD CONSTRAINT "WorkerDocument_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkerDocument" ADD CONSTRAINT "WorkerDocument_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Remuneration" ADD CONSTRAINT "Remuneration_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Remuneration" ADD CONSTRAINT "Remuneration_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Remuneration" ADD CONSTRAINT "Remuneration_paidById_fkey" FOREIGN KEY ("paidById") REFERENCES "Payer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Remuneration" ADD CONSTRAINT "Remuneration_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "Expense"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Remuneration" ADD CONSTRAINT "Remuneration_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentMethodCatalog" ADD CONSTRAINT "PaymentMethodCatalog_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Unit" ADD CONSTRAINT "Unit_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCategory" ADD CONSTRAINT "ProductCategory_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Warehouse" ADD CONSTRAINT "Warehouse_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ProductCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductStock" ADD CONSTRAINT "ProductStock_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductStock" ADD CONSTRAINT "ProductStock_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductStock" ADD CONSTRAINT "ProductStock_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_toWarehouseId_fkey" FOREIGN KEY ("toWarehouseId") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockCount" ADD CONSTRAINT "StockCount_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockCount" ADD CONSTRAINT "StockCount_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockCount" ADD CONSTRAINT "StockCount_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockCountItem" ADD CONSTRAINT "StockCountItem_stockCountId_fkey" FOREIGN KEY ("stockCountId") REFERENCES "StockCount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockCountItem" ADD CONSTRAINT "StockCountItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_salespersonId_fkey" FOREIGN KEY ("salespersonId") REFERENCES "Salesperson"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseItem" ADD CONSTRAINT "PurchaseItem_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseItem" ADD CONSTRAINT "PurchaseItem_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseItem" ADD CONSTRAINT "PurchaseItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionAssignment" ADD CONSTRAINT "CommissionAssignment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionAssignment" ADD CONSTRAINT "CommissionAssignment_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionAssignment" ADD CONSTRAINT "CommissionAssignment_dispatchGuideId_fkey" FOREIGN KEY ("dispatchGuideId") REFERENCES "DispatchGuide"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionAssignment" ADD CONSTRAINT "CommissionAssignment_salespersonId_fkey" FOREIGN KEY ("salespersonId") REFERENCES "Salesperson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionAssignment" ADD CONSTRAINT "CommissionAssignment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionEntry" ADD CONSTRAINT "CommissionEntry_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionEntry" ADD CONSTRAINT "CommissionEntry_salespersonId_fkey" FOREIGN KEY ("salespersonId") REFERENCES "Salesperson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionEntry" ADD CONSTRAINT "CommissionEntry_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionEntry" ADD CONSTRAINT "CommissionEntry_dispatchGuideId_fkey" FOREIGN KEY ("dispatchGuideId") REFERENCES "DispatchGuide"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionClose" ADD CONSTRAINT "CommissionClose_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionClose" ADD CONSTRAINT "CommissionClose_closedById_fkey" FOREIGN KEY ("closedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispatchGuide" ADD CONSTRAINT "DispatchGuide_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispatchGuide" ADD CONSTRAINT "DispatchGuide_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispatchGuide" ADD CONSTRAINT "DispatchGuide_salespersonId_fkey" FOREIGN KEY ("salespersonId") REFERENCES "Salesperson"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispatchGuide" ADD CONSTRAINT "DispatchGuide_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_paidById_fkey" FOREIGN KEY ("paidById") REFERENCES "Payer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollPeriod" ADD CONSTRAINT "PayrollPeriod_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollPeriod" ADD CONSTRAINT "PayrollPeriod_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollEntry" ADD CONSTRAINT "PayrollEntry_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "PayrollPeriod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollEntry" ADD CONSTRAINT "PayrollEntry_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollEntry" ADD CONSTRAINT "PayrollEntry_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "Expense"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductLot" ADD CONSTRAINT "ProductLot_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductLot" ADD CONSTRAINT "ProductLot_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductLot" ADD CONSTRAINT "ProductLot_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductLot" ADD CONSTRAINT "ProductLot_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankAccount" ADD CONSTRAINT "BankAccount_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankMovement" ADD CONSTRAINT "BankMovement_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankMovement" ADD CONSTRAINT "BankMovement_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "BankAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankSync" ADD CONSTRAINT "BankSync_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankSync" ADD CONSTRAINT "BankSync_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reconciliation" ADD CONSTRAINT "Reconciliation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reconciliation" ADD CONSTRAINT "Reconciliation_movementId_fkey" FOREIGN KEY ("movementId") REFERENCES "BankMovement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reconciliation" ADD CONSTRAINT "Reconciliation_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reconciliation" ADD CONSTRAINT "Reconciliation_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reconciliation" ADD CONSTRAINT "Reconciliation_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "Expense"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reconciliation" ADD CONSTRAINT "Reconciliation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
