// Genera un EDE de prueba (json.zip) para validar contra edemineduc/etl
//
// Uso: pnpm tsx scripts/generate-test-ede.ts
// Salida: ./test-ede/json.zip

import { buildEdePayload } from "@/lib/school-ede";
import { db } from "@/lib/db";
import * as fs from "fs";
import * as path from "path";
import * as zlib from "zlib";

async function main() {
  // Busca un colegio con datos (el primero que tenga sesiones)
  const colegio = await db.school.findFirst({
    where: { sessions: { some: {} } },
    select: { id: true, name: true },
  });
  if (!colegio) throw new Error("No hay colegio con datos para probar");

  console.log(`Generando EDE para: ${colegio.name} (${colegio.id})`);

  const payload = await buildEdePayload(colegio.id);

  // Serializa igual que /colegios/libro/export (JSON compacto + gzip)
  const jsonString = JSON.stringify(payload);
  const buffer = Buffer.from(jsonString, "utf8");
  const gzipped = zlib.gzipSync(buffer);

  const outDir = path.join(process.cwd(), "test-ede");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "json.zip"), gzipped);

  console.log(`✅ EDE generado en ${outDir}/json.zip (${gzipped.length} bytes)`);
  console.log("Grupos:", Object.keys(payload).join(", "));

  // Cuenta filas por tabla para verificación rápida
  for (const [grupo, bloques] of Object.entries(payload)) {
    for (const [tabla, filas] of Object.entries(bloques[0])) {
      if (filas.length > 0) console.log(`  ${grupo}.${tabla}: ${filas.length} filas`);
    }
  }
}

main().catch((e) => {
  console.error("❌ Error:", e);
  process.exit(1);
});