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
| `pnpm db:deploy` | Aplica migraciones en producción (lo corre el entrypoint de Docker) |
| `pnpm db:drift` | Compara la base con el schema; exit 0 = alineados (`--exit-code`) |
| `pnpm db:baseline` | Basea una base antigua al baseline `0_init` (ver gotchas) |
| `pnpm db:studio` | Abre Prisma Studio (pasa por el puente TLS local) |
| `pnpm db:bridge` | Levanta solo el puente TLS local (para depurar) |

Aún no hay tests. Cuando existan, documenta aquí cómo correr uno solo.

## Datos

- Schema en `prisma/schema.prisma`. Config del CLI en `prisma7.config.ts` (ese es el nombre que carga Prisma 7).
- **El historial de migraciones arranca en el baseline `0_init`** (`prisma/migrations/0_init/migration.sql`): reproduce las 40 tablas del schema y se generó con `migrate diff --from-empty`. El historial anterior (14 migraciones que cubrían solo 15 tablas; el resto lo aplicó `db push`) se eliminó del repo, pero sigue en git si alguien necesita mirarlo. No hay que resucitarlo: las bases antiguas se pasan una vez por `pnpm db:baseline`.
- Prisma Client se genera en `src/generated/prisma` (ignorado por git). Importar desde `@/generated/prisma/client`. No editar archivos generados.
- `DATABASE_URL` (conexión real, cifrada con la CA) y `ADMIN_*` van en `.env` (ignorado). `.env.example` es la referencia.
- `PRISMA_DATABASE_URL` apunta al puente TLS local (`127.0.0.1:15433`, `sslmode=disable`) y solo la usan los comandos de la CLI de Prisma. La CA del servidor va en `certs/` (ignorado por git).
- Tras cambiar el schema: `pnpm db:migrate` y `pnpm db:generate`, y luego `pnpm db:drift` para confirmar que la base quedó igual al schema.

## Gotchas que un agente suele pasar por alto

