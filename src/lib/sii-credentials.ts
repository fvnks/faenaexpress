import { decryptSecret, encryptSecret, secretsKeyConfigured } from "@/lib/secrets";
import { db } from "@/lib/db";

/**
 * Credenciales del SII guardadas por empresa para el login automático.
 *
 * La Clave Tributaria se cifra con la llave de secretos de la app (ver
 * `src/lib/secrets.ts`); nunca se guarda en claro.
 */

export type StoredSiiCredentials = { rut: string; clave: string };

export function siiSecretKeyConfigured(): boolean {
  return secretsKeyConfigured();
}

export function encryptSiiClave(plain: string): string {
  return encryptSecret(plain);
}

export function decryptSiiClave(payload: string): string {
  return decryptSecret(payload);
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
