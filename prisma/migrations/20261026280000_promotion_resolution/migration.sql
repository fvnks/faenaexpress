-- CreateEnum
CREATE TYPE "PromotionOutcome" AS ENUM ('PENDING', 'PROMOTED', 'NOT_PROMOTED');

-- CreateTable
CREATE TABLE "PromotionResolution" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "utpReport" TEXT,
    "utpReportById" TEXT,
    "utpReportedAt" TIMESTAMP(3),
    "hearingHeldAt" TIMESTAMP(3),
    "hearingNotes" TEXT,
    "outcome" "PromotionOutcome" NOT NULL DEFAULT 'PENDING',
    "decision" TEXT,
    "decidedById" TEXT,
    "decidedAt" TIMESTAMP(3),
    "attendanceException" BOOLEAN NOT NULL DEFAULT false,
    "attendanceExceptionReason" TEXT,
    "attendanceExceptionById" TEXT,
    "attendanceExceptionAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PromotionResolution_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PromotionResolution_schoolId_year_idx" ON "PromotionResolution"("schoolId", "year");

-- CreateIndex
CREATE UNIQUE INDEX "PromotionResolution_studentId_year_key" ON "PromotionResolution"("studentId", "year");

-- AddForeignKey
ALTER TABLE "PromotionResolution" ADD CONSTRAINT "PromotionResolution_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionResolution" ADD CONSTRAINT "PromotionResolution_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
