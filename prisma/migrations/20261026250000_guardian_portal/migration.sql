-- AlterTable
ALTER TABLE "Guardian" ADD COLUMN     "accessCode" TEXT,
ADD COLUMN     "accessCodeCreatedAt" TIMESTAMP(3),
ADD COLUMN     "lastAccessAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "GuardianSession" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "guardianId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuardianSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GuardianSession_tokenHash_key" ON "GuardianSession"("tokenHash");

-- CreateIndex
CREATE INDEX "GuardianSession_guardianId_idx" ON "GuardianSession"("guardianId");

-- CreateIndex
CREATE UNIQUE INDEX "Guardian_accessCode_key" ON "Guardian"("accessCode");

-- AddForeignKey
ALTER TABLE "GuardianSession" ADD CONSTRAINT "GuardianSession_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES "Guardian"("id") ON DELETE CASCADE ON UPDATE CASCADE;
