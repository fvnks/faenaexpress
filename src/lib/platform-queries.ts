// Consultas de la consola de operador (Nivel 2). Aquí sí se mira ACROSS todas las
// organizaciones y empresas: es exactamente lo que el aislamiento por fila impide
// en el resto de la app, y por eso todo pasa por `requirePlatformStaff` antes.
//
// Este archivo devuelve datos para pantallas; la autorización la hace quien lo
// llama (cada página de /admin), no el helper.

import { db } from "@/lib/db";

/** Resumen del tablero: cuántas cuentas, empresas y usuarios hay. */
export async function platformOverview() {
  const [organizations, companies, users, staff] = await Promise.all([
    db.organization.count(),
    db.company.count(),
    db.user.count({ where: { active: true } }),
    db.platformStaff.count({ where: { active: true } }),
  ]);
  return { organizations, companies, users, staff };
}

/** Organizaciones con sus conteos, para el listado con buscador. */
export async function listOrganizations(query?: string) {
  const q = query?.trim();
  const orgs = await db.organization.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { slug: { contains: q, mode: "insensitive" } },
            { companies: { some: { rut: { contains: q, mode: "insensitive" } } } },
            { companies: { some: { name: { contains: q, mode: "insensitive" } } } },
          ],
        }
      : undefined,
    orderBy: { createdAt: "asc" },
    include: {
      _count: { select: { companies: true, members: true } },
      companies: { select: { id: true, name: true, rut: true }, orderBy: { createdAt: "asc" } },
    },
  });

  // Última actividad de cada organización: la venta o compra más reciente de sus
  // empresas. Es la señal útil de «¿está usando el sistema?».
  const orgIds = orgs.map((o) => o.id);
  const allCompanies = orgIds.length
    ? await db.company.findMany({
        where: { organizationId: { in: orgIds } },
        select: { id: true, organizationId: true },
      })
    : [];
  const companyToOrg = new Map(allCompanies.map((c) => [c.id, c.organizationId as string]));

  const lastSaleByCompany = new Map<string, Date>();
  if (allCompanies.length) {
    const sales = await db.sale.groupBy({
      by: ["companyId"],
      where: { companyId: { in: allCompanies.map((c) => c.id) } },
      _max: { createdAt: true },
    });
    for (const s of sales) {
      if (s._max.createdAt) lastSaleByCompany.set(s.companyId, s._max.createdAt);
    }
  }

  const lastByOrg = new Map<string, Date>();
  for (const [companyId, date] of lastSaleByCompany) {
    const orgId = companyToOrg.get(companyId);
    if (!orgId) continue;
    const current = lastByOrg.get(orgId);
    if (!current || date > current) lastByOrg.set(orgId, date);
  }

  const membersByOrg = orgIds.length
    ? await db.orgMember.groupBy({
        by: ["organizationId"],
        where: { organizationId: { in: orgIds }, active: true },
        _count: { _all: true },
      })
    : [];
  const activeMembers = new Map(membersByOrg.map((m) => [m.organizationId, m._count._all]));

  return orgs.map((org) => ({
    ...org,
    activeMembers: activeMembers.get(org.id) ?? 0,
    lastActivity: lastByOrg.get(org.id) ?? null,
  }));
}

/** Ficha completa de una organización para la consola. */
export async function organizationDetail(organizationId: string) {
  const organization = await db.organization.findUnique({
    where: { id: organizationId },
    include: {
      companies: {
        orderBy: { createdAt: "asc" },
        include: { _count: { select: { memberships: true, sales: true, purchases: true } } },
      },
      members: {
        include: { user: { select: { id: true, name: true, email: true, active: true } } },
        orderBy: [{ active: "desc" }, { orgRole: "asc" }, { createdAt: "asc" }],
      },
    },
  });
  if (!organization) return null;

  const companyIds = organization.companies.map((c) => c.id);
  const memberships = companyIds.length
    ? await db.membership.findMany({
        where: { companyId: { in: companyIds }, active: true },
        include: {
          user: { select: { id: true, name: true, email: true } },
          company: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "asc" },
      })
    : [];

  return { organization, memberships };
}

/** Búsqueda global de usuarios (soporte: «no me llega el correo»). */
export async function searchUsers(query?: string) {
  const q = query?.trim();
  return db.user.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      memberships: {
        include: { company: { select: { id: true, name: true, organizationId: true } } },
      },
      orgMembers: { include: { organization: { select: { id: true, name: true } } } },
      platformStaff: { select: { level: true, active: true } },
    },
  });
}

/**
 * Incidencias: lo que el operador necesita ver sin entrar al chat. Hoy son
 * señales objetivas del estado de las cuentas (no hay sistema de tickets): un
 * usuario que quedó a medias, una organización sin dueño, una empresa sin
 * administrador, un sync bancario fallido.
 */
export async function platformIncidents() {
  const [
    orgsWithoutOwner,
    companiesWithoutAdmin,
    pendingPasswordChange,
    failedBankSyncs,
    suspendedStaff,
  ] = await Promise.all([
    db.organization.findMany({
      where: { members: { none: { orgRole: "OWNER", active: true } } },
      select: { id: true, name: true },
      orderBy: { createdAt: "asc" },
    }),
    db.company.findMany({
      where: {
        memberships: { none: { role: "ADMIN", active: true } },
      },
      select: { id: true, name: true, organizationId: true },
      orderBy: { createdAt: "asc" },
    }),
    db.user.count({ where: { mustChangePassword: true, active: true } }),
    db.bankSync.findMany({
      where: { status: "error" },
      orderBy: { startedAt: "desc" },
      take: 10,
      include: { company: { select: { id: true, name: true, organizationId: true } } },
    }),
    db.platformStaff.findMany({
      where: { active: false },
      include: { user: { select: { name: true, email: true } } },
    }),
  ]);

  return {
    orgsWithoutOwner,
    companiesWithoutAdmin,
    pendingPasswordChange,
    failedBankSyncs,
    suspendedStaff,
  };
}

/** Personal de plataforma, para la pantalla Equipo (solo OWNER). */
export async function listPlatformStaff() {
  return db.platformStaff.findMany({
    orderBy: [{ active: "desc" }, { createdAt: "asc" }],
    include: { user: { select: { id: true, name: true, email: true } } },
  });
}

export async function listPlatformAuditRecent(limit = 30) {
  return db.platformAudit.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
