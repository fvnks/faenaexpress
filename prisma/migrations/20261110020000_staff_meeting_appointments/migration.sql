-- Agregar teacherId a Appointment para que las citas sepan a qué docente van dirigidas.
-- Crear modelos StaffMeeting, StaffMeetingAttendee y MeetingAgreement para reuniones
// de equipo y de curso, con asistentes, acta y acuerdos.

-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "teacherId" TEXT;

-- CreateEnum
CREATE TYPE "MeetingType" AS ENUM ('CURSO', 'DEPARTAMENTO', 'CLAUSTRO', 'HOMOTRIA', 'APODERADOS');

-- CreateTable
CREATE TABLE "StaffMeeting" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "courseId" TEXT,
    "type" "MeetingType" NOT NULL DEFAULT 'CURSO',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "place" TEXT,
    "minutes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffMeeting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffMeetingAttendee" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "personRole" TEXT NOT NULL,
    "attended" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,

    CONSTRAINT "StaffMeetingAttendee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeetingAgreement" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "responsible" TEXT,
    "dueDate" TIMESTAMP(3),
    "done" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "MeetingAgreement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Appointment_teacherId_idx" ON "Appointment"("teacherId");

-- CreateIndex
CREATE INDEX "StaffMeeting_schoolId_startsAt_idx" ON "StaffMeeting"("schoolId", "startsAt");

-- CreateIndex
CREATE INDEX "StaffMeeting_courseId_idx" ON "StaffMeeting"("courseId");

-- CreateIndex
CREATE INDEX "StaffMeetingAttendee_meetingId_idx" ON "StaffMeetingAttendee"("meetingId");

-- CreateIndex
CREATE INDEX "MeetingAgreement_meetingId_idx" ON "MeetingAgreement"("meetingId");

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffMeeting" ADD CONSTRAINT "StaffMeeting_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffMeeting" ADD CONSTRAINT "StaffMeeting_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffMeeting" ADD CONSTRAINT "StaffMeeting_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Teacher"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffMeetingAttendee" ADD CONSTRAINT "StaffMeetingAttendee_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "StaffMeeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingAgreement" ADD CONSTRAINT "MeetingAgreement_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "StaffMeeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;
