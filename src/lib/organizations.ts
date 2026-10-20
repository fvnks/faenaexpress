// Helpers de la capa de organización (Nivel 1 del panel de administración).
//
// La organización es quien agrupa empresas y decide quién puede revisarlas. El rol
// de organización (`OrgRole`) es independiente del rol por empresa (`Membership`):
// OWNER y ADMIN administran la cuenta; MEMBER solo pertenece.

import { db } from "@/lib/db";

/**
 * Garantiza que la organización tenga al menos un OWNER activo.
 *
 * Los datos existentes (invitaciones e instalaciones previas) crearon a todos los
 * miembros como `MEMBER`, así que una organización puede quedar sin dueño y sin
 * nadie que pueda otorgar permisos. Esta función repara ese estado de forma
 * idempotente, promoviendo al miembro activo más antiguo que además sea ADMIN de
 * alguna empresa de la organización; si no hay ninguno así, al miembro activo más
 * antiguo.
 *
 * Devuelve el userId del OWNER resultante, o null si la organización no tiene
 * miembros activos.
 */
export async function ensureOrgOwner(organizationId: string): Promise<string | null> {
  const owner = await db.orgMember.findFirst({
    where: { organizationId, orgRole: "OWNER", active: true },
    select: { userId: true },
    orderBy: { createdAt: "asc" },
  });
  if (owner) return owner.userId;

  // Candidatos: miembros activos, del más antiguo al más nuevo.
  const activeMembers = await db.orgMember.findMany({
    where: { organizationId, active: true },
    select: { id: true, userId: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  if (activeMembers.length === 0) return null;

  // Primero, quien sea ADMIN en alguna empresa de la organización.
  const companies = await db.company.findMany({
    where: { organizationId },
    select: { id: true },
  });
  const companyIds = companies.map((c) => c.id);

  let chosen = activeMembers[0];
  if (companyIds.length > 0) {
    const adminMemberships = await db.membership.findMany({
      where: {
        companyId: { in: companyIds },
        role: "ADMIN",
        active: true,
        userId: { in: activeMembers.map((m) => m.userId) },
      },
      select: { userId: true },
    });
    const adminUserIds = new Set(adminMemberships.map((m) => m.userId));
    const firstAdmin = activeMembers.find((m) => adminUserIds.has(m.userId));
    if (firstAdmin) chosen = firstAdmin;
  }

  await db.orgMember.update({
    where: { id: chosen.id },
    data: { orgRole: "OWNER" },
  });
  return chosen.userId;
}

/** Miembros de la organización con su usuario, ordenados por jerarquía. */
export async function listOrgMembers(organizationId: string) {
  return db.orgMember.findMany({
    where: { organizationId },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: [{ active: "desc" }, { canSwitchCompanies: "desc" }, { createdAt: "asc" }],
  });
}

/**
 * Regla de nombre de la cuenta: con UNA sola empresa, la organización se llama como
 * la empresa; con más de una, el dueño decide el nombre (no se toca aquí).
 *
 * Idempotente. Se ejecuta al abrir Organización para que el nombre siga a la
 * empresa mientras la cuenta sea de una sola empresa (por ejemplo, al eliminar
 * todas las demás).
 */
export async function syncOrgName(organizationId: string): Promise<void> {
  const companies = await db.company.findMany({
    where: { organizationId },
    select: { name: true },
    orderBy: { createdAt: "asc" },
  });
  if (companies.length !== 1) return;

  const organization = await db.organization.findUnique({
    where: { id: organizationId },
    select: { name: true },
  });
  if (!organization || organization.name === companies[0].name) return;

  await db.organization.update({
    where: { id: organizationId },
    data: { name: companies[0].name },
  });
}

