-- Vincular StaffMeetingAttendee a Teacher (FK opcional) para que los asistentes
-- docentes queden trazables. Se agrega personName para mostrar el nombre cuando
-- el asistente no es un docente vinculado (funcionarios, directores externos, etc.).

-- AlterTable
ALTER TABLE "StaffMeetingAttendee" ADD COLUMN     "personName" TEXT NOT NULL,
ALTER COLUMN "personId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "StaffMeetingAttendee" ADD CONSTRAINT "StaffMeetingAttendee_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Teacher"("id") ON DELETE SET NULL ON UPDATE CASCADE;
