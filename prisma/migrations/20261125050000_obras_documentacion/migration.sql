-- CreateTable
CREATE TABLE "DocumentoObra" (
    "id" TEXT NOT NULL,
    "obraId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT,
    "responsableId" TEXT,
    "fechaVencimiento" TIMESTAMP(3),
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "fileName" TEXT,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "fileData" BYTEA,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DocumentoObra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeguimientoDocumento" (
    "id" TEXT NOT NULL,
    "documentoId" TEXT NOT NULL,
    "estado" TEXT NOT NULL,
    "nota" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT NOT NULL,
    CONSTRAINT "SeguimientoDocumento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DocumentoObra_obraId_estado_idx" ON "DocumentoObra"("obraId", "estado");
CREATE INDEX "DocumentoObra_obraId_fechaVencimiento_idx" ON "DocumentoObra"("obraId", "fechaVencimiento");
CREATE INDEX "SeguimientoDocumento_documentoId_fecha_idx" ON "SeguimientoDocumento"("documentoId", "fecha");

-- AddForeignKey
ALTER TABLE "DocumentoObra" ADD CONSTRAINT "DocumentoObra_obraId_fkey" FOREIGN KEY ("obraId") REFERENCES "Obra"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DocumentoObra" ADD CONSTRAINT "DocumentoObra_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DocumentoObra" ADD CONSTRAINT "DocumentoObra_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SeguimientoDocumento" ADD CONSTRAINT "SeguimientoDocumento_documentoId_fkey" FOREIGN KEY ("documentoId") REFERENCES "DocumentoObra"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SeguimientoDocumento" ADD CONSTRAINT "SeguimientoDocumento_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
