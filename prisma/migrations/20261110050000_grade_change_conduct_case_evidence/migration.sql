-- Fase 4: Convivencia y trazabilidad
--
-- 1. GradeChange: historial de correcciones de notas (trazabilidad Circular N°30)
-- 2. ConductCase.courseId: alcance de denuncia por curso (docente solo ve sus cursos)
-- 3. StudentDocument.evaluationId / caseId: evidencia vinculada a notas o casos

-- CreateTable
CREATE TABLE "GradeChange" (
    "id" TEXT NOT NULL,
    "evaluationId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "previousValue" DOUBLE PRECISION,
    "newValue" DOUBLE PRECISION,
    "previousStatus" "GradeStatus" NOT NULL,
    "newStatus" "GradeStatus" NOT NULL,
    "reason" TEXT,
    "changedById" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GradeChange_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GradeChange_evaluationId_studentId_idx" ON "GradeChange"("evaluationId", "studentId");

-- CreateIndex
CREATE INDEX "GradeChange_changedById_idx" ON "GradeChange"("changedById");

-- AlterTable
ALTER TABLE "ConductCase" ADD COLUMN     "courseId" TEXT;

-- AlterTable
ALTER TABLE "StudentDocument" ADD COLUMN     "caseId" TEXT,
ADD COLUMN     "evaluationId" TEXT;

-- AddForeignKey
ALTER TABLE "GradeChange" ADD CONSTRAINT "GradeChange_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "Evaluation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GradeChange" ADD CONSTRAINT "GradeChange_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GradeChange" ADD CONSTRAINT "GradeChange_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentDocument" ADD CONSTRAINT "StudentDocument_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "Evaluation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentDocument" ADD CONSTRAINT "StudentDocument_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "ConductCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
