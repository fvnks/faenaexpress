// Acceso al módulo Colegios: qué colegio está abierto y con qué rol.
//
// Es paralelo a `src/lib/auth.ts` (que es de empresas). El aislamiento aquí es
// por COLEGIO (establecimiento), no por empresa: un docente ve lo de su colegio
// y nada más.
//
// La cookie del colegio es aparte de la de la empresa: son dos módulos
// distintos y el usuario puede estar en los dos a la vez (un colegio con una
// empresa de congratulate).

import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import type { School, SchoolRole } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { canAccessSchool, canWriteSchool, type SchoolSection } from "@/lib/school-permissions";
import { getCurrentUser, type SessionUser } from "@/lib/auth";

export const SCHOOL_COOKIE = "colegios_school";

export type SchoolContext = {
  user: SessionUser;
  school: School;
  role: SchoolRole;
};

/** Colegios a los que el usuario tiene acceso activo. */
export async function visibleSchools(user: SessionUser): Promise<School[]> {
  const memberships = await db.schoolMembership.findMany({
    where: { userId: user.id, active: true },
    include: { school: true },
    orderBy: { createdAt: "asc" },
  });
  return memberships.map((m) => m.school);
}

/** El colegio abierto: el de la cookie si sigue siendo visible; si no, el primero. */
export async function resolveActiveSchool(user: SessionUser): Promise<SchoolContext | null> {
  const schools = await visibleSchools(user);
  if (schools.length === 0) return null;

  const cookieStore = await cookies();
  const preferida = cookieStore.get(SCHOOL_COOKIE)?.value;
  const school = schools.find((s) => s.id === preferida) ?? schools[0];

  const membership = await db.schoolMembership.findFirst({
    where: { userId: user.id, schoolId: school.id, active: true },
    select: { role: true },
  });
  if (!membership) return null;

  return { user, school, role: membership.role };
}

export const getActiveSchool = cache(async () => {
  const user = await getCurrentUser();
  if (!user) return null;
  return resolveActiveSchool(user);
});

/**
 * Contexto de trabajo en el colegio. Exige sesión y colegio abierto; y si se
 * pide una sección, que el rol del usuario entre a ella.
 *
 * Sin colegio no hay nada que mostrar. El personal de plataforma va a la
 * consola a crear uno (es el único que puede); un usuario normal, al selector.
 */
export async function requireSchoolContext(section?: SchoolSection): Promise<SchoolContext> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const ctx = await resolveActiveSchool(user);
  if (!ctx) {
    const { hasPlatformLevel } = await import("@/lib/platform");
    redirect((await hasPlatformLevel(user.id, "SUPPORT")) ? "/admin/colegios" : "/modulos");
  }

  if (section && !canAccessSchool(ctx.role, section)) {
    redirect("/colegios");
  }
  return ctx;
}

export function schoolCanWrite(ctx: SchoolContext, section: SchoolSection): boolean {
  return canWriteSchool(ctx.role, section);
}
