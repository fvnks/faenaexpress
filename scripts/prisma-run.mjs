// Corre cualquier comando de la CLI de Prisma con la misma receta en Windows y en Linux.
//
// - Windows: pasa por el puente TLS local (`scripts/prisma-with-bridge.mjs`), porque el motor
//   de la CLI usa schannel (TLS ≤ 1.2) y no negocia con el certificado ECDSA de Coolify.
// - Linux (incluido el contenedor de Coolify): llama a la CLI directo, sin puente.
//
// Uso: node scripts/prisma-run.mjs migrate deploy
import "dotenv/config";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);

if (args.length === 0) {
  console.error("Uso: node scripts/prisma-run.mjs <comando de prisma> [opciones]");
  process.exit(1);
}

const [entry, entryArgs] =
  process.platform === "win32"
    ? [path.join(ROOT, "scripts", "prisma-with-bridge.mjs"), args]
    : [path.join(ROOT, "node_modules", "prisma", "build", "index.js"), args];

const child = spawn(process.execPath, [entry, ...entryArgs], {
  stdio: "inherit",
  env: process.env,
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 0);
});
