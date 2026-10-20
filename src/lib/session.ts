import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";

import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/types";

const COOKIE_NAME = "facturas_session";
// Cookie de la sesión de impersonación (Fase B2). Es SEPARADA de la del
// operador: su sesión propia no se toca, así que salir de la impersonación es
// siempre un clic y nunca un "volver a mi cuenta" que se puede perder.
export const IMPERSONATION_COOKIE = "facturas_impersonacion";
const DAY_MS = 1000 * 60 * 60 * 24;
// Con "Recuérdame": cookie persistente y renovación automática mientras se use la app.
const PERSISTENT_TTL_MS = DAY_MS * 90;
// Sin "Recuérdame": la cookie muere al cerrar el navegador; margen de respaldo en BD.
const BROWSER_TTL_MS = DAY_MS * 7;
// Se renueva la sesión en BD cuando le queda menos de un mes de vida.
const RENEW_THRESHOLD_MS = DAY_MS * 30;
// Una sesión PENDIENTE (falta el segundo factor) vive poco: no puede hacer nada
// más que confirmar el 2FA, así que no tiene sentido que dure meses.
const PENDING_TTL_MS = 30 * 60_000;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// El token viaja al cliente; en la base solo se guarda su hash.
// Con remember la cookie es persistente (90 días, se renueva sola);
// sin remember es de sesión: desaparece al cerrar el navegador.
export async function createSession(
  userId: string,
  remember = false,
  options: { totpPending?: boolean } = {},
): Promise<void> {
  const ttl = options.totpPending
    ? Math.min(remember ? PERSISTENT_TTL_MS : BROWSER_TTL_MS, PENDING_TTL_MS)
    : remember
      ? PERSISTENT_TTL_MS
      : BROWSER_TTL_MS;
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + ttl);

  await db.session.create({
    data: {
      tokenHash: hashToken(token),
      userId,
      expiresAt,
      totpPending: options.totpPending ?? false,
    },
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
export async function getSessionUser(): Promise<SessionUser | null> {
  // La impersonación manda sobre la sesión propia: mientras dura, el operador
  // está actuando como el usuario del cliente.
  const impersonated = await getImpersonatedUser();
  if (impersonated) return impersonated;

  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const user = await resolveUserByToken(token);
  if (!user) return null;

  // Renovación automática: si la sesión se usa y está por vencer, se extiende.
  // Así, quien marcó "Recuérdame" y usa la app con regularidad no queda fuera.
  const remaining = user.sessionExpiresAt - Date.now();
  if (remaining < RENEW_THRESHOLD_MS) {
    const extended = new Date(Date.now() + PERSISTENT_TTL_MS);
    await db.session.update({
      where: { id: user.sessionId },
      data: { expiresAt: extended },
    });
  }

  return {
    ...user.user,
    totpPending: user.totpPending,
  };
}

/**
 * Sesión propia del navegador, sin impersonación. La usa la consola de
 * operador: el personal de plataforma no puede entrar a /adminacting con la
 * identidad de un cliente.
 */
export async function getRealSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const resolved = await resolveUserByToken(token);
  return resolved?.user ?? null;
}

// Resuelve el token a un usuario con sus membresías. `sessionExpiresAt` se
// devuelve aparte porque la renovación necesita el id de la sesión.
async function resolveUserByToken(token: string) {
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
          orgMembers: {
            where: { active: true },
            include: {
              organization: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
  });

  if (!session || session.expiresAt < new Date() || !session.user.active) {
    return null;
  }

  return {
    sessionId: session.id,
    sessionExpiresAt: session.expiresAt.getTime(),
    totpPending: session.totpPending,
    user: {
      ...session.user,
      orgMembership: session.user.orgMembers?.[0] ?? null,
    } as SessionUser,
  };
}

/**
 * Usuario de la sesión de impersonación, si hay una vigente. Si el tope de
 * tiempo ya pasó, la sesión se da por terminada: se borra y se limpia la
 * cookie, para que nadie siga dentro de la cuenta del cliente por un descuido.
 */
async function getImpersonatedUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(IMPERSONATION_COOKIE)?.value;
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
          orgMembers: {
            where: { active: true },
            include: {
              organization: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
  });

  const expired =
    !session ||
    session.expiresAt < new Date() ||
    !session.user.active ||
    (session.impersonatedUntil !== null && session.impersonatedUntil < new Date());

  if (expired || !session) {
    if (session) {
      await db.session.delete({ where: { id: session.id } }).catch(() => {});
    }
    // Borrar la cookie durante un render no está permitido (Next lo rechaza):
    // se intenta y, si falla, la cookie se queda. Da igual: la sesión ya no
    // existe, así que no habilita nada. En una acción o una ruta sí se borra.
    try {
      cookieStore.delete(IMPERSONATION_COOKIE);
    } catch {
      // Sin cookie de impersonación, esta función vuelve a null en cada
      // petición. Es un caso raro: solo cuando la sesión venció sola.
    }
    return null;
  }

  return {
    ...session.user,
    orgMembership: session.user.orgMembers?.[0] ?? null,
  } as SessionUser;
}