- **Prisma 7 exige driver adapter.** `new PrismaClient()` sin adapter no conecta. El singleton en `src/lib/db.ts` usa `PrismaPg`.
- **Migraciones: el entrypoint corre `pnpm db:deploy`, nunca `db push`.** Cualquier comando de la CLI sale por `scripts/prisma-run.mjs`, que en Windows usa el puente TLS y en Linux llama a la CLI directo (mismo comando, dos entornos). Una base creada antes del baseline tiene que pasarse **una vez** por `pnpm db:baseline --si` (borra el historial viejo de `_prisma_migrations` y marca `0_init` como aplicada; no ejecuta SQL de schema ni toca datos). Si no, `migrate deploy` falla a propósito: es preferible a que resetee la base. `pnpm db:drift` debe salir 0 después de cualquier cambio.
- **CLI de Prisma en Windows + TLS**: el motor de la CLI usa schannel, que solo llega a TLS 1.2 y falla contra el certificado ECDSA de Coolify (`P1011 ... os error -2146893018`). Por eso la CLI pasa por `scripts/prisma-with-bridge.mjs`, un puente TLS local (`scripts/pg-tls-bridge.mjs`) que sí verifica la CA. La app en runtime no lo necesita: usa `pg` (OpenSSL) directo. En Linux (Coolify) la CLI funciona sin puente.
- **pnpm 12**: los build scripts se permiten en `pnpm-workspace.yaml` (`allowBuilds`); el campo `pnpm` de `package.json` ya no se lee.
- **Cache Components está desactivado a propósito** (`next.config.ts`). Si se activa, todo `cookies()`/`headers()` debe ir dentro de `<Suspense>` o el build falla; `partialPrefetching` lo exige.
- **APIs async**: en Next 16 `cookies()`, `headers()`, `params` y `searchParams` son promesas. Usa `LayoutProps<"/ruta">` y `PageProps<"/ruta">` (los genera `next typegen`).
- **No hay `middleware`**, pero sí un **`proxy`** (Next 16 renombró `middleware` a `proxy`): vive en `src/proxy.ts` y es el **primer filtro** de sesión — sin cookie de sesión, las rutas privadas (`/facturas`, `/admin`, `/perfil`, `/modulos`, `/api`) van al login sin renderizar la app. **No consulta la base**: solo mira que la cookie exista; la autorización real (rol, organización, módulo) sigue en `requireContext` y `requirePlatformStaff`. `/invitacion` NO está protegida a propósito (es para quien aún no tiene cuenta).
- **Aislamiento entre empresas**: cada consulta filtra por `companyId` y el rol se valida dentro de la acción (las Server Actions son alcanzables por POST directo). Crear una empresa es solo para **ADMIN de la empresa activa** (`createCompany`), y en Configuración el formulario se oculta a quien no lo sea.
- Las Server Actions son alcanzables por POST directo: valida auth y rol dentro de cada acción, no solo en la UI.
- **Abonos (pagos/cobros parciales)**: la tabla `Payment` guarda pagos aplicados a una compra o a una venta (exactamente uno de `purchaseId`/`saleId`). Con abonos, **el estado es derivado**: `lib/payments.ts` (`recomputeStatus`) lo recalcula como `PENDING` (sin abonos) / `PARTIAL` (no cubre el total) / `PAID` (lo cubre), y fija `paymentDate`/`paymentMethod` desde el último abono. No escribas el estado a mano en un documento con abonos: los atajos «marcar pagada/pendiente» y el lote de la lista los bloquean. El monto a cubrir es el total de la compra o, en ventas, el total menos la retención (`saleSettleTotal`). Panel en `components/payments-panel.tsx`.
- **Conciliación bancaria (sección Banco)**: el scraper de `open-banking-chile` corre en un proceso hijo (`scripts/bank-sync-worker.mjs`) y necesita un Chrome/Chromium real. El paquete solo busca rutas de Linux/macOS/WSL, así que el worker resuelve la ruta por su cuenta (Chrome instalado → caché de Playwright → Edge) y acepta `OB_CHROME_PATH` para forzarla. Diagnóstico: `node scripts/bank-sync-worker.mjs --find-chrome`.
  Un movimiento sale de la bandeja sin conciliar con `ignoredAt` + `ignoredReason`, que distingue `internal_transfer` (traspaso entre cuentas propias: la glosa nombra una cuenta —«Traspaso A Cuenta:008178288402»— y el mismo monto aparece con el signo opuesto a pocos días) de `noise` (descarte a mano). «Deshacer» una conciliación borra el vínculo y devuelve el documento a pendiente, salvo la venta cobrada por Confirming.
  El matcher propone montos exactos contra compras por pagar, ventas por cobrar y **gastos pendientes de reembolso** (un cargo también es el reembolso a quien puso la plata). Conciliar un movimiento con un gasto lo marca `reimbursed` con la fecha del movimiento; deshacerlo lo devuelve a pendiente de reembolso, sin ambigüedad, porque solo se ofrecen gastos sin reembolsar. El lote de coincidencias únicas **no** toca gastos: reembolsar es una afirmación sobre a quién se le devolvió la plata y la confirma una persona (marcar un gasto ya reembolsado falla).
  «Nuevo gasto», en cada cargo de la bandeja, lleva al formulario de gastos con la glosa, la fecha, el monto (separado en neto + IVA, editable) y el medio de pago del movimiento; al guardar vuelve a la bandeja con ese movimiento destacado, donde el gasto recién creado ya aparece como sugerencia. Falta destino para los pagos agrupados y las comisiones bancarias.
- **XML del SII**: el RCV (`www4`) solo da totales y listado: no expone XML, ni con la Clave de la empresa ni con una persona autorizada. Los XML están en el "Sistema de Facturación Gratuito del SII" (MIPYME), y ahí no basta una persona que represente a la empresa: hay que figurar como **usuario autorizado de ESE sistema** para la empresa (lista propia, distinta de la del RCV). Verificado en vivo (oct 2026): una cuenta autorizada para el RCV de la empresa (118 compras / 80 ventas) no tenía ninguna empresa en MIPYME, y el "Respaldo de Información XML" devolvía 0 documentos. El login del SII acepta RUT+Clave Tributaria (automatizable) o ClaveÚnica (OIDC con segundo factor: solo interactivo). Flujo, URLs y formularios verificados en `src/lib/sii/download-dtes.ts`; hoy el camino que funciona es la carga manual del XML o del ZIP del "Respaldo de DTE" en Importar.
- **XML de Defontana (ERP)**: Defontana no tiene API abierta, pero el módulo "Nova" de Compras usa estos endpoints, replicados en `src/lib/defontana/client.ts`:
  - `GET https://portal-api.defontana.com/api/Account/EmailLogin?Email=..&password=..` → JWT de portal.
  - `GET …/api/Product/SetProductLogin?Code=5&userID=<userId>&expirationDate=<iso>` (con `Bearer <token>`) → cookie `access_token` de sesión (JWT HS256, **válido ~1 año**, aud fijo).
  - `POST https://2za6uxb6…appsync-api.us-east-1.amazonaws.com/graphql` con `authorization: <access_token>` (sin prefijo `Bearer`) → GraphQL `QueryERPDocuments($input)` que retorna filas del Libro de Compras con `DocumentPlatformId`.
  - `GET https://compras.defontana.com/ComprasApi/api/purchase/getdte?id=<platformId>` con `authorization: Bearer <access_token>` → XML DTE (`text/plain`, codificado ISO-8859-1, `<EnvioDTE>`). (El mismo endpoint sirve para ambos tipos; el `platformId` es `DocumentPlatformId` en compras y `documentId` en ventas.)
  - Para ventas: el listado se obtiene con GraphQL `GetSalesByCompany` (endpoint `nyaybczuqrbvrg6g6xo3x5brqm.appsync-api.us-east-1.amazonaws.com/graphql`). Las filas tienen `documentId`, `eCode` (tipo SII), `clientRut`, `total` (string en formato local) y `emissionDate`.
  - **Filtros que NO sirven (bug corregido)**: el `proveedor` de compras y el `clientSearch` de ventas **no** cruzan el RUT contra el del documento; comparan exacto contra el RUT *tal como lo tiene guardado* Defontana, que unas veces viene con puntos («94.668.000-1») y otras sin ellos («76056614-4»). Mandar el RUT normalizado (`normalizeRut`) dejaba la búsqueda en **cero filas siempre**, aunque el documento existiera. Por eso el cliente **no envía esos filtros**: se busca por `folio` (que sí acota) y el RUT del tercero se verifica en local (`elegirDocumento` en `src/app/actions/defontana.ts`), prefiriendo el tipo SII esperado porque el folio se repite entre proveedores.
  - Aun así, no todo documento del Libro de Compra está en el ERP: los ingresados sin XML de plataforma, o con un folio distinto al del RCV, no se encuentran (se avisa con el estado `sin-documento`; si el folio aparece de otro tercero, `otro-proveedor`).
  - La cuenta del portal entrega la empresa por defecto; al guardar credenciales se invoca `getMasterData` para verificar que la empresa coincide con la del registro; si no coincide, se rechaza el guardado. Si el token es rechazado por el ERP, el cliente lo renueva automáticamente una vez.
  - Integración: `src/lib/defontana/client.ts` (compras y ventas), `src/lib/defontana/credentials.ts` (cacheo + login), `src/app/actions/defontana.ts` (acciones CRUD de credenciales + fetch). La UI expone el botón "Traer XML de Defontana" en el detalle de cada compra o venta cuando la empresa tiene credenciales y el usuario puede escribir.

## Flujo

1. Modelo en `prisma/schema.prisma` → `pnpm db:migrate`.
2. Acceso a datos en `src/lib`, mutaciones en `src/app/actions`.
3. UI como Server Components; `"use client"` solo para interacción.
4. Antes de escribir UI, resolver dirección visual (`DESIGN.md`, R-37 de antislop). Sin dirección, el resultado es un borrador.

## Rutas y módulos

- El módulo Facturas vive en `/facturas/*` (antes `/dashboard`; un catch-all en `src/app/dashboard/[[...slug]]` hace redirect permanente 308 a las rutas nuevas).
- El login decide el destino en el servidor con `postLoginDestination` (`src/lib/modules.ts`): 1 módulo → directo; 2+ → `/modulos` (selector con tarjetas de pendientes reales). El `ModuleSwitcher` del header solo aparece con 2+ módulos; con uno, nada.
- Los módulos se declaran en `src/lib/modules.ts`: agregar un módulo = agregar una entrada (`code`, nombre, `href`, `pendings`) + sus rutas.
- `DEPLOYMENT_PROFILE=saas` muestra la landing de Yellow ERP en `/`; el default (`standalone`) mantiene el redirect a sesión/login.
- **Consola de operador (`/admin`, Nivel 2)**: mesa de trabajo del equipo de Yellow ERP sobre todas las cuentas. La protege `PlatformStaff` (tabla en BD, no flag de entorno): `SUPPORT` (lee) / `OPERATOR` (actúa) / `OWNER` (todo). `requirePlatformStaff(nivel)` corta en el layout y en **cada** Server Action; quien tiene sesión pero no es staff rebota a `/facturas`. La auditoría va a `PlatformAudit` (por persona del equipo, no por empresa). El primer dueño de plataforma se deja con `PLATFORM_STAFF_EMAIL` en el `seed`. El detalle del diseño está en `PLAN-ADMIN.md` §2.2.
- **Impersonación («entrar como», Fase B2)**: `src/lib/impersonation.ts`. Crea una **sesión aparte** (cookie `facturas_impersonacion`), con tope duro de 30 minutos, banner permanente y salida a un clic. Durante la impersonación **no** se puede eliminar una empresa, exportar datos, cambiar contraseñas ni ver RRHH (`IMPERSONATION_FORBIDDEN`). Entrar a la cuenta de un cliente es de nivel `OPERATOR` y solo a miembros `OWNER`/`ADMIN` de la organización. La entrada y la salida quedan en `PlatformAudit` y el **dueño de la cuenta** las ve en `/facturas/organizacion`. La consola usa la sesión propia (`getRealSessionUser`), así que dentro de una impersonación no se entra a `/admin`.
- **Módulos por organización (Fase C)**: `src/lib/org-modules.ts` (catálogo) y `src/lib/org-module-state.ts` (estado). La fila en `OrganizationModule` es el estado explícito; sin fila aplica el defecto «habilitado» (la maqueta no bloquea a nadie). `requireContext` aplica los **dos filtros en serie**: la organización tiene el módulo **y** el rol da acceso a la sección. El corte es único y cubre también las rutas anidadas. El operador los gestiona en `/admin/modulos` y en la ficha de cada organización; el cliente los ve en `/facturas/organizacion`. Cada cambio queda en `PlatformAudit`. Ojo: **la lista de módulos del plan es autoritativa** (`syncPlanModules` escribe una fila `source="plan"` por módulo, con `enabled=false` para los que el plan no trae); lo habilitado a mano (`source="manual"`) no se pisa nunca.
- **Permisos finos por sección (por persona)**: `Membership.sectionAccess` (JSONB) guarda las **excepciones** por sección; lo que no está ahí lo decide el rol. Secciones afinables: `rrhh`, `inventario`, `comisiones`, `banco`. Niveles: sin acceso / solo ver / editar. La resolución es unificada en `effectiveSectionAccess` (`src/lib/permissions.ts`) y la usan `requireContext`, `canWrite`, el menú y `canInventoryRead/Edit`: el corte está en un solo lugar y cubre menú, URL y acciones. Ojo: en este mapa `NONE` significa «no entra»; en la columna antigua `inventoryAccess` significa «sin configurar» y se cae al rol (no se cambia para no romper lo que ya funciona). Al cambiar el rol de alguien, sus excepciones se borran (estaban afinadas para el rol viejo).
- **Planes y uso (Fase D)**: `src/lib/plans.ts`. `Plan` (catálogo) ≠ `Subscription` (contratado) ≠ `UsageRecord` (contador del período). Los planes se editan en `/admin/planes` y se asignan a una cuenta en su ficha. El **enforcement va en la Server Action** (`checkPlanLimit`), nunca en el botón: al registrar venta/compra/gasto, al agregar un usuario y al crear una empresa. El seed asegura el plan `Free` sin topes y una suscripción por organización. Los módulos del plan se reflejan con `source = "plan"`, pero lo habilitado a mano (`source = "manual"`) no se pisa: manual > plan > defecto. El cliente ve su plan en `/facturas/facturacion`.
- **Segundo factor (Fase E)**: `src/lib/totp.ts` (TOTP propio, sin dependencias) y `src/lib/two-factor.ts`. Lo necesitan el **dueño de una organización** y el **personal de plataforma** (`requiresTwoFactor`). Al login, su sesión nace `totpPending`: con ella no se puede usar la app (`requireUser` manda a `/perfil/2fa`), solo confirmar el código. El secreto va cifrado con la llave de secretos; hay 8 códigos de recuperación de un solo uso y el OWNER de plataforma puede restablecer el 2FA de alguien desde `/admin/usuarios/[id]`. **Quien pierde el teléfono y no tiene códigos necesita un restablecimiento por SQL** (`disableTwoFactor`).
- **Rate limit del login**: en `src/app/actions/auth.ts` (20 intentos por IP y 10 por cuenta cada 15 min). Es **en memoria**: con más de una instancia hay que moverlo a Redis.

## UI y tema

- Dirección visual en `DESIGN.md`: léelo antes de tocar UI. Tokens en `src/app/globals.css` (`@theme inline`). En los componentes usa utilidades semánticas (`bg-surface`, `text-muted-foreground`, `border-border`, `bg-primary`), no colores crudos.
- Tema claro/oscuro mediante la clase `dark` en `<html>`. Se aplica antes de pintar con un script inline en `src/app/layout.tsx` y se alterna con `src/components/theme-toggle.tsx`. Verifica **ambos** temas (R-34).
- Tipografía IBM Plex Sans vía `next/font/google`; montos y tablas usan la clase `.tabular`.

## Deploy

VPS Ubuntu con Coolify (`148.113.196.87`). Build `pnpm build`, release `pnpm db:deploy` (lo corre el
entrypoint del contenedor), y `DATABASE_URL` + credenciales del admin como variables de entorno.

- **Esta app vive en `erp.faenaexpress.cl`** (perfil `standalone`: sin landing, el visitante va a `/login`).
  Ojo: **`yellow-erp.cl` es otro proyecto** (landing de marketing), no esta app — y está detrás de
  Cloudflare. El plan para reemplazarlo está en `DEPLOY.md`.
- La consola de operador (`/admin`) está en `erp.faenaexpress.cl/admin` por ahora. Cuando exista el
  despliegue con perfil `saas`, se publica como `admin.yellow-erp.cl` (ver `PLAN-ADMIN.md` §6b).
- La base de producción está en el puerto **5432 del VPS, sin TLS** (la CLI de Prisma en Windows no
  puede conectar: hay que apuntar `DATABASE_URL` y `PRISMA_DATABASE_URL` a ella y llamar
  `node node_modules/prisma/build/index.js <comando>`; el puente TLS de `scripts/prisma-run.mjs` no sirve
  contra ese puerto). El `.env` local apunta a la **5433**, que sí tiene TLS.

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
