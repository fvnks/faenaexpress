-- CreateTable
CREATE TABLE "FotoCubicacion" (
    "id" TEXT NOT NULL,
    "cubicacionId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "fileData" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FotoCubicacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Maquinaria" (
    "id" TEXT NOT NULL,
    "obraId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "patente" TEXT,
    "horometro" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "proximaMantencion" DOUBLE PRECISION,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Maquinaria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Horometro" (
    "id" TEXT NOT NULL,
    "maquinariaId" TEXT NOT NULL,
    "horas" DOUBLE PRECISION NOT NULL,
    "tipo" TEXT NOT NULL,
    "descripcion" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Horometro_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FotoCubicacion_cubicacionId_idx" ON "FotoCubicacion"("cubicacionId");
CREATE INDEX "Maquinaria_obraId_idx" ON "Maquinaria"("obraId");
CREATE INDEX "Horometro_maquinariaId_fecha_idx" ON "Horometro"("maquinariaId", "fecha");

-- AddForeignKey
ALTER TABLE "FotoCubicacion" ADD CONSTRAINT "FotoCubicacion_cubicacionId_fkey" FOREIGN KEY ("cubicacionId") REFERENCES "Cubicacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Maquinaria" ADD CONSTRAINT "Maquinaria_obraId_fkey" FOREIGN KEY ("obraId") REFERENCES "Obra"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Horometro" ADD CONSTRAINT "Horometro_maquinariaId_fkey" FOREIGN KEY ("maquinariaId") REFERENCES "Maquinaria"("id") ON DELETE CASCADE ON UPDATE CASCADE;
