-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "impersonatedByStaffId" TEXT,
ADD COLUMN     "impersonatedOrganizationId" TEXT,
ADD COLUMN     "impersonatedUntil" TIMESTAMP(3),
ADD COLUMN     "impersonationReason" TEXT;

-- CreateIndex
CREATE INDEX "Session_impersonatedByStaffId_idx" ON "Session"("impersonatedByStaffId");
