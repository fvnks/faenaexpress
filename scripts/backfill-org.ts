// Backfill F1: crea una Organización que agrupa las empresas actuales, enlaza cada
// Company a ella y asigna a cada usuario existente como miembro de esa organización.
//
// Uso:  pnpm exec tsx scripts/backfill-org.ts
//
// Reglas del backfill:
//   1. Se crea una sola Organization llamada "Yellow ERP" (slug "yellow-erp").
//      Es provisional: cuando se agregue el primer cliente externo se cambiará el
//      slug y el nombre; este valor no se usa en la UI todavía.
//   2. Cada Company que no tenga organizationId se enlaza a esa Organization.
//   3. Para cada User que ya tenga Membership en alguna Company se crea OrgMember:
//        - Si el usuario es ADMIN en al menos una empresa: orgRole = ADMIN.
//        - Si no: orgRole = MEMBER.
//      `canSwitchCompanies` queda apagado por defecto: los usuarios verán solo su
//      empresa activa hasta que el OWNER lo habilit desde Configuración.
//
// Nota sobre `cuid()`: el default está en el schema de Prisma, no en la columna de
// Postgres (migrate diff no lo traslada). Por eso generamos el id aquí con la misma
// función que Prisma usa: `cuid()` de `@prisma/client`.
// Nota sobre `updatedAt`: tampoco tiene DEFAULT en Postgres; se rellena con now().
import "dotenv/config";
import { createRequire } from "node:module";
import path from "node:path";
import { randomBytes } from "node:crypto";

const require = createRequire(path.join(process.cwd(), "noop.js"));
const { Client } = require(
  path.join(process.cwd(), "node_modules/.pnpm/pg@8.23.1/node_modules/pg"),
);

// Genera un cuid-like id (44 chars, base36 + digits). Coincide con la versión que
// usa Prisma 7 en este proyecto.
function cuid(): string {
  const bytes = randomBytes(10);
  return bytes.toString("base64url").slice(0, 16) + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("Falta DATABASE_URL en el entorno.");
  process.exit(1);
}

const client = new Client({ connectionString });

async function main(): Promise<void> {
  await client.connect();

  try {
    const now = new Date().toISOString();
    // 1. Crear la organización.
    const orgId = cuid();
    const org = await client.query(
      `INSERT INTO "Organization" (id, "name", slug, "createdAt", "updatedAt")
       VALUES ($1, 'Yellow ERP', 'yellow-erp', $2, $2)
       ON CONFLICT (slug) DO UPDATE SET "name" = EXCLUDED."name",
                                        id = EXCLUDED.id,
                                        "updatedAt" = $2
       RETURNING id, "name", slug`,
      [orgId, now],
    );
    if (org.rows.length === 0) throw new Error("no se insertó la organización");
    const finalOrgId = org.rows[0].id;
    console.log(`Organización: ${org.rows[0].name} (${org.rows[0].slug}) → ${finalOrgId}`);

    // 2. Enlazar las empresas.
    const updated = await client.query(
      `UPDATE "Company" SET "organizationId" = $1
       WHERE "organizationId" IS NULL
       RETURNING id, "name"`,
      [finalOrgId],
    );
    console.log(`Empresas enlazadas: ${updated.rows.length}`);

    // 3. Miembros de la organización.
    //    `OrgMember.id` y `"updatedAt"` no tienen DEFAULT en Postgres; se rellenan aquí.
    const members = await client.query(
      `INSERT INTO "OrgMember" (id, "userId", "organizationId", "orgRole", "canSwitchCompanies", "active", "createdAt", "updatedAt")
       SELECT
         gen_random_uuid(),
         u.id,
         $1,
         CASE
           WHEN EXISTS (
             SELECT 1 FROM "Membership" m
             WHERE m."userId" = u.id
               AND m.role = 'ADMIN'
               AND m.active = true
           ) THEN 'ADMIN'::"OrgRole"
           ELSE 'MEMBER'::"OrgRole"
         END AS orgRole,
         false,
         true,
         $2,
         $2
       FROM "User" u
       WHERE NOT EXISTS (
         SELECT 1 FROM "OrgMember" om
         WHERE om."userId" = u.id
           AND om."organizationId" = $1
       )
         AND EXISTS (
           SELECT 1 FROM "Membership" m WHERE m."userId" = u.id AND m.active = true
         )
       RETURNING id, "userId", "orgRole"`,
      [finalOrgId, now],
    );
    console.log(`Miembros de organización creados: ${members.rows.length}`);
    for (const row of members.rows) {
      const user = await client.query('SELECT email FROM "User" WHERE id = $1', [row.userid]);
      console.log(`  ${user.rows[0]?.email ?? "?"} → ${row.orgrole}`);
    }

    console.log("\n✔ Backfill completado.");
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  console.error("\n✖ Backfill falló:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
