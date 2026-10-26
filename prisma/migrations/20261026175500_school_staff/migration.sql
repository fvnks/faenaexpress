-- CreateEnum
CREATE TYPE "StaffRole" AS ENUM ('PORTERO', 'ASISTENTE_EDUCACION', 'ADMINISTRATIVO', 'PSICOLOGO', 'TRABAJADOR_SOCIAL', 'INSPECTOR', 'OTRO');

-- CreateEnum
CREATE TYPE "StaffJourney" AS ENUM ('COMPLETA', 'MEDIA', 'HORAS');

-- CreateTable
CREATE TABLE "Staff" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "rut" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "role" "StaffRole" NOT NULL DEFAULT 'OTRO',
    "journey" "StaffJourney" NOT NULL DEFAULT 'COMPLETA',
    "hireDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Staff_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Staff_schoolId_name_idx" ON "Staff"("schoolId", "name");

-- AddForeignKey
ALTER TABLE "Staff" ADD CONSTRAINT "Staff_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;