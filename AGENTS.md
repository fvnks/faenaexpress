<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# AGENTS.md

## Proyecto

"Facturas": registro de compras, ventas y gastos de una empresa, incluyendo **quién pagó cada gasto**. Contexto fiscal: **Chile, CLP, IVA 19%**. Toda la interfaz y los datos van en español.

## Stack

- Next.js 16 (App Router, `src/`), React 19, TypeScript, Tailwind CSS 4.
- PostgreSQL + Prisma 7 (`prisma-client` generator + driver adapter `@prisma/adapter-pg`).
- Auth propia: sesiones opacas en la tabla `Session` (se guarda solo el hash del token) y contraseñas con `bcryptjs`. Roles: `ADMIN`, `ACCOUNTANT`, `SALES`, `VIEWER`.

## Comandos

| Comando | Qué hace |
| --- | --- |
| `pnpm dev` | Servidor de desarrollo (Turbopack) |
| `pnpm build` | `prisma generate` + build de producción |
| `pnpm lint` | ESLint directo (`next lint` ya no existe) |
| `pnpm typecheck` | `next typegen` + `tsc --noEmit` |
| `pnpm db:migrate` | Crea y aplica migración de desarrollo (pasa por el puente TLS local) |
| `pnpm db:generate` | Regenera Prisma Client |
| `pnpm prisma db seed` | Crea admin y empresa (usa `ADMIN_*` del `.env`) |
| `pnpm db:deploy` | Aplica migraciones en producción |
| `pnpm db:studio` | Abre Prisma Studio (pasa por el puente TLS local) |
| `pnpm db:bridge` | Levanta solo el puente TLS local (para depurar) |

Aún no hay tests. Cuando existan, documenta aquí cómo correr uno solo.

## Datos

- Schema en `prisma/schema.prisma`. Config del CLI en `prisma7.config.ts` (ese es el nombre que carga Prisma 7).
- Prisma Client se genera en `src/generated/prisma` (ignorado por git). Importar desde `@/generated/prisma/client`. No editar archivos generados.
- `DATABASE_URL` (conexión real, cifrada con la CA) y `ADMIN_*` van en `.env` (ignorado). `.env.example` es la referencia.
- `PRISMA_DATABASE_URL` apunta al puente TLS local (`127.0.0.1:15433`, `sslmode=disable`) y solo la usan los comandos de la CLI de Prisma. La CA del servidor va en `certs/` (ignorado por git).
- Tras cambiar el schema: `pnpm db:migrate` y `pnpm db:generate`.

## Gotchas que un agente suele pasar por alto

- **Prisma 7 exige driver adapter.** `new PrismaClient()` sin adapter no conecta. El singleton en `src/lib/db.ts` usa `PrismaPg`.
- **CLI de Prisma en Windows + TLS**: el motor de la CLI usa schannel, que solo llega a TLS 1.2 y falla contra el certificado ECDSA de Coolify (`P1011 ... os error -2146893018`). Por eso `db:migrate`/`db:deploy`/`db:studio` corren a través de `scripts/prisma-with-bridge.mjs`, un puente TLS local (`scripts/pg-tls-bridge.mjs`) que sí verifica la CA. La app en runtime no lo necesita: usa `pg` (OpenSSL) directo. En Linux (Coolify) la CLI funciona sin puente.
- **pnpm 12**: los build scripts se permiten en `pnpm-workspace.yaml` (`allowBuilds`); el campo `pnpm` de `package.json` ya no se lee.
- **Cache Components está desactivado a propósito** (`next.config.ts`). Si se activa, todo `cookies()`/`headers()` debe ir dentro de `<Suspense>` o el build falla; `partialPrefetching` lo exige.
- **APIs async**: en Next 16 `cookies()`, `headers()`, `params` y `searchParams` son promesas. Usa `LayoutProps<"/ruta">` y `PageProps<"/ruta">` (los genera `next typegen`).
- **`middleware` se renombró a `proxy`** (`src/proxy.ts`, runtime Node). No usar edge.
- Las Server Actions son alcanzables por POST directo: valida auth y rol dentro de cada acción, no solo en la UI.

## Flujo

1. Modelo en `prisma/schema.prisma` → `pnpm db:migrate`.
2. Acceso a datos en `src/lib`, mutaciones en `src/app/actions`.
3. UI como Server Components; `"use client"` solo para interacción.
4. Antes de escribir UI, resolver dirección visual (`DESIGN.md`, R-37 de antislop). Sin dirección, el resultado es un borrador.

## UI y tema

- Dirección visual en `DESIGN.md`: léelo antes de tocar UI. Tokens en `src/app/globals.css` (`@theme inline`). En los componentes usa utilidades semánticas (`bg-surface`, `text-muted-foreground`, `border-border`, `bg-primary`), no colores crudos.
- Tema claro/oscuro mediante la clase `dark` en `<html>`. Se aplica antes de pintar con un script inline en `src/app/layout.tsx` y se alterna con `src/components/theme-toggle.tsx`. Verifica **ambos** temas (R-34).
- Tipografía IBM Plex Sans vía `next/font/google`; montos y tablas usan la clase `.tabular`.

## Deploy (pendiente)

Local primero; luego VPS Ubuntu con Coolify. En Coolify: build `pnpm build`, release `pnpm db:deploy`, y definir `DATABASE_URL` + credenciales del admin como variables de entorno.

<!-- antislop:start -->
## antislop

Modo activo: **DURING** (aplicar mientras se construye). Skills activas: todas.

Para UI, copy, accesibilidad, layout mobile o comentarios de código, carga la skill `antislop` y luego la del área:

- UI / visual: `antislop-ui`
- Copy y textos: `antislop-copywriting`
- Personas / accesibilidad: `antislop-human`
- Mobile / responsive: `antislop-layoutmobile`
- Comentarios de código: `antislop-code`

No hay `ux-ui-pro-max` instalada; se usa `antislop-ui` (+ `frontend-design` si hace falta). Antes de construir UI, resolver dirección (R-37): si no existe `DESIGN.md`, preguntar, o marcar el resultado como "borrador sin dirección" con diales ENERGY 1 / RHYTHM 1 / MOTION 1.
<!-- antislop:end -->
