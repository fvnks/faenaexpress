// Impersonación («entrar como»): la herramienta más usada en soporte y la más
// fácil de abusar. Por eso vive aislada y con límites duros:
//
//   - Sesión SEPARADA de la del operador (su sesión propia no se toca).
//   - Tope duro de 30 minutos, sin excepción.
//   - Banner permanente mientras dura, con salida a un clic.
//   - Acciones destructivas prohibidas (borrar empresa, exportar datos, cambiar
//     contraseñas, ver RRHH).
//   - Apertura y cierre quedan en auditoría de plataforma, y el dueño de la
//     cuenta del cliente puede ver ese registro.
//
// No es un cambio de cookie silencioso: es una sesión nueva, con su propia
// cookie, y siempre visible.

import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";

import { db } from "@/lib/db";
import { IMPERSONATION_COOKIE } from "@/lib/session";

// Tope duro. No es configurable a voluntad: es el techo del permiso.
export const IMPERSONATION_MAX_MS = 30 * 60 * 1000;

export type ImpersonationContext = {
  sessionId: string;
  /** El operador que entró. */
  staff: { id: string; name: string; email: string };
  /** La cuenta del cliente. */
  organization: { id: string; name: string };
  /** El usuario del cliente que se está imitando. */
  target: { id: string; name: string; email: string };
  startedAt: Date;
  until: Date;
  reason: string | null;
};

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Devuelve la impersonación vigente, o null si no hay ninguna. */
export async function getImpersonationContext(): Promise<ImpersonationContext | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(IMPERSONATION_COOKIE)?.value;
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { tokenHash: hashToken(token) },
    select: {
      id: true,
      createdAt: true,
      impersonatedUntil: true,
      impersonationReason: true,
      impersonatedByStaffId: true,
      impersonatedOrganizationId: true,
      expiresAt: true,
      user: { select: { id: true, name: true, email: true, active: true } },
    },
  });

  if (
    !session ||
    !session.impersonatedByStaffId ||
    !session.impersonatedOrganizationId ||
    !session.impersonatedUntil
  ) {
    return null;
  }

  // Vencida (por la sesión o por el tope duro): se cierra sola.
  if (
    session.impersonatedUntil < new Date() ||
    session.expiresAt < new Date() ||
    !session.user.active
  ) {
    await db.session.delete({ where: { id: session.id } }).catch(() => {});
    // Borrar cookies durante un render no está permitido en Next: se intenta
    // y, si falla, se deja. La sesión ya no existe, así que no habilita nada.
    try {
      cookieStore.delete(IMPERSONATION_COOKIE);
    } catch {
      // La cookie se limpia sola cuando expira.
    }
    return null;
  }

  const [staff, organization] = await Promise.all([
    db.user.findUnique({
      where: { id: session.impersonatedByStaffId },
      select: { id: true, name: true, email: true },
    }),
    db.organization.findUnique({
      where: { id: session.impersonatedOrganizationId },
      select: { id: true, name: true },
    }),
  ]);
  if (!staff || !organization) return null;

  return {
    sessionId: session.id,
    staff,
    organization,
    target: session.user,
    startedAt: session.createdAt,
    until: session.impersonatedUntil,
    reason: session.impersonationReason,
  };
}

export async function isImpersonating(): Promise<boolean> {
  return (await getImpersonationContext()) !== null;
}

/**
 * Por qué una acción está bloqueada durante la impersonación, o null si se
 * puede hacer. Se usa en las Server Actions (devuelven el mensaje) y en las
 * páginas (redirigen).
 */
export async function impersonationBlock(what: string): Promise<string | null> {
  const imp = await getImpersonationContext();
  if (!imp) return null;
  return `No se puede ${what} mientras estás dentro de la cuenta de «${imp.organization.name}». Es una acción que requiere la sesión del cliente, no la de soporte.`;
}

/** Acciones que la impersonación prohíbe, para dejar el motivo en un solo lugar. */
export const IMPERSONATION_FORBIDDEN = {
  deleteCompany: "eliminar una empresa",
  exportData: "exportar los datos de la empresa",
  changePassword: "cambiar contraseñas",
  viewHr: "ver la información de RRHH",
} as const;

/** Crea la sesión de impersonación y deja la cookie. */
export async function createImpersonationSession(params: {
  staffUserId: string;
  organizationId: string;
  targetUserId: string;
  reason: string | null;
}): Promise<{ token: string; until: Date }> {
  const token = randomBytes(32).toString("base64url");
  const until = new Date(Date.now() + IMPERSONATION_MAX_MS);

  await db.session.create({
    data: {
      tokenHash: hashToken(token),
      userId: params.targetUserId,
      // La sesión de impersonación vive lo que dura el tope, ni un minuto más.
      expiresAt: until,
      impersonatedByStaffId: params.staffUserId,
      impersonatedOrganizationId: params.organizationId,
      impersonatedUntil: until,
      impersonationReason: params.reason,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(IMPERSONATION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: until,
  });

  return { token, until };
}

/** Cierra la impersonación: borra la sesión y la cookie. */
export async function deleteImpersonationSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(IMPERSONATION_COOKIE)?.value;
  if (token) {
    await db.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  }
  cookieStore.delete(IMPERSONATION_COOKIE);
}
