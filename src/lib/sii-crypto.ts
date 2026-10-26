// Encriptación del certificado SII (.pfx) para almacenamiento seguro.
// Usa AES-256-GCM con la llave SII_SECRET_KEY (32 bytes base64).
//
// La llave SII_SECRET_KEY debe ser una cadena base64 de 32 bytes (256 bits).
// Se deriva con PBKDF2 (100k iteraciones) si no tiene 32 bytes exactos.

import { createCipheriv, createDecipheriv, randomBytes, createHash, pbkdf2Sync } from "node:crypto";

const ALGO = "aes-256-gcm";
const IV_LEN = 12; // GCM recomienda 12 bytes
const SALT_LEN = 16;
const ITERATIONS = 100_000;
const KEY_LEN = 32; // 256 bits

function getMasterKey(): Buffer {
  const raw = process.env.SII_SECRET_KEY;
  if (!raw) throw new Error("Falta SII_SECRET_KEY en variables de entorno.");
  // SII_SECRET_KEY puede venir en base64 (32 bytes = 44 chars) o como string.
  // Si es base64 válida de 32 bytes, la usamos directo; si no, derivamos con PBKDF2.
  try {
    const decoded = Buffer.from(raw, "base64");
    if (decoded.length === KEY_LEN) return decoded;
  } catch {
    // no es base64 válida de 32 bytes, caemos a derivación
  }
  const salt = createHash("sha256").update("sii-master-salt").digest().subarray(0, SALT_LEN);
  return pbkdf2Sync(raw, salt, ITERATIONS, KEY_LEN, "sha256");
}

export function encryptForStorage(plaintext: string | Buffer): string {
  const key = getMasterKey();
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key, iv);
  const data = Buffer.isBuffer(plaintext) ? plaintext : Buffer.from(plaintext, "utf8");
  const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
  const authTag = cipher.getAuthTag();
  // Formato: salt(16) + iv(12) + authTag(16) + ciphertext
  // Usamos un salt fijo derivado de la master key para que sea determinístico
  const salt = createHash("sha256").update("sii-storage-salt").digest().subarray(0, SALT_LEN);
  return Buffer.concat([salt, iv, authTag, encrypted]).toString("base64");
}

export function decryptFromStorage(base64: string): string {
  const key = getMasterKey();
  const buf = Buffer.from(base64, "base64");
  if (buf.length < SALT_LEN + IV_LEN + 16) throw new Error("Datos encriptados corruptos: muy cortos.");
  const salt = buf.subarray(0, SALT_LEN);
  const iv = buf.subarray(SALT_LEN, SALT_LEN + IV_LEN);
  const authTag = buf.subarray(SALT_LEN + IV_LEN, SALT_LEN + IV_LEN + 16);
  const encrypted = buf.subarray(SALT_LEN + IV_LEN + 16);
  // Verificamos que el salt coincida con el esperado
  const expectedSalt = createHash("sha256").update("sii-storage-salt").digest().subarray(0, SALT_LEN);
  if (!salt.equals(expectedSalt)) throw new Error("Salt de almacenamiento no coincide: posible corrupción o clave distinta.");
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString("utf8");
}

/** Encripta un Buffer (ej. .pfx binario) y lo guarda como base64. */
export function encryptBuffer(buf: Buffer): string {
  return encryptForStorage(buf);
}

/** Desencripta y devuelve Buffer (para pasar al PortalDriver). */
export function decryptToBuffer(base64: string): Buffer {
  const key = getMasterKey();
  const buf = Buffer.from(base64, "base64");
  if (buf.length < SALT_LEN + IV_LEN + 16) throw new Error("Datos encriptados corruptos: muy cortos.");
  const salt = buf.subarray(0, SALT_LEN);
  const iv = buf.subarray(SALT_LEN, SALT_LEN + IV_LEN);
  const authTag = buf.subarray(SALT_LEN + IV_LEN, SALT_LEN + IV_LEN + 16);
  const encrypted = buf.subarray(SALT_LEN + IV_LEN + 16);
  const expectedSalt = createHash("sha256").update("sii-storage-salt").digest().subarray(0, SALT_LEN);
  if (!salt.equals(expectedSalt)) throw new Error("Salt de almacenamiento no coincide.");
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(buf.subarray(SALT_LEN + IV_LEN, SALT_LEN + IV_LEN + 16));
  return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}