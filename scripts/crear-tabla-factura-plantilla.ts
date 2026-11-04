import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL ?? "",
});
const db = new PrismaClient({ adapter });

async function main() {
  // Crear la tabla FacturaPlantilla directamente con SQL
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "FacturaPlantilla" (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
      "companyId" TEXT NOT NULL UNIQUE,
      nombre TEXT NOT NULL DEFAULT 'Mi plantilla de factura',
      "esPredeterminada" BOOLEAN NOT NULL DEFAULT false,
      "esActiva" BOOLEAN NOT NULL DEFAULT true,
      "configuracion" JSON NOT NULL DEFAULT '{}',
      "creadoEn" TIMESTAMP NOT NULL DEFAULT NOW(),
      "actualizadoEn" TIMESTAMP NOT NULL DEFAULT NOW(),
      CONSTRAINT "FacturaPlantilla_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"(id) ON DELETE CASCADE
    );
  `);
  
  // Crear índices únicos
  await db.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "FacturaPlantilla_companyId_nombre_key" 
    ON "FacturaPlantilla"("companyId", "nombre");
  `);
  
  await db.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "FacturaPlantilla_companyId_idx" 
    ON "FacturaPlantilla"("companyId");
  `);
  
  await db.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "FacturaPlantilla_companyId_esPredeterminada_idx" 
    ON "FacturaPlantilla"("companyId", "esPredeterminada");
  `);
  
  console.log("✅ Tabla FacturaPlantilla creada exitosamente");
  
  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
