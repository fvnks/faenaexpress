-- CreateEnum
CREATE TYPE "ConductCaseType" AS ENUM ('CONDUCTA', 'ACOSO_ESCOLAR', 'AGRESION', 'MALTRATO_INFANTIL', 'DISCRIMINACION', 'ACOSO_LABORAL', 'SALUD_MENTAL', 'OTRO');

-- CreateEnum
CREATE TYPE "ConductCaseStatus" AS ENUM ('ABIERTO', 'EN_INVESTIGACION', 'MEDIACION', 'RESUELTO', 'CERRADO');

-- CreateEnum
CREATE TYPE "CaseParticipantRole" AS ENUM ('DENUNCIANTE', 'DENUNCIADO', 'AFECTADO', 'TESTIGO');

-- CreateEnum
CREATE TYPE "ConductActionType" AS ENUM ('RECEPCION', 'INVESTIGACION', 'ENTREVISTA', 'CITACION', 'MEDIACION', 'INFORME_COMISION', 'SANCTION', 'SUSPENSION', 'EXPULSION', 'DERIVACION', 'REPOSICION', 'CIERRE');

-- CreateTable
CREATE TABLE "ConductCase" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "type" "ConductCaseType" NOT NULL DEFAULT 'CONDUCTA',
    "severity" TEXT NOT NULL DEFAULT 'LEVE',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "ConductCaseStatus" NOT NULL DEFAULT 'ABIERTO',
    "investigationDueAt" TIMESTAMP(3) NOT NULL,
    "reportedById" TEXT NOT NULL,
    "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "resolution" TEXT,
    "commissionReport" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConductCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseParticipant" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "role" "CaseParticipantRole" NOT NULL DEFAULT 'AFECTADO',
    "note" TEXT,

    CONSTRAINT "CaseParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConductAction" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "type" "ConductActionType" NOT NULL,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "dueAt" TIMESTAMP(3),
    "doneAt" TIMESTAMP(3),
    "outcome" TEXT,
    "responsibleId" TEXT,
    "responsible" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConductAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConductProtocol" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'CONVIVENCIA',
    "version" INTEGER NOT NULL DEFAULT 1,
    "steps" JSONB NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConductProtocol_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConvivenciaPlan" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'BORRADOR',
    "objectives" JSONB NOT NULL,
    "reviewDueAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConvivenciaPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanActivity" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "responsible" TEXT,
    "dueAt" TIMESTAMP(3),
    "doneAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlanActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConductCase_schoolId_status_idx" ON "ConductCase"("schoolId", "status");

-- CreateIndex
CREATE INDEX "ConductCase_schoolId_investigationDueAt_idx" ON "ConductCase"("schoolId", "investigationDueAt");

-- CreateIndex
CREATE INDEX "CaseParticipant_studentId_idx" ON "CaseParticipant"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "CaseParticipant_caseId_studentId_role_key" ON "CaseParticipant"("caseId", "studentId", "role");

-- CreateIndex
CREATE INDEX "ConductAction_caseId_dueAt_idx" ON "ConductAction"("caseId", "dueAt");

-- CreateIndex
CREATE INDEX "ConductAction_dueAt_idx" ON "ConductAction"("dueAt");

-- CreateIndex
CREATE INDEX "ConductProtocol_schoolId_active_idx" ON "ConductProtocol"("schoolId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "ConductProtocol_schoolId_name_version_key" ON "ConductProtocol"("schoolId", "name", "version");

-- CreateIndex
CREATE UNIQUE INDEX "ConvivenciaPlan_schoolId_year_key" ON "ConvivenciaPlan"("schoolId", "year");

-- CreateIndex
CREATE INDEX "PlanActivity_planId_dueAt_idx" ON "PlanActivity"("planId", "dueAt");

-- AddForeignKey
ALTER TABLE "ConductCase" ADD CONSTRAINT "ConductCase_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseParticipant" ADD CONSTRAINT "CaseParticipant_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "ConductCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseParticipant" ADD CONSTRAINT "CaseParticipant_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConductAction" ADD CONSTRAINT "ConductAction_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "ConductCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConductProtocol" ADD CONSTRAINT "ConductProtocol_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConvivenciaPlan" ADD CONSTRAINT "ConvivenciaPlan_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanActivity" ADD CONSTRAINT "PlanActivity_planId_fkey" FOREIGN KEY ("planId") REFERENCES "ConvivenciaPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
