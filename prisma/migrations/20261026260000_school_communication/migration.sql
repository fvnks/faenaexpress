-- CreateEnum
CREATE TYPE "CircularAudience" AS ENUM ('COLEGIO', 'CURSO', 'FAMILIA');

-- CreateEnum
CREATE TYPE "JustificationStatus" AS ENUM ('PENDIENTE', 'ACEPTADA', 'RECHAZADA');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('PENDIENTE', 'CONFIRMADA', 'RECHAZADA', 'REALIZADA', 'CANCELADA');

-- CreateTable
CREATE TABLE "Circular" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "audience" "CircularAudience" NOT NULL DEFAULT 'COLEGIO',
    "courseId" TEXT,
    "guardianId" TEXT,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closesAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Circular_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CircularAck" (
    "id" TEXT NOT NULL,
    "circularId" TEXT NOT NULL,
    "guardianId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CircularAck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JustificationRequest" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "status" "JustificationStatus" NOT NULL DEFAULT 'PENDIENTE',
    "reason" TEXT NOT NULL,
    "note" TEXT,
    "requestedByGuardianId" TEXT NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "resolvedById" TEXT,
    "resolution" TEXT,

    CONSTRAINT "JustificationRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "guardianId" TEXT,
    "title" TEXT NOT NULL,
    "reason" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "durationMin" INTEGER NOT NULL DEFAULT 30,
    "place" TEXT,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'PENDIENTE',
    "notes" TEXT,
    "response" TEXT,
    "respondedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Circular_schoolId_publishedAt_idx" ON "Circular"("schoolId", "publishedAt");

-- CreateIndex
CREATE INDEX "CircularAck_guardianId_idx" ON "CircularAck"("guardianId");

-- CreateIndex
CREATE UNIQUE INDEX "CircularAck_circularId_guardianId_key" ON "CircularAck"("circularId", "guardianId");

-- CreateIndex
CREATE INDEX "JustificationRequest_schoolId_status_idx" ON "JustificationRequest"("schoolId", "status");

-- CreateIndex
CREATE INDEX "JustificationRequest_studentId_idx" ON "JustificationRequest"("studentId");

-- CreateIndex
CREATE INDEX "Appointment_schoolId_scheduledAt_idx" ON "Appointment"("schoolId", "scheduledAt");

-- CreateIndex
CREATE INDEX "Appointment_studentId_idx" ON "Appointment"("studentId");

-- AddForeignKey
ALTER TABLE "Circular" ADD CONSTRAINT "Circular_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Circular" ADD CONSTRAINT "Circular_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Circular" ADD CONSTRAINT "Circular_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES "Guardian"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CircularAck" ADD CONSTRAINT "CircularAck_circularId_fkey" FOREIGN KEY ("circularId") REFERENCES "Circular"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CircularAck" ADD CONSTRAINT "CircularAck_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES "Guardian"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JustificationRequest" ADD CONSTRAINT "JustificationRequest_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JustificationRequest" ADD CONSTRAINT "JustificationRequest_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JustificationRequest" ADD CONSTRAINT "JustificationRequest_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ClassSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JustificationRequest" ADD CONSTRAINT "JustificationRequest_requestedByGuardianId_fkey" FOREIGN KEY ("requestedByGuardianId") REFERENCES "Guardian"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES "Guardian"("id") ON DELETE SET NULL ON UPDATE CASCADE;
