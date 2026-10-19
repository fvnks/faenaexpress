// Rotación de la llave de secretos (SII_SECRET_KEY).
//
// La llave cifra la Clave Tributaria del SII y la clave/token de Defontana de cada
// empresa. Si la llave queda comprometida (se pegó en un chat), hay que:
//   1. Re-encriptar todos los secretos guardados con una llave nueva (este script).
//   2. Actualizar SII_SECRET_KEY en el `.env` y en Coolify.
//   3. Reiniciar la app (dev o contenedor).
//
// Uso:
//   pnpm exec tsx scripts/rotate-secrets-key.ts                # genera llave nueva
//   pnpm exec tsx scripts/rotate-secrets-key.ts -- <hex-32>    # usa la llave indicada
//
// Corre contra la BD de DATABASE_URL. Para producción, correrlo con la URL de la
// 5432 ANTES de cambiar la variable en Coolify: si se cambia primero, los secretos
// guardados dejan de descifrarse.
import "dotenv/config";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;
const VERSION = "v1";

const oldKeyRaw = process.env.SII_SECRET_KEY;
if (!oldKeyRaw) {
  console.error("✖ Falta SII_SECRET_KEY en el entorno (es la llave VIEJA).");
  process.exit(1);
}

const newKeyArg = process.argv[2];
const newKeyRaw =
  newKeyArg && newKeyArg.length > 0 ? newKeyArg : randomBytes(32).toString("hex");

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("✖ Falta DATABASE_URL en el entorno.");
  process.exit(1);
}

const oldKey = createHash("sha256").update(oldKeyRaw).digest();
const newKey = createHash("sha256").update(newKeyRaw).digest();

function decryptWith(key: Buffer, payload: string): string {
  const [version, ivB64, tagB64, dataB64] = payload.split(".");
  if (version !== VERSION || !ivB64 || !tagB64 || !dataB64) {
    throw new Error("Secreto guardado con formato inválido.");
  }
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivB64, "base64url"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

function encryptWith(key: Buffer, plain: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    VERSION,
    iv.toString("base64url"),
    tag.toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".");
}

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main(): Promise<void> {
  const companies = await db.company.findMany({
    select: {
      id: true,
      name: true,
      siiClaveEnc: true,
      defontanaClaveEnc: true,
      defontanaTokenEnc: true,
    },
  });

  let rotados = 0;
  for (const c of companies) {
    const data: Record<string, string> = {};
    if (c.siiClaveEnc) {
      data.siiClaveEnc = encryptWith(newKey, decryptWith(oldKey, c.siiClaveEnc));
    }
    if (c.defontanaClaveEnc) {
      data.defontanaClaveEnc = encryptWith(newKey, decryptWith(oldKey, c.defontanaClaveEnc));
    }
    if (c.defontanaTokenEnc) {
      data.defontanaTokenEnc = encryptWith(newKey, decryptWith(oldKey, c.defontanaTokenEnc));
    }
    if (Object.keys(data).length > 0) {
      await db.company.update({ where: { id: c.id }, data });
      rotados += Object.keys(data).length;
      console.log(`  ${c.name}: ${Object.keys(data).join(", ")}`);
    }
  }

  console.log(`\nSecretos re-encriptados: ${rotados} en ${companies.length} empresas.`);

  // Actualizar el .env con la llave nueva (solo si es el archivo del entorno local).
  const envPath = path.join(process.cwd(), ".env");
  try {
    const env = readFileSync(envPath, "utf8");
    const updated = env.replace(
      /^SII_SECRET_KEY=.*$/m,
      `SII_SECRET_KEY="${newKeyRaw}"`,
    );
    if (updated !== env) {
      writeFileSync(envPath, updated);
      console.log(`✔ .env actualizado con la llave nueva (${envPath}).`);
      console.log("  Reinicia \`pnpm dev\` (o el contenedor) para que la app la tome.");
      console.log("  Recuerda actualizar SII_SECRET_KEY en Coolify con el mismo valor.");
    }
  } catch {
    console.log("⚠ No pude escribir el .env (¿no existe en este entorno?).");
    console.log("  Nueva llave — cópiala en tu entorno manualmente:");
    console.log(`  SII_SECRET_KEY="${newKeyRaw}"`);
  }
}

main()
  .catch((error: unknown) => {
    console.error("\n✖ Rotación falló:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
