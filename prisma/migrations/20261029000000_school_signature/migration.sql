-- La firma del verificador de identidad del MINEDUC sobre una sesión de clase.
--
-- El OTP que el docente presenta en su autenticador caduca a los 30 segundos,
-- así que no puede firmar alumno por alumno: firma la sesión entera (curso ×
-- asignatura × fecha) y todas sus filas de asistencia quedan con la misma
-- `digitalRandomKey`. El código se guarda porque el EDE lo exige en cada fila;
-- no es un secreto reutilizable (caducó al validarse) y junto a él se guarda
-- el RUN con el que el MINEDUC lo validó.

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "rut" TEXT;

-- CreateTable
CREATE TABLE "SchoolSignature" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "signedById" TEXT NOT NULL,
    "signerName" TEXT NOT NULL,
    "signerRut" TEXT NOT NULL,
    "otp" TEXT NOT NULL,
    "verifiedAt" TIMESTAMP(3) NOT NULL,
    "attendances" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SchoolSignature_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SchoolSignature_sessionId_key" ON "SchoolSignature"("sessionId");

-- CreateIndex
CREATE INDEX "SchoolSignature_schoolId_verifiedAt_idx" ON "SchoolSignature"("schoolId", "verifiedAt");

-- AddForeignKey
ALTER TABLE "SchoolSignature" ADD CONSTRAINT "SchoolSignature_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolSignature" ADD CONSTRAINT "SchoolSignature_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ClassSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
