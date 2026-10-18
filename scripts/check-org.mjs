import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(path.join(process.cwd(), "noop.js"));
const { Client } = require(
  path.join(process.cwd(), "node_modules/.pnpm/pg@8.23.1/node_modules/pg"),
);

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  const orgs = await client.query('SELECT id, name, slug FROM "Organization"');
  console.log("orgs:", JSON.stringify(orgs.rows));
  const coms = await client.query('SELECT id, "name", "organizationId" FROM "Company"');
  console.log("comps:", JSON.stringify(coms.rows));
  const oms = await client.query(
    'SELECT om."userId", u.email, om."orgRole", om."canSwitchCompanies" FROM "OrgMember" om JOIN "User" u ON u.id = om."userId"',
  );
  console.log("members:", JSON.stringify(oms.rows));
} catch (err) {
  console.error("error:", err instanceof Error ? err.message : err);
} finally {
  await client.end();
}
