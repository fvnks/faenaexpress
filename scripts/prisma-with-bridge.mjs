// Lanza un comando de la CLI de Prisma a través del puente TLS local.
//
// Uso: `node scripts/prisma-with-bridge.mjs migrate dev`
// Levanta el puente, ejecuta Prisma contra 127.0.0.1 (PRISMA_DATABASE_URL),
// y al terminar apaga el puente.
import "dotenv/config";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createBridge } from "./pg-tls-bridge.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PRISMA_BIN = path.join(ROOT, "node_modules", "prisma", "build", "index.js");

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("Falta DATABASE_URL en el entorno");
  process.exit(1);
}

const bridge = createBridge({
  connectionString,
  port: Number(process.env.PG_BRIDGE_PORT || 15433),
});

try {
  await bridge.listen();
} catch (error) {
  console.error("No se pudo iniciar el puente TLS:", error.message);
  process.exit(1);
}

const child = spawn(process.execPath, [PRISMA_BIN, ...process.argv.slice(2)], {
  stdio: "inherit",
  env: process.env,
});

let finished = false;
async function shutdown(code) {
  if (finished) return;
  finished = true;
  try {
    child.kill();
  } catch {}
  await bridge.close();
  process.exit(code ?? 0);
}

child.on("exit", (code) => shutdown(code ?? 0));
process.on("SIGINT", () => shutdown(130));
process.on("SIGTERM", () => shutdown(143));
