import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/**
 * Cifrado simétrico de los secretos que la app guarda en la base: la Clave
 * Tributaria del SII y la clave y el token de Defontana.
 *
 * Nunca se guardan en claro: van con AES-256-GCM usando una llave derivada
 * (SHA-256) de `SII_SECRET_KEY`, que es la llave de secretos de toda la
 * aplicación. El payload tiene forma `v1.<iv>.<tag>.<ciphertext>` en base64url.
 *
 * Si la llave cambia, los payload existentes dejan de poder descifrarse y hay
 * que volver a guardar los secretos.
 */

const ALGORITHM = "aes-256-gcm";
const VERSION = "v1";
const IV_BYTES = 12; // longitud fija que exige GCM

export function secretsKeyConfigured(): boolean {
  return Boolean(process.env.SII_SECRET_KEY);
}

function secretKey(): Buffer {
  const secret = process.env.SII_SECRET_KEY;
  if (!secret) {
    throw new Error(
      "Falta SII_SECRET_KEY en el entorno. Define una llave para cifrar los secretos guardados.",
    );
  }
  // Se deriva con SHA-256 para aceptar llaves de cualquier largo.
  return createHash("sha256").update(secret).digest();
}

export function encryptSecret(plain: string): string {
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

export function decryptSecret(payload: string): string {
  const [version, ivB64, tagB64, dataB64] = payload.split(".");
  if (version !== VERSION || !ivB64 || !tagB64 || !dataB64) {
    throw new Error("Secreto guardado con formato inválido.");
  }
  const decipher = createDecipheriv(ALGORITHM, secretKey(), Buffer.from(ivB64, "base64url"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}
