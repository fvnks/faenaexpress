// Guardia de alcance de tenant (F1): escanea `src/lib` y `src/app` buscando
// llamadas a Prisma sobre modelos con `companyId` que no referencien el campo
// en la misma expresión. Marca las excepciones legítimas con un comentario
// `// tenant: org` (consultas sobre Company, Membership, Organization, OrgMember).
//
// Uso:  pnpm check:tenant
// Se engancha en CI para evitar regresiones silenciosas.
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "src");

// Modelos que tienen companyId y deben filtrar en cada query.
const TENANT_MODELS = new Set([
  "Purchase",
  "Sale",
  "Expense",
  "Partner",
  "Category",
  "Area",
  "Salesperson",
  "Payer",
  "Worker",
  "Absence",
  "WorkerDocument",
  "Remuneration",
  "PaymentMethodCatalog",
  "Unit",
  "ProductCategory",
  "Warehouse",
  "Product",
  "ProductStock",
  "StockMovement",
  "StockCount",
  "StockCountItem",
  "CommissionAssignment",
  "CommissionEntry",
  "CommissionClose",
  "DispatchGuide",
  "PayrollPeriod",
  "ProductLot",
  "BankAccount",
  "BankMovement",
  "BankSync",
  "Reconciliation",
]);

// Modelos legítimos para consultar SIN companyId (Scope de organización o audit).
const ORG_SCOPES = new Set(["Company", "Membership", "User", "Session", "Organization", "OrgMember"]);

// Expresiones que indican que el filtro está presente (case-insensitive).
const COMPANY_ID_MARKERS = [
  "companyId:",
  '"companyId"',
  "'companyId'",
  "company.id",
  'company["id"]',
  "company?.id",
];

function hasCompanyIdCall(expr) {
  return COMPANY_ID_MARKERS.some((m) => expr.includes(m));
}

async function scanDir(dir) {
  const entries = await readdir(dir, { recursive: true });
  return entries
    .filter((e) => e.endsWith(".ts") || e.endsWith(".tsx") || e.endsWith(".mjs"))
    .map((e) => path.join(dir, e));
}

let issues = 0;

for (const file of await scanDir(SRC)) {
  const content = await readFile(file, "utf8");
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Ignorar comentarios y líneas con la marca blanca.
    if (/\/\/\s*tenant:\s*org/i.test(line)) continue;
    if (!/db\.\w+\.(find|create|update|delete|count|aggregate|groupBy)/.test(line)) continue;

    // Buscar el modelo usado (ej: db.purchase.findMany(...)).
    const match = line.match(/db\.(\w+)\./);
    if (!match) continue;

    const modelName = match[1];
    if (!TENANT_MODELS.has(modelName) && !ORG_SCOPES.has(modelName)) continue;

    // Si es un modelo de organización, no revisamos (puede ser intencional).
    if (ORG_SCOPES.has(modelName)) continue;

    // Reunir las siguientes 5 líneas para ver si el filtro aparece ahí.
    const chunk = lines.slice(i, Math.min(i + 5, lines.length)).join("\n");
    if (hasCompanyIdCall(chunk)) continue;

    // Falta el filtro: registrar issue.
    issues += 1;
    const rel = path.relative(ROOT, file);
    console.error(`  ${rel}:${i + 1}  db.${modelName}.${match[0].replace("db.", "")}  → falta companyId`);
  }
}

if (issues > 0) {
  console.error(`\n✖ ${issues} llamada(s) sin filtro de tenant.`);
  process.exitCode = 1;
} else {
  console.log("✔ check:tenant passed.");
}
