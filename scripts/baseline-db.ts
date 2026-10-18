// Baseline de migraciones: deja una base creada con `prisma db push` alineada con
// `prisma/migrations/0_init`, para que `prisma migrate deploy` tome el control.
//
// Por qué existe: el historial viejo solo creaba 15 de las 40 tablas (el resto lo aplicó
// `db push`), así que una base nueva no se podía reconstruir con `migrate deploy`. Ahora hay un
// baseline único (`0_init`) que reproduce el schema completo, y a las bases que ya existían hay
// que marcárselo como aplicado sin volver a ejecutarlo.
//
// Uso:  pnpm db:baseline --si
//
// Qué hace, en orden:
//   1. Verifica que la base sea de Facturas (tiene sus tablas; aborta si no).
//   2. Deja el historial listo: borra las filas viejas de `_prisma_migrations` si las hay
//      (nombran migraciones que ya no existen).
//   3. Marca `0_init` como aplicada (`prisma migrate resolve --applied 0_init`): no ejecuta SQL
//      de schema ni toca datos.
//   4. Compara la base con el schema y avisa si igual quedó drift.
import "dotenv/config";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASELINE = "0_init";

// Migraciones del historial viejo (todas anteriores al baseline).
const HISTORIAL_VIEJO = new Set([
  "20261010012230_init",
  "20261010014637_add_area_catalog",
  "20261010015918_add_salesperson_and_sale_fields",
  "20261010021010_add_payer_catalog",
  "20261010030000_multi_tenant",
  "20261010030001_drop_sale_status_idx",
  "20261010040000_clp_int_notificaciones_auditoria",
  "20261015120000_phase4_per_worker_legal_rates",
  "20261016120000_sale_confirming",
  "20261017120000_product_lots",
  "20261018120000_partner_default_salesperson",
  "20261019120000_defontana_credentials",
  "20261020120000_bank_ignored_reason",
  "20261021120000_bank_expense_reconciliation",
]);

// Tablas sin las cuales la base no es de Facturas: si falta alguna, es una base nueva (o ajena) y
// no hay nada que basear.
const TABLAS_CLAVE = ["Company", "User", "Membership", "Partner", "Purchase", "Sale", "Expense"];

function abortar(mensaje: string): never {
  throw new Error(mensaje);
}

function destinoLegible(url: string): string {
  try {
    const u = new URL(url);
    return `${u.hostname}:${u.port || "5432"}${u.pathname}`;
  } catch {
    return "(DATABASE_URL no se pudo leer)";
  }
}

/** Corre la CLI de Prisma por el runner (puente TLS en Windows, directo en Linux). */
function prisma(...args: string[]) {
  return spawnSync(process.execPath, [path.join(ROOT, "scripts", "prisma-run.mjs"), ...args], {
    cwd: ROOT,
    env: process.env,
    encoding: "utf8",
  });
}

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) abortar("Falta DATABASE_URL en el entorno.");

  const confirmado = process.argv.includes("--si");
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

  try {
    console.log(`Base destino: ${destinoLegible(connectionString)}`);

    // 1. ¿Tiene el esquema de Facturas? (una base nueva o ajena no se basea: se le aplica el
    // baseline con `migrate deploy`).
    const tablas = await db.$queryRawUnsafe<{ table_name: string }[]>(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'",
    );
    const nombres = new Set(tablas.map((t) => t.table_name));
    const faltantes = TABLAS_CLAVE.filter((tabla) => !nombres.has(tabla));
    if (faltantes.length > 0) {
      abortar(
        `A esta base le faltan tablas de Facturas (${faltantes.join(", ")}): no es una base ya ` +
          "usada. Si es una base nueva, no la basees: usa `pnpm db:deploy`.",
      );
    }

    // 2. ¿Qué historial trae?
    let registradas: string[] = [];
    let tablaHistorial = true;
    try {
      const filas = await db.$queryRawUnsafe<{ migration_name: string }[]>(
        'SELECT migration_name FROM "_prisma_migrations" ORDER BY migration_name',
      );
      registradas = filas.map((f) => f.migration_name);
    } catch {
      tablaHistorial = false;
    }

    if (!tablaHistorial) {
      console.log("Historial: no existe `_prisma_migrations` (la base nació de `db push`).");
    } else if (registradas.length === 0) {
      console.log("Historial: vacío (la base nació de `db push`).");
    } else {
      const ajenas = registradas.filter((nombre) => !HISTORIAL_VIEJO.has(nombre));
      if (ajenas.length > 0) {
        abortar(
          `La base registra migraciones que no son del historial viejo: ${ajenas.join(", ")}. ` +
            "Parece que ya fue baseada (o tiene un historial más nuevo): no se toca nada.",
        );
      }
      console.log(`Historial: ${registradas.length} migraciones del historial viejo.`);
    }

    const [conteos] = await db.$queryRawUnsafe<
      { empresas: bigint; usuarios: bigint; compras: bigint; ventas: bigint }[]
    >(
      `SELECT (SELECT count(*) FROM "Company") AS empresas,
              (SELECT count(*) FROM "User") AS usuarios,
              (SELECT count(*) FROM "Purchase") AS compras,
              (SELECT count(*) FROM "Sale") AS ventas`,
    );
    console.log(
      `Datos: ${conteos.empresas} empresas, ${conteos.usuarios} usuarios, ` +
        `${conteos.compras} compras, ${conteos.ventas} ventas.`,
    );

    if (!confirmado) {
      console.log(
        `\nSe marcará ${BASELINE} como aplicada` +
          (registradas.length > 0
            ? ` y antes se borrarán las ${registradas.length} filas de _prisma_migrations`
            : "") +
          ". No se ejecuta SQL de schema: los datos no se tocan." +
          "\nConfirma con: pnpm db:baseline -- --si",
      );
      return;
    }

    // 3. Historial alineado con el baseline.
    if (registradas.length > 0) {
      await db.$executeRawUnsafe('DELETE FROM "_prisma_migrations"');
      console.log(`Historial limpiado (${registradas.length} filas).`);
    }

    const resolve = prisma("migrate", "resolve", "--applied", BASELINE);
    if (resolve.status !== 0) {
      process.stderr.write(resolve.stderr ?? "");
      process.stdout.write(resolve.stdout ?? "");
      abortar(
        `\`prisma migrate resolve --applied ${BASELINE}\` falló. ` +
          "Vuelve a intentarlo antes de cualquier deploy.",
      );
    }
    console.log(`✔ ${BASELINE} marcada como aplicada.`);

    // 4. ¿La base quedó igual al schema?
    const drift = prisma(
      "migrate",
      "diff",
      "--from-config-datasource",
      "--to-schema",
      "prisma/schema.prisma",
      "--exit-code",
    );
    if (drift.status === 0) {
      console.log("✔ La base coincide con el schema. Siguiente paso: `pnpm db:deploy`.");
    } else {
      console.log("\n⚠ La base NO coincide del todo con el schema; esto es lo que sobra o falta:");
      console.log((drift.stdout ?? "").trim() || (drift.stderr ?? "").trim());
      console.log(
        "\n`pnpm db:deploy` no arregla esto: las migraciones no cubren lo que ya existía. " +
          "Genera una migración con la diferencia antes de dar por cerrado el baseline.",
      );
    }
  } finally {
    await db.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(`\n✖ ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
