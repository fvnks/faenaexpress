// Repone la contraseña de un usuario existente: rescate manual mientras no haya
// recuperación por correo (ver PLAN-SAAS.md, fase 2b).
//
// Uso:  pnpm exec tsx scripts/reset-password.ts [correo]
//       Por defecto usa ADMIN_EMAIL; la contraseña sale de ADMIN_PASSWORD del `.env` (con
//       `import "dotenv/config"`, igual que el seed). La clave nunca queda en el código.
import "dotenv/config";
import { hash } from "bcryptjs";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  const email = process.argv[2] ?? process.env.ADMIN_EMAIL ?? "admin@facturas.local";
  const password = process.env.ADMIN_PASSWORD;

  if (!connectionString) throw new Error("Falta DATABASE_URL en el entorno.");
  if (!password) throw new Error("Falta ADMIN_PASSWORD en el entorno (.env).");

  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

  try {
    const user = await db.user.update({
      where: { email },
      data: { passwordHash: await hash(password, 12) },
    });
    console.log(`Contraseña repuesta para ${user.email}.`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(`✖ ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
