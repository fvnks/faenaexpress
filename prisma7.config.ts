import "dotenv/config";
import { defineConfig } from "prisma/config";

// La CLI de Prisma en Windows no puede conectar por TLS a este Postgres
// (schannel + certificado ECDSA). Se conecta al puente TLS local
// (scripts/pg-tls-bridge.mjs) vía PRISMA_DATABASE_URL; la app en tiempo de
// ejecución usa DATABASE_URL directamente.
//
// La URL es OPCIONAL al cargar la config: durante el build de Docker no hay
// variables de entorno y `prisma generate` no conecta a la BD, solo lee el
// schema. Los comandos que sí conectan (db push, migrate, studio) corren en
// runtime, donde DATABASE_URL siempre está definida. Sin el fallback,
// PrismaConfigEnvError: Cannot resolve environment variable: DATABASE_URL
// rompe el build.
const cliUrl =
  process.env.PRISMA_DATABASE_URL ??
  process.env.DATABASE_URL ??
  "postgres://build:build@localhost:5432/build";

// Shadow database URL for migration diff operations
const shadowUrl = process.env.SHADOW_DATABASE_URL ?? "postgres://postgres:postgres@localhost:15433/shadow?sslmode=disable";

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
