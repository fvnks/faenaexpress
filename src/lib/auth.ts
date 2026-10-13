import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import type { Company, InventoryAccess, Membership, Role, User } from "@/generated/prisma/client";
import { canAccess, canWrite as roleCanWrite, effectiveInventoryAccess, type Section } from "@/lib/permissions";
import { getSessionUser } from "@/lib/session";

// Cookie con la empresa activa elegida por el usuario.
export const COMPANY_COOKIE = "facturas_company";

export type SessionUser = User & {
  memberships: (Membership & { company: Company })[];
};

export type AuthContext = {
  user: SessionUser;
  company: Company;
  role: Role;
  inventoryAccess?: InventoryAccess;
};

// Deduplica la lectura de sesión dentro de una misma request.
export const getCurrentUser = cache(getSessionUser);

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

// Empresa activa: la del cookie si el usuario es miembro; si no, la primera.
export async function resolveActiveMembership(
  user: SessionUser,
): Promise<{ company: Company; role: Role; inventoryAccess: InventoryAccess } | null> {
  if (user.memberships.length === 0) return null;

  const cookieStore = await cookies();
  const preferred = cookieStore.get(COMPANY_COOKIE)?.value;
  const match = preferred
    ? user.memberships.find((membership) => membership.companyId === preferred)
    : undefined;
  const membership = match ?? user.memberships[0];

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
    redirect("/dashboard/configuracion");
  }
  if (section) {
    // Inventario usa el nivel efectivo (override o rol base) para entrar.
    const allowed =
      section === "inventario"
        ? canInventoryRead(active)
        : canAccess(active.role, section);
    if (!allowed) redirect("/dashboard");
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
