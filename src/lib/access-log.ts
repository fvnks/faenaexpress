// Registro de accesos: quién entró a la cuenta, desde dónde y cuándo.
//
// Es la respuesta a «¿quién entró a mi cuenta?». La información se guarda
// una vez por entrada (no por cada petición): el proxy y los layouts se
// ejecutan en cada request y no deben escribir en la base.

import { headers } from "next/headers";

import { db } from "@/lib/db";

export type AccessKind =
  | "login"
  | "logout"
  | "2fa"
  | "failed"
  // El portal del apoderado: no es una sesión de empleado, pero también
  // tiene que quedar registro de quién entró y desde dónde.
  | "portal_login"
  | "portal_failed";

/**-IP y agente del cliente, para saber desde dónde se entró. */
export async function requestContext(): Promise<{ ip: string | null; userAgent: string | null }> {
  const h = await headers();
  return {
    ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? null,
    userAgent: h.get("user-agent")?.slice(0, 300) ?? null,
  };
}

/** Anota un acceso. Nunca debe tumbar la operación que lo registra. */
export async function recordAccess(params: {
  userId?: string | null;
  userEmail: string;
  organizationId?: string | null;
  kind?: AccessKind;
  ip?: string | null;
  userAgent?: string | null;
}): Promise<void> {
  try {
    await db.accessLog.create({
      data: {
        userId: params.userId ?? null,
        userEmail: params.userEmail,
        organizationId: params.organizationId ?? null,
        kind: params.kind ?? "login",
        ip: params.ip ?? null,
        userAgent: params.userAgent ?? null,
      },
    });
  } catch {
    // El registro es secundario: si falla, el acceso ya ocurrió.
  }
}

/** Accesos de una organización (lo que ve el dueño de la cuenta). */
export async function listOrganizationAccess(organizationId: string, limit = 30) {
  return db.accessLog.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      userEmail: true,
      kind: true,
      ip: true,
      userAgent: true,
      createdAt: true,
    },
  });
}
