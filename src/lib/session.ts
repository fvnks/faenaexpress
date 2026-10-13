import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";

import { db } from "@/lib/db";

const COOKIE_NAME = "facturas_session";
const DAY_MS = 1000 * 60 * 60 * 24;
// Con "Recuérdame": cookie persistente y renovación automática mientras se use la app.
const PERSISTENT_TTL_MS = DAY_MS * 90;
// Sin "Recuérdame": la cookie muere al cerrar el navegador; margen de respaldo en BD.
const BROWSER_TTL_MS = DAY_MS * 7;
// Se renueva la sesión en BD cuando le queda menos de un mes de vida.
const RENEW_THRESHOLD_MS = DAY_MS * 30;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// El token viaja al cliente; en la base solo se guarda su hash.
// Con remember la cookie es persistente (90 días, se renueva sola);
// sin remember es de sesión: desaparece al cerrar el navegador.
export async function createSession(userId: string, remember = false): Promise<void> {
  const ttl = remember ? PERSISTENT_TTL_MS : BROWSER_TTL_MS;
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + ttl);

  await db.session.create({
    data: { tokenHash: hashToken(token), userId, expiresAt },
  });

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    // Sin `expires` la cookie es de sesión del navegador.
    ...(remember ? { expires: expiresAt } : {}),
  });
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (token) {
    await db.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  }
  cookieStore.delete(COOKIE_NAME);
}

// Devuelve el usuario con sus membresías activas (empresa + rol).
export async function getSessionUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: {
      user: {
        include: {
          memberships: {
            where: { active: true },
            include: { company: true },
            orderBy: { createdAt: "asc" },
          },
        },
      },
    },
  });

  if (!session || session.expiresAt < new Date() || !session.user.active) {
    return null;
  }

  // Renovación automática: si la sesión se usa y está por vencer, se extiende.
  // Así, quien marcó "Recuérdame" y usa la app con regularidad no queda fuera.
  const remaining = session.expiresAt.getTime() - Date.now();
  if (remaining < RENEW_THRESHOLD_MS) {
    const extended = new Date(Date.now() + PERSISTENT_TTL_MS);
    await db.session.update({
      where: { id: session.id },
      data: { expiresAt: extended },
    });
  }

  return session.user;
}
