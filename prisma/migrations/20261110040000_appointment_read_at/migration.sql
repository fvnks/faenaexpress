-- Marcar citas como leídas por el docente.
-- Se agrega readAt para saber cuándo el docente vio la cita, y un índice
-- compuesto para consultar rápido las citas pendientes por docente.

-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "readAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Appointment_teacherId_status_idx" ON "Appointment"("teacherId", "status");
