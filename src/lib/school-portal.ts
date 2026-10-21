// El acceso del apoderado al portal.
//
// El apoderado no es personal del colegio: no tiene membresía de empresa ni de
// colegio. Entra con un código que el colegio le entrega en persona y que puede
// rotar cuando quiere. El código es de la familia: con él se ven todos los
// hijos de ese apoderado.
//
// La sesión del portal es aparte de la del empleado (como la cookie del colegio
// es aparte de la de la empresa) y tiene su propia caducidad.

import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";

import { db } from "@/lib/db";

export const PORTAL_COOKIE = "facturas_apoderado";

/** Cuánto dura la sesión del portal. */
const TTL_MS = 1000 * 60 * 60 * 12; // 12 horas

// Sin las letras que se confunden (O/0, I/1, L) ni la S con el 5: el código
// se dicta por teléfono y se anota a mano.
const ALFABETO = "ACDEFGHJKMNPQRTUVWXYZ23456789";

/** Genera un código de acceso: ocho caracteres en dos grupos de cuatro. */
export function generarCodigoAcceso(): string {
  const bytes = randomBytes(8);
  let codigo = "";
  for (let i = 0; i < 8; i++) {
    codigo += ALFABETO[bytes[i] % ALFABETO.length];
    if (i === 3) codigo += "-";
  }
  return codigo;
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Normaliza lo que la familia escribe: sin espacios, en mayúsculas. */
export function normalizarCodigo(valor: string): string {
  return valor
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .replace(/(.{4})(?=.)/g, "$1-");
}

/**
 * Crea la sesión del portal para un apoderado y deja la cookie.
 *
 * La cookie dura lo mismo que la sesión (12 horas): la familia no tiene que
 * entrar todos los días, pero si el computador queda abierto en un lugar
 * público, al otro día tiene que entrar de nuevo.
 */
export async function crearSesionPortal(guardianId: string): Promise<void> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + TTL_MS);

  await db.guardianSession.create({
    data: {
      tokenHash: hashToken(token),
      guardianId,
      expiresAt,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(PORTAL_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

/** Cierra la sesión del portal. */
export async function cerrarSesionPortal(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(PORTAL_COOKIE)?.value;
  if (token) {
    await db.guardianSession.deleteMany({ where: { tokenHash: hashToken(token) } });
  }
  cookieStore.delete(PORTAL_COOKIE);
}

/** El apoderado de la sesión abierta, o null. */
export async function apoderadoActual() {
  const cookieStore = await cookies();
  const token = cookieStore.get(PORTAL_COOKIE)?.value;
  if (!token) return null;

  const sesion = await db.guardianSession.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { guardian: true },
  });
  if (!sesion) return null;

  if (sesion.expiresAt.getTime() < Date.now()) {
    await db.guardianSession.delete({ where: { id: sesion.id } });
    return null;
  }

  return sesion;
}
