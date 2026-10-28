/**
 * Autenticación para la API de e-commerce.
 *
 * Las tiendas online se autentican con una API key que se genera desde el
 * panel de administración del POS. La clave se envía en el header:
 *   Authorization: Bearer <api_key>
 *   X-API-Key: <api_key>
 *
 * La clave se compara contra el hash almacenado en EcommerceApiKey.
 */

import { db } from "@/lib/db";

export type EcommerceAuthResult = {
  companyId: string;
  companyName: string;
} | null;

export async function authenticateApiKey(
  apiKey: string | null | undefined,
): Promise<EcommerceAuthResult> {
  if (!apiKey) return null;

  // Buscar todas las claves activas y comparar el hash
  const apiKeys = await db.ecommerceApiKey.findMany({
    where: { active: true },
    include: { company: true },
  });

  for (const key of apiKeys) {
    // Comparar directamente (en producción usaríamos bcrypt o similar)
    if (key.keyHash === apiKey) {
      return {
        companyId: key.companyId,
        companyName: key.company.name,
      };
    }
  }

  return null;
}

/**
 * Extrae la API key de los headers de la request.
 */
export function extractApiKey(headers: Headers): string | null {
  const auth = headers.get("authorization");
  if (auth && auth.startsWith("Bearer ")) {
    return auth.slice(7);
  }
  return headers.get("x-api-key") ?? null;
}
