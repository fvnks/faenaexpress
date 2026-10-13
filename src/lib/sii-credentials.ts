import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

import { db } from "@/lib/db";

/**
 * Credenciales del SII guardadas por empresa para el login automático.
 *
 * La Clave Tributaria NUNCA se almacena en claro: se cifra con AES-256-GCM
 * usando una llave derivada (SHA-256) de `SII_SECRET_KEY`. El payload guardado
 * tiene forma `v1.<iv>.<tag>.<ciphertext>` en base64url.
 *
 * Si `SII_SECRET_KEY` cambia, los payload existentes dejan de poder descifrarse
 * y hay que volver a guardar las credenciales.
 */

const ALGORITHM = "aes-256-gcm";
const VERSION = "v1";
const IV_BYTES = 12; // longitud fija que exige GCM

export type StoredSiiCredentials = { rut: string; clave: string };

export function siiSecretKeyConfigured(): boolean {
  return Boolean(process.env.SII_SECRET_KEY);
}

function secretKey(): Buffer {
  const secret = process.env.SII_SECRET_KEY;
  if (!secret) {
    throw new Error(
      "Falta SII_SECRET_KEY en el entorno. Define una clave para cifrar las credenciales del SII.",
    );
  }
  // Se deriva con SHA-256 para aceptar llaves de cualquier largo.
  return createHash("sha256").update(secret).digest();
}

export function encryptSiiClave(plain: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, secretKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    VERSION,
    iv.toString("base64url"),
    tag.toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".");
}

export function decryptSiiClave(payload: string): string {
  const [version, ivB64, tagB64, dataB64] = payload.split(".");
  if (version !== VERSION || !ivB64 || !tagB64 || !dataB64) {
    throw new Error("Credencial del SII con formato inválido.");
  }
  const decipher = createDecipheriv(ALGORITHM, secretKey(), Buffer.from(ivB64, "base64url"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

/** Devuelve las credenciales descifradas, o `null` si la empresa no tiene guardadas. */
export async function getStoredSiiCredentials(
  companyId: string,
): Promise<StoredSiiCredentials | null> {
  const company = await db.company.findUnique({
    where: { id: companyId },
    select: { siiRut: true, siiClaveEnc: true },
  });
  if (!company?.siiRut || !company.siiClaveEnc) return null;
  return { rut: company.siiRut, clave: decryptSiiClave(company.siiClaveEnc) };
}

/** true si la empresa tiene credenciales guardadas (sin descifrar nada). */
export async function hasStoredSiiCredentials(companyId: string): Promise<boolean> {
  const company = await db.company.findUnique({
    where: { id: companyId },
    select: { siiRut: true, siiClaveEnc: true },
  });
  return Boolean(company?.siiRut && company.siiClaveEnc);
}
