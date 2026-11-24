-- CreateEnum
CREATE TYPE "ObraRole" AS ENUM ('ADMIN_OBRA', 'CAPATAZ', 'CONTADOR', 'VISUALIZADOR');

-- CreateEnum
CREATE TYPE "ObraStatus" AS ENUM ('PLANIFICADA', 'EN_CURSO', 'SUSPENDIDA', 'TERMINADA');

-- CreateTable
CREATE TABLE "Obra" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "mandante" TEXT,
    "rutMandante" TEXT,
    "direccion" TEXT,
    "comuna" TEXT,
    "fechaInicio" TIMESTAMP(3),
    "fechaTermino" TIMESTAMP(3),
    "status" "ObraStatus" NOT NULL DEFAULT 'PLANIFICADA',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Obra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ObraMembership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "obraId" TEXT NOT NULL,
    "role" "ObraRole" NOT NULL DEFAULT 'VISUALIZADOR',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ObraMembership_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Obra_organizationId_idx" ON "Obra"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "ObraMembership_userId_obraId_key" ON "ObraMembership"("userId", "obraId");

-- CreateIndex
CREATE INDEX "ObraMembership_obraId_idx" ON "ObraMembership"("obraId");

-- AddForeignKey
ALTER TABLE "Obra" ADD CONSTRAINT "Obra_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ObraMembership" ADD CONSTRAINT "ObraMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ObraMembership" ADD CONSTRAINT "ObraMembership_obraId_fkey" FOREIGN KEY ("obraId") REFERENCES "Obra"("id") ON DELETE CASCADE ON UPDATE CASCADE;
