-- CreateEnum
CREATE TYPE "CalendarEventType" AS ENUM ('HOLIDAY', 'VACATION', 'NON_INSTRUCTIONAL', 'EARLY_DISMISSAL', 'MAKEUP_DAY', 'OTHER');

-- CreateTable
CREATE TABLE "SchoolCalendarEvent" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "type" "CalendarEventType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isNonInstructional" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchoolCalendarEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SchoolCalendarEvent_schoolId_idx" ON "SchoolCalendarEvent"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "SchoolCalendarEvent_schoolId_date_key" ON "SchoolCalendarEvent"("schoolId", "date");

-- AddForeignKey
ALTER TABLE "SchoolCalendarEvent" ADD CONSTRAINT "SchoolCalendarEvent_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
