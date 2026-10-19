// Backfill de la capa de organización (Fase A / F1 del plan SaaS).
//
// Agrupa las empresas que todavía no tienen organización en organizaciones,
// siguiendo la regla elegida: **empresas que comparten al menos un ADMIN activo
// quedan en la misma organización** (componentes conexas de la relación
// «compartir administrador»).
//
// Para cada organización creada:
//   - nombre y slug derivados de la(s) empresa(s);
//   - un OrgMember por cada usuario con alguna membership activa en sus empresas;
//   - el ADMIN activo más antiguo queda OWNER; el resto, MEMBER;
//   - `canSwitchCompanies` = true si el usuario pertenece a más de una empresa de
//     la organización (mismo criterio que `visibleCompanies`);
//   - `Company.organizationId` apunta a la organización.
//
// Es idempotente: las empresas que ya tienen organización se omiten.
//
// Uso:
//   Local:  node --env-file=.env node_modules/.bin/tsx scripts/backfill-organizations.ts
//   Prod:   node --env-file=.env.prod node_modules/.bin/tsx scripts/backfill-organizations.ts
// Sin `--si` solo simula (dry-run).

import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";

const applied = process.argv.includes("--si");

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "" });
const db = new PrismaClient({ adapter });

function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "organizacion"
  );
}

async function uniqueSlug(base: string): Promise<string> {
  let slug = base;
  let n = 1;
  while (await db.organization.findUnique({ where: { slug } })) {
    n += 1;
    slug = `${base}-${n}`;
  }
  return slug;
}

async function main() {
  const orphanCompanies = await db.company.findMany({
    where: { organizationId: null },
    orderBy: { createdAt: "asc" },
    include: {
      memberships: { where: { active: true }, select: { userId: true, role: true } },
    },
  });

  if (orphanCompanies.length === 0) {
    console.log("No hay empresas sin organización. Nada que hacer.");
    return;
  }

  // Unión-búsqueda por «compartir un ADMIN activo».
  const parent = new Map<string, string>();
  const find = (id: string): string => {
    let current = id;
    while (parent.get(current) !== current) {
      parent.set(current, parent.get(parent.get(current)!)!);
      current = parent.get(current)!;
    }
    return current;
  };
  const union = (a: string, b: string) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  };

  for (const company of orphanCompanies) parent.set(company.id, company.id);

  const companiesByAdmin = new Map<string, string[]>();
  for (const company of orphanCompanies) {
    for (const membership of company.memberships) {
      if (membership.role !== "ADMIN") continue;
      const list = companiesByAdmin.get(membership.userId) ?? [];
      list.push(company.id);
      companiesByAdmin.set(membership.userId, list);
    }
  }
  for (const ids of companiesByAdmin.values()) {
    for (let i = 1; i < ids.length; i += 1) union(ids[0], ids[i]);
  }

  const groups = new Map<string, typeof orphanCompanies>();
  for (const company of orphanCompanies) {
    const root = find(company.id);
    const group = groups.get(root) ?? [];
    group.push(company);
    groups.set(root, group);
  }

  console.log(`Empresas sin organización: ${orphanCompanies.length}`);
  console.log(`Organizaciones a crear: ${groups.size}`);

  for (const companies of groups.values()) {
    const names = companies.map((c) => c.name);
    const name = names.length === 1 ? names[0] : `${names[0]} y ${names.length - 1} más`;
    console.log(`\n— Organización «${name}»`);
    for (const c of companies) console.log(`   · empresa: ${c.name} (${c.id})`);

    const companyIds = companies.map((c) => c.id);
    const memberships = await db.membership.findMany({
      where: { companyId: { in: companyIds }, active: true },
      orderBy: { createdAt: "asc" },
      select: { userId: true, role: true, companyId: true, createdAt: true },
    });

    const firstAdmin = memberships.find((m) => m.role === "ADMIN");
    const byUser = new Map<string, { companies: Set<string>; role: string }>();
    for (const m of memberships) {
      const entry = byUser.get(m.userId) ?? { companies: new Set<string>(), role: m.role };
      entry.companies.add(m.companyId);
      if (m.role === "ADMIN") entry.role = "ADMIN";
      byUser.set(m.userId, entry);
    }

    for (const [userId, entry] of byUser) {
      const user = await db.user.findUnique({ where: { id: userId }, select: { email: true, name: true } });
      const orgRole = userId === firstAdmin?.userId ? "OWNER" : "MEMBER";
      const canSwitch = entry.companies.size > 1;
      console.log(
        `   · ${user?.name} <${user?.email}> → ${orgRole}${canSwitch ? " (revisa todas las empresas)" : ""}`,
      );
    }

    if (!applied) continue;

    const slug = await uniqueSlug(slugify(name));
    const organization = await db.organization.create({ data: { name, slug } });

    await db.company.updateMany({
      where: { id: { in: companyIds } },
      data: { organizationId: organization.id },
    });

    for (const [userId, entry] of byUser) {
      await db.orgMember.create({
        data: {
          userId,
          organizationId: organization.id,
          orgRole: userId === firstAdmin?.userId ? "OWNER" : "MEMBER",
          canSwitchCompanies: entry.companies.size > 1,
        },
      });
    }

    console.log(`   ✓ creada (${organization.id}, slug ${slug})`);
  }

  console.log(
    applied ? "\nBackfill aplicado." : "\nSimulación: no se escribió nada. Agrega --si para aplicar.",
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
