// Acceso al módulo Obras: qué obra está abierta y con qué rol.
//
// Paralelo a `school-auth.ts` (que es de colegios) y a `auth.ts` (de empresas).
// El aislamiento aquí es por OBRA: un capataz ve solo las obras a las que
// pertenece. La cookie de obra es aparte de la de empresa y de la de colegio:
// son tres módulos distintos y el usuario puede estar en los tres a la vez.

import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import type { Obra, ObraRole } from "@/generated/prisma/client";
import { getCurrentUser, isSuperAdmin, type SessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { canAccessObra, canWriteObra, type ObraSection } from "@/lib/obra-permissions";

export const OBRA_COOKIE = "obras_obra";

export type ObraContext = {
  user: SessionUser;
  obra: Obra;
  role: ObraRole;
};

/** Obras a las que el usuario tiene acceso activo. */
export async function visibleObras(user: SessionUser): Promise<Obra[]> {
  if (isSuperAdmin(user) && user.orgMembership) {
    return db.obra.findMany({
      where: { organizationId: user.orgMembership.organizationId },
      orderBy: { name: "asc" },
    });
  }
  const memberships = await db.obraMembership.findMany({
    where: { userId: user.id, active: true },
    include: { obra: true },
    orderBy: { createdAt: "asc" },
  });
  return memberships.map((m) => m.obra);
}

/** La obra abierta: la de la cookie si sigue siendo visible; si no, la primera. */
export async function resolveActiveObra(user: SessionUser): Promise<ObraContext | null> {
  const obras = await visibleObras(user);
  if (obras.length === 0) return null;

  const cookieStore = await cookies();
  const preferida = cookieStore.get(OBRA_COOKIE)?.value;
  const obra = obras.find((o) => o.id === preferida) ?? obras[0];

  const membership = await db.obraMembership.findFirst({
    where: { userId: user.id, obraId: obra.id, active: true },
    select: { role: true },
  });
  if (!membership) {
    if (isSuperAdmin(user)) return { user, obra, role: "ADMIN_OBRA" };
    return null;
  }

  return { user, obra, role: isSuperAdmin(user) ? "ADMIN_OBRA" : membership.role };
}

export const getActiveObra = cache(async () => {
  const user = await getCurrentUser();
  if (!user) return null;
  return resolveActiveObra(user);
});

/**
 * Contexto de trabajo en la obra. Exige sesión y obra abierta; y si se pide una
 * sección, que el rol del usuario entre a ella.
 *
 * Sin obra no hay nada que mostrar: personal de plataforma va a la consola a
 * crear una; un usuario normal, al selector de módulos.
 */
export async function requireObraContext(section?: ObraSection): Promise<ObraContext> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const ctx = await resolveActiveObra(user);
  if (!ctx) {
    const { hasPlatformLevel } = await import("@/lib/platform");
    redirect((await hasPlatformLevel(user.id, "SUPPORT")) ? "/admin/obras" : "/modulos");
  }

  if (section && !canAccessObra(ctx.role, section)) {
    redirect("/obras");
  }
  return ctx;
}

export function obraCanWrite(ctx: ObraContext, section: ObraSection): boolean {
  return canWriteObra(ctx.role, section);
}
