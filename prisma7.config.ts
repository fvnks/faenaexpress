import "dotenv/config";
import { defineConfig } from "prisma/config";

// La CLI de Prisma usa schannel en Windows (TLS ≤ 1.2) y no negocia con el
// certificado ECDSA de PostgreSQL gestionado por Coolify. En Linux y macOS
// usa OpenSSL y valida la CA sin problema.
//
// Por eso la conexión de la CLI depende de la plataforma:
//
// - Windows: va por el puente TLS local (`scripts/prisma-with-bridge.mjs` lo
//   levanta y `PRISMA_DATABASE_URL` apunta a él). El puente abre la conexión
//   real verificada hacia el servidor.
// - Linux y macOS: conecta **directo** a la base real (`DATABASE_URL`). Si
//   se usara el puente, no habría nada escuchando en el puerto y la CLI
//   fallaría con P1001.
//
// La URL es OPCIONAL al cargar la config: durante el build de Docker no hay
// variables de entorno y `prisma generate` no conecta a la BD, solo lee el
// schema. Los comandos que sí conectan (db push, migrate, studio) corren en
// runtime, donde DATABASE_URL siempre está definida. Sin el fallback,
// PrismaConfigEnvError: Cannot resolve environment variable: DATABASE_URL
// rompe el build.
const ES_WINDOWS = process.platform === "win32";

const FALLBACK = "postgres://build:build@localhost:5432/build";

const cliUrl = ES_WINDOWS
  ? (process.env.PRISMA_DATABASE_URL ?? process.env.DATABASE_URL ?? FALLBACK)
  : (process.env.DATABASE_URL ?? process.env.PRISMA_DATABASE_URL ?? FALLBACK);

/**
 * La misma conexión, pero apuntando a otra base del mismo servidor.
 *
 * Se usa para la shadow database: `migrate dev` la necesita para probar las
 * migraciones sin tocar la base real, y la deja tirada al terminar.
 */
function conBaseDe(url: string, base: string): string {
  const u = new URL(url);
  u.pathname = `/${base}`;
  return u.toString();
}

// Shadow database URL for migration diff operations
//
// En Windows, el puente traduce el nombre de la base, así que el default
// apunta al puente. En Linux, la shadow vive en el servidor real, con las
// mismas credenciales y el mismo TLS que la base de datos: solo cambia el
// nombre de la base.
const shadowUrl =
  process.env.SHADOW_DATABASE_URL ??
  (ES_WINDOWS
    ? "postgres://postgres:postgres@localhost:15433/shadow?sslmode=disable"
    : conBaseDe(cliUrl, "shadow"));

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: cliUrl,
    shadowDatabaseUrl: shadowUrl,
  },
});
