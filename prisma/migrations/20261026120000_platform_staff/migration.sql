-- CreateEnum
CREATE TYPE "PlatformLevel" AS ENUM ('SUPPORT', 'OPERATOR', 'OWNER');

-- CreateTable
CREATE TABLE "PlatformStaff" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "level" "PlatformLevel" NOT NULL DEFAULT 'SUPPORT',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformStaff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformAudit" (
    "id" TEXT NOT NULL,
    "staffUserId" TEXT NOT NULL,
    "staffUserName" TEXT NOT NULL,
    "staffUserEmail" TEXT NOT NULL,
    "level" "PlatformLevel" NOT NULL,
    "action" "AuditAction" NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "organizationId" TEXT,
    "summary" TEXT NOT NULL,
    "changes" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlatformStaff_userId_key" ON "PlatformStaff"("userId");

-- CreateIndex
CREATE INDEX "PlatformStaff_active_idx" ON "PlatformStaff"("active");

-- CreateIndex
CREATE INDEX "PlatformAudit_createdAt_idx" ON "PlatformAudit"("createdAt");

-- CreateIndex
CREATE INDEX "PlatformAudit_organizationId_createdAt_idx" ON "PlatformAudit"("organizationId", "createdAt");

-- AddForeignKey
ALTER TABLE "PlatformStaff" ADD CONSTRAINT "PlatformStaff_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
