import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import type { Company, InventoryAccess, Role } from "@/generated/prisma/client";
import { canAccess, canWrite as roleCanWrite, effectiveInventoryAccess, type Section } from "@/lib/permissions";
import { getSessionUser } from "@/lib/session";
import { db } from "@/lib/db";
import type { AuthContext, SessionUser } from "@/lib/types";
export type { AuthContext, SessionUser };

// Cookie con la empresa activa elegida por el usuario.
export const COMPANY_COOKIE = "facturas_company";

// Deduplica la lectura de sesión dentro de una misma request.
export const getCurrentUser = cache(getSessionUser);

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

// Empresas que el usuario puede ver y a las que puede cambiar:
//   - Si tiene el permiso de organización (canSwitchCompanies): todas las empresas de
//     su organización.
//   - Si no: solo las memberships activas (el comportamiento actual).
export async function visibleCompanies(user: SessionUser): Promise<Company[]> {
  if (user.orgMembership?.canSwitchCompanies) {
    // Muestra TODAS las empresas de la organización, no solo las en las que hay
    // membership. El permiso de organización es lo que habilita el switch.
    const companies = await db.company.findMany({
      where: { organizationId: user.orgMembership.organizationId },
      orderBy: { createdAt: "asc" },
    });
    return companies;
  }
  return user.memberships.map((m) => m.company);
}

// Empresa activa: la del cookie si el usuario es miembro visible; si no, la primera.
export async function resolveActiveMembership(
  user: SessionUser,
): Promise<{ company: Company; role: Role; inventoryAccess: InventoryAccess } | null> {
  const companies = await visibleCompanies(user);
  if (companies.length === 0) return null;

  const cookieStore = await cookies();
  const preferred = cookieStore.get(COMPANY_COOKIE)?.value;
  const match = preferred
    ? companies.find((company) => company.id === preferred)
    : undefined;
  // Buscar el rol en las memberships del usuario (no en las companies, porque el
  // orden de companies puede diferir cuando canSwitchCompanies está activo).
  const membership = user.memberships.find(
    (m) => m.companyId === (match ?? companies[0]).id,
  );
  if (!membership) {
    // La cookie apunta a una empresa que ya no es visible; resetear a la primera.
    return {
      company: companies[0],
      role: "VIEWER",
      inventoryAccess: "NONE",
    };
  }

  return {
    company: membership.company,
    role: membership.role,
    inventoryAccess: membership.inventoryAccess ?? "NONE",
  };
}

export async function getActiveMembership() {
  const user = await getCurrentUser();
  if (!user) return null;
  return resolveActiveMembership(user);
}

// Contexto de trabajo: exige sesión y empresa activa.
// Si se pasa una sección, además exige que el rol tenga acceso a ella.
export async function requireContext(section?: Section): Promise<AuthContext> {
  const user = await requireUser();
  const active = await resolveActiveMembership(user);
  if (!active) {
    redirect("/facturas/configuracion");
  }
  if (section) {
    // Inventario usa el nivel efectivo (override o rol base) para entrar.
    const allowed =
      section === "inventario"
        ? canInventoryRead(active)
        : canAccess(active.role, section);
    if (!allowed) redirect("/facturas");
  }
  return { user, company: active.company, role: active.role, inventoryAccess: active.inventoryAccess };
}

export function canWrite(ctx: { role: Role; inventoryAccess?: InventoryAccess }, section: Section): boolean {
  if (section === "inventario") {
    return effectiveInventoryAccess(ctx.role, ctx.inventoryAccess) === "EDIT";
  }
  return roleCanWrite(ctx.role, section);
}

export function isAdmin(ctx: { role: Role }): boolean {
  return ctx.role === "ADMIN";
}

export function canInventoryRead(ctx: { role: Role; inventoryAccess?: InventoryAccess }): boolean {
  return effectiveInventoryAccess(ctx.role, ctx.inventoryAccess) !== "NONE";
}

export function canInventoryEdit(ctx: { role: Role; inventoryAccess?: InventoryAccess }): boolean {
  return effectiveInventoryAccess(ctx.role, ctx.inventoryAccess) === "EDIT";
}
