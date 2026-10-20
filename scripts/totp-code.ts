// Genera el código TOTP actual de un usuario (para probar el 2FA).
// Uso: node --env-file=.env node_modules/tsx/dist/cli.mjs scripts/totp-code.ts <email>
import { decryptSecret } from "../src/lib/secrets";
import { totpCode } from "../src/lib/totp";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

async function main() {
  const email = process.argv[2] ?? "admin@facturas.local";
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "" });
  const db = new PrismaClient({ adapter });

  const user = await db.user.findUnique({
    where: { email },
    select: { name: true, email: true, totpSecretEnc: true, totpEnabled: true },
  });

  if (!user) {
    console.log("No existe ese usuario.");
  } else if (!user.totpSecretEnc) {
    console.log(`${user.email}: sin secreto (2FA no iniciado).`);
  } else {
    const secret = decryptSecret(user.totpSecretEnc);
    console.log(`${user.email} activo=${user.totpEnabled} codigo=${totpCode(secret)}`);
  }

  await db.$disconnect();
}

main();
