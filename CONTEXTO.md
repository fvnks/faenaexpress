# Facturas — Contexto completo de la aplicación

> Documento de referencia para conocer la app en profundidad: qué hace, cómo está construida,
> dónde vive cada cosa y qué trampas hay que evitar. Complementa a `AGENTS.md` (reglas para
> agentes) y `DESIGN.md` (dirección visual).

---

## 1. Qué es

**Facturas** es un sistema web multiempresa para registrar **compras, ventas y gastos** de una
empresa en Chile, con énfasis en saber **quién pagó cada gasto**. Todo el texto de la interfaz y
los datos están en **español**; el contexto fiscal es chileno: montos en **CLP (pesos, sin
decimales)** e **IVA 19 %**.

Funcionalidades principales:

- **Compras**: facturas/boletas de proveedores, con estado de pago (pendiente/pagada), fecha de
  vencimiento, medio de pago y categoría.
- **Ventas**: facturas emitidas a clientes, con estado de cobro, vendedor, orden de compra, guía
  de despacho, N° HES y retención de honorarios.
- **Gastos**: gastos operacionales con **quién pagó** (pagador) y si ya fue **reembolsado**.
- **RRHH** (`/facturas/rrhh`): trabajadores (nombre + RUT) y sus pagos — sueldos, aguinaldos,
  bonos, adelantos — con registros libres (tipo + período opcional + **monto líquido**). Cada
  pago genera **automáticamente el gasto** (sin IVA, con trabajador y pagador asociados) que
  fluye a Gastos, al reporte IVA y al desglose "Por trabajador". Solo ADMIN y ACCOUNTANT.
  **Guardas de RUT**: un trabajador no puede llevar el RUT de un cliente/proveedor ni
  viceversa (`workerRutExists`/`partnerRutExists` en `lib/rrhh.ts`, aplicadas en partners,
  RRHH y el importador XML: un DTE cuyo receptor sea trabajador se marca error).
- **Terceros**: clientes y proveedores (un mismo registro puede ser ambos, `PartnerType.BOTH`).
  Las listas de Clientes y Proveedores tienen **buscador por nombre o RUT**, filtro de estado
  (Activos / Inactivos / Todos) y paginación.
- **Punto de Venta** (`/pos`): caja rápida con apertura/cierre de caja, arqueo, catálogo de
  productos compartido con Facturas, ventas con múltiples medios de pago, devoluciones y
  anulaciones, y **emisión de DTE al SII** (boleta 39 o factura 33) con certificado digital,
  CAF y consulta de estado por TrackID.
- **Catálogos por empresa**: categorías (gastos y/o compras), áreas, vendedores, pagadores y
  medios de pago (los trabajadores se gestionan en RRHH).
- **Reportes fiscales**: IVA mensual (preparación del F29), libro de compras, libro de ventas,
  pagos y deudas, gastos por área, y **flujo de caja proyectado**.
- **Importación**: planillas Excel/CSV con plantillas descargables, y **XML DTE del SII**
  (facturación electrónica chilena) tanto para ventas propias como base para compras.
- **XML de Defontana desde la lista**: en Compras y Ventas, el menú de acciones (⋮) de cada
  documento trae el XML de Defontana sin entrar al detalle. Si la empresa no tiene credenciales
  de Defontana guardadas, el botón muestra "Configurar Defontana" y lleva a Configuración.
- **Notificaciones** automáticas de vencimientos (compras y ventas por pagar/cobrar, vencidas).
- **Auditoría** de quién creó, editó o eliminó cada registro.
- **Multiempresa**: un usuario puede pertenecer a varias empresas, con un selector de empresa
  activa; al crear usuarios se elige si ven una empresa o todas donde el admin es administrador.
- **Selector de módulos**: Facturas, Punto de Venta, Colegios y Facturación SaaS muestran el
  `ModuleSwitcher` en el header cuando el usuario tiene más de un módulo activo, para cambiar
  entre módulos sin volver al selector de `/modulos`.

---

## 2. Stack

| Capa | Tecnología |
| --- | --- |
| Framework | **Next.js 16** (App Router, Turbopack, `src/`) + **React 19** |
| Lenguaje | TypeScript strict (`pnpm typecheck` = `next typegen` + `tsc --noEmit`) |
| Estilos | **Tailwind CSS 4** (tokens semánticos en `globals.css` con `@theme inline`) |
| Base de datos | **PostgreSQL** ( Coolify en producción, TLS con CA propia) |
| ORM | **Prisma 7** con **driver adapter** (`@prisma/adapter-pg`) — obligatorio, ver gotchas |
| Auth | Propia: sesiones opacas (token aleatorio, en BD solo su hash SHA-256) + `bcryptjs` |
| XML | `fast-xml-parser` (parser del DTE del SII) |
| Fuentes | IBM Plex Sans vía `next/font/google` (pesos 300–700) |
| Gráficos | SVG/HTML puro propios (`components/charts.tsx`), sin librerías |
| Iconos | SVG inline propios, **sin lucide-react** ni otras dependencias de iconos |
| Deploy | Pendiente: VPS Ubuntu + **Coolify** (build `pnpm build`, release `pnpm db:deploy`) |

### Comandos

| Comando | Qué hace |
| --- | --- |
| `pnpm dev` | Servidor de desarrollo (Turbopack) |
| `pnpm build` | `prisma generate` + build de producción |
| `pnpm lint` | ESLint directo (`next lint` ya no existe en Next 16) |
| `pnpm typecheck` | `next typegen` + `tsc --noEmit` |
| `pnpm db:migrate` | Crea y aplica migración de desarrollo (pasa por el puente TLS local) |
| `pnpm db:generate` | Regenera Prisma Client (`src/generated/prisma`, ignorado por git) |
| `pnpm db:deploy` | Aplica migraciones en producción (lo corre el entrypoint de Docker) |
| `pnpm db:drift` | Compara la base con el schema; exit 0 = alineados |
| `pnpm db:baseline` | Basea una base antigua al baseline `0_init` (ver §12.3) |
| `pnpm db:studio` | Prisma Studio (vía puente TLS) |
| `pnpm db:bridge` | Levanta solo el puente TLS local (para depurar) |
| `npx tsx --env-file=.env scripts/xxx.ts` | Scripts sueltos contra la BD (seed incluido) |

No hay tests todavía. El seed del admin/empresa usa `pnpm prisma db seed` con credenciales
`ADMIN_*` del `.env`.

---

## 3. Arquitectura y estructura

### Flujo de datos

1. **Páginas** (`src/app/**/page.tsx`): Server Components. Cargan datos llamando funciones de
   `src/lib/*` (nunca Prisma directo en el render, salvo casos puntuales en configuración).
2. **Mutaciones** (`src/app/actions/*.ts`): Server Actions `"use server"`. Cada una valida auth +
   rol **por sí misma** (son alcanzables por POST directo).
3. **UI interactiva** (`src/components/*`): Client Components solo donde hay estado/clicks
   (dropdowns, calendarios, formularios, selección masiva).

### Mapa de carpetas

```
src/
  app/
    layout.tsx            # IBM Plex Sans + script de tema antes de pintar
    page.tsx              # standalone: redirect a sesión/login · saas: landing pública
    login/                # Split-screen: page.tsx + login-form.tsx + visual.tsx (mockup)
    modulos/              # Selector de módulos (con 2+): tarjetas con pendientes reales
    perfil/               # Cambio de contraseña (obligatorio al llegar por invitación)
    invitacion/[token]/   # Aceptación de invitación por enlace copiable
    facturas/             # El módulo Facturas (antes /dashboard; ver redirect abajo)
      layout.tsx          # Sidebar + campana + toggle + switchers de módulo y empresa
      page.tsx            # Panel: KPIs, gráficos 12 meses, top clientes, alertas, módulos
      compras/            # Lista + [id] + [id]/editar + nueva (+ purchase-form.tsx)
      ventas/             # Lista + [id] + [id]/editar + nueva (+ sale-form.tsx)
      gastos/             # Lista + [id] + [id]/editar + nueva (+ expense-form.tsx)
      clientes/           # Lista con búsqueda y paginación + [id] (editar) + nuevo
      proveedores/        # Ídem clientes
      catalogos/          # Categorías, áreas, vendedores, pagadores, medios de pago
      reportes/           # page (resumen) + iva | libro-compras | libro-ventas | pagos |
                          # gastos | caja — cada uno con /export/route.ts (CSV)
      importar/           # XML DTE (dte-import.tsx) + Excel/CSV (import-form.tsx) + plantillas
      notificaciones/     # Centro de notificaciones con estado leído/no leído
      configuracion/      # Empresa, usuarios y roles, mis empresas, crear empresa
      auditoria/          # Historial de cambios con filtros
    dashboard/[[...slug]]/page.tsx  # Redirect permanente 308 → /facturas/* (compatibilidad)
    billing/              # Facturación SaaS (plan, facturas, métodos de pago)
      layout.tsx          # Header con ModuleSwitcher y navegación común
      page.tsx            # Resumen de plan, estado de suscripción
      plan.tsx            # Cambiar plan
      payment-methods.tsx # Métodos de pago guardados
      pay-invoice.tsx     # Pagar facturas pendientes
      invoices.tsx        # Listado de facturas
    colegios/             # El módulo Colegios
      layout.tsx          # Header con ModuleSwitcher, SchoolSwitcher y secciones
    pos/                  # El módulo Punto de Venta
      layout.tsx          # Header con ModuleSwitcher y PosNav
      page.tsx            # Resumen del día, KPIs, últimas ventas, estado de caja
      caja/               # Abrir / cerrar caja, arqueo, historial de cajas
      venta/              # Formulario de venta (sale-form) con catálogo y pagos
      ventas/             # Lista de tickets con filtros y [id] (detalle del ticket)
      productos/          # Catálogo de productos del POS (alta, edición, ajuste de stock)
      sii/                # Configuración SII: certificado .pfx, resolución, acteco, CAFs
        page.tsx          # Configuración SII, CAFs y reenvío masivo de DTEs en error
        config-form.tsx   # Certificado, datos emisor, habilitación, entorno SII
        caf-form.tsx      # Gestión de CAFs (tipos 33, 39, 61, 56)
        dte-error-reenvio.tsx  # Reenvío masivo de DTEs en error/rechazados
      [id]/               # Detalle de ticket con DteInfo, DteDownload y reintento
        page.tsx          # Ticket de venta con información del DTE (folio, estado)
        dte-info.tsx      # Estado del DTE y botón de reintento individual
        dte-download.tsx  # Descarga del XML firmado del DTE emitido
        print-ticket-button.tsx
        thermal-ticket.css
        void-sale-form.tsx
        return-form.tsx
  actions/                # Server Actions (auth, companies, purchases, sales, expenses,
                          # partners, catalogs, import, dte, notifications, invitations,
                          # accept-invitation, profile, modules)
  components/             # Componentes compartidos (ver §10)
  lib/                    # Acceso a datos, reglas de negocio y utilidades
  generated/prisma/       # Prisma Client generado (ignorado por git; importar como
                          # @/generated/prisma/client)
prisma/schema.prisma      # Modelo completo (ver §4)
prisma/migrations/         # Baseline 0_init + migraciones posteriores (ver §12.3)
scripts/                  # pg-tls-bridge, prisma-with-bridge, prisma-run, baseline-db,
                          # reset-password, bank-sync-worker, docker-entrypoint
DESIGN.md                 # Dirección visual (léela antes de tocar UI)
AGENTS.md                 # Reglas para agentes de código
CONTEXTO.md               # Este documento
```

### Responsabilidades de `src/lib/`

| Módulo | Qué contiene |
| --- | --- |
| `db.ts` | Singleton de PrismaClient **con `PrismaPg` adapter** (obligatorio en Prisma 7) |
| `session.ts` | Crear/borrar/leer sesiones opacas; "Recuérdame" y renovación automática |
| `auth.ts` | `getCurrentUser` (cacheado por request), `requireUser`, `requireContext(section)`, `getActiveMembership`, `canWrite`, `isAdmin`, `visibleCompanies` (permiso multiempresa), cookie `facturas_company` |
| `deployment.ts` | Perfil de despliegue: `standalone` (instalación privada, default) vs `saas` (Yellow ERP con landing en `/`). Se define con `DEPLOYMENT_PROFILE` |
| `modules.ts` | Registry de módulos: `enabledModules(userId)`, `postLoginDestination(userId)` (1 módulo → directo; 2+ → `/modulos`) y `MODULE_COOKIE` (último usado). Cada módulo declara href y pendientes reales |
| `types.ts` | `SessionUser` y `AuthContext` compartidos entre auth/session |
| `rate-limit.ts` | `RateLimiter` en memoria (invitaciones y aceptación) |
| `permissions.ts` | Matriz `ACCESS`/`WRITE` por sección y rol |
| `password.ts` | `hashPassword`/`verifyPassword` (bcryptjs) |
| `money.ts` | `formatCLP`, `formatDate` (es-CL, TZ UTC), `todayISO`/`todayDate` (America/Santiago), `computeIva`, `computeTotal`, `documentSign`, `monthRange`, `currentPeriod`, `formatPeriod`, `shiftPeriod`, `daysBetween`, `toISODate` |
| `rut.ts` | `normalizeRut`, `formatRut`, `isValidRut` (módulo 11) |
| `labels.ts` | Etiquetas en español de todos los enums + `dteTipoLabel`/`dteMotivoOmision` |
| `validation.ts` | Schemas zod-like propios (`saleSchema`, `purchaseSchema`, `expenseSchema`, `companySchema`, `memberSchema`, `newUserSchema`, `loginSchema`, `partnerSchema`) y listas de valores (`documentTypeValues`, `paymentMethodValues`, `partnerTypeValues`, `roleValues`, `categoryKindValues`) |
| `reports.ts` | `ivaSummary`, `libroCompras/Ventas`, `paymentsSummary`, `expensesBreakdown` (categoría/área/trabajador), `pendingTotals`, `pendingCounts`, `monthlyTotals`, `topClients`, `cashFlowProjection` |
| `flash.ts` | Mensaje "flash" en cookie para toasts tras Server Actions que redirigen (`setFlash`/`getFlash`) |
| `payments.ts` | Abonos: `listPayments`, `sumPayments`, `saleSettleTotal` y `recomputeStatus` (deriva `PENDING`/`PARTIAL`/`PAID` del documento desde sus abonos) |
| `audit.ts` | `recordAudit(ctx, { action, entityType, entityId, summary, changes? })` |
| `notifications.ts` | `syncDueNotifications` (recalcula alertas al entrar al panel), `listNotifications`, contadores |
| `catalogs.ts` / `partners.ts` / `purchases.ts` / `sales.ts` / `expenses.ts` | Consultas + serializadores para formularios (`serializeSale`, etc.) |
| `dte.ts` | Server Actions de DTE: `emitirDteAction`, `generarPdfDteAction`, stubs de compatibilidad para importadores XML |
| `dte-typedte.ts` | Servicio wrapper de typeDte (typedte-sii): construir documentos DTE, emitir con certificado .pfx y CAF, generar PDF (carta y ticket térmico 80mm con PDF417) |
| `defontana/client.ts` | Cliente HTTP del ERP Defontana (login, GraphQL de compras/ventas, descarga de XML) |
| `defontana/credentials.ts` | Credenciales por empresa (cifradas): `getStoredDefontanaCredentials`, `hasStoredDefontanaCredentials`, `withDefontanaSession` |
| `sii-client.ts` | Cliente para enviar DTE al SII y consultar estado por TrackID. Entorno configurable vía BD o `SII_ENVIRONMENT` |
| `sii/runtime.ts` | Integración SII por **@albertomarturelo/sii-core**: lecturas por fetch (sin Chromium), login headless con Playwright desde la web, sesión en `~/.sii/session.json` |
| `sii/rcv.ts` | Consultas RCV: `fetchRcvRows` (compras/ventas oficiales) + estado de sesión |
| `import.ts` | Importador Excel/CSV (ver §9) |
| `csv.ts` | Exportación CSV de reportes |
| `ui.ts` | Clases de botones con efecto líquido y `controlClass`/`labelClass`/`fieldClass` |

---

## 4. Modelo de datos (Prisma)

### Enums

- `Role`: `ADMIN` (todo dentro de la empresa), `ACCOUNTANT` (contabilidad), `SALES` (ventas y
  clientes), `VIEWER` (solo lectura).
- `PartnerType`: `CUSTOMER`, `SUPPLIER`, `BOTH`.
- `CategoryKind`: `EXPENSE`, `BOTH` (categoría usable en gastos y/o compras).
- `DocumentType`: `INVOICE` (factura), `RECEIPT` (boleta), `CREDIT_NOTE`, `DEBIT_NOTE`, `OTHER`.
- `PaymentStatus`: `PENDING`, `PARTIAL`, `PAID` (en compras = pagada; en ventas = cobrada).
  `PARTIAL` solo lo escribe el sistema, derivado de los abonos (ver §Pagos parciales).
- `PaymentMethod`: `CASH`, `TRANSFER`, `CREDIT_CARD`, `DEBIT_CARD` (enum fijo) — además existe
  `PaymentMethodCatalog` (catálogo editable por empresa, usado en compras).
- `NotificationType`: `PURCHASE_DUE`, `PURCHASE_OVERDUE`, `SALE_DUE`, `SALE_OVERDUE`.
- `AuditAction`: `CREATE`, `UPDATE`, `DELETE`.

### Tablas

- **User**: name, email único, passwordHash, active. Un usuario global del sistema.
- **Session**: tokenHash único, userId, expiresAt, createdAt. Solo se guarda el **hash** del token.
- **Company**: name, rut, address, city, email, phone, `ivaRate` (19), `retentionRate` (0),
  currency CLP. Borrado en cascada de todo lo suyo (solo ADMIN de esa empresa, nunca la activa).
- **Membership**: userId + companyId + `Role` + active. Único por (userId, companyId). Es la
  fuente de verdad de "qué empresas ve un usuario" y con qué rol.
- **Partner** (clientes y proveedores): companyId, type, name, rut (único por empresa), email,
  phone, address, notes, active. Se busca por RUT normalizado o nombre.
- **Category**: companyId, name, kind (`EXPENSE`/`BOTH`), active.
- **Area**: companyId, name. **Salesperson**: companyId, name. **Payer**: companyId, name
  (pagadores de gastos).
- **PaymentMethodCatalog**: companyId, name, active — medios de pago editables para compras.
- **Purchase**: companyId, date, **dueDate**, partnerId, categoryId?, areaId?, documentType,
  documentNumber, referenceDocumentNumber (NC/ND), description, netAmount, ivaAmount, totalAmount,
  status, paymentDate?, paymentMethod? (enum), notes; createdById.
- **Sale**: ídem compras más `salespersonId?`, `purchaseOrder`, `dispatchGuide`, `hesNumber`,
  `retentionAmount`. **Unique `(companyId, documentNumber)`** — es la protección anti-duplicados
  del importador XML (folio). `dueDate` para el flujo de caja.
- **Expense**: companyId, date, description, categoryId?, areaId?, documentNumber, net/iva/total,
  paymentMethod (enum), **reimbursed + reimbursedAt** (el reembolso al pagador), notes.
- **Notification**: companyId, type, title, message, **readAt?**, y referencias opcionales al
  documento. `syncDueNotifications` las recalcula en cada entrada al panel (puede recrear las de
  vencimiento; las "de prueba" desaparecen).
- **AuditLog**: companyId, userId, action, entityType, entityId, summary, changes (JSON con
  before/after en UPDATE), createdAt.
- **Payment** (abono): companyId, date, amount, method? (enum), notes?, **`purchaseId` XOR
  `saleId`** (exactamente uno), createdById. Es un pago real aplicado a un documento.

### Regla de signo de documentos

`documentSign(documentType)`: `CREDIT_NOTE` ⇒ **−1**, todo lo demás ⇒ **+1**. Todos los totales
del sistema (IVA, libros, panel, gráficos) multiplican por este signo, de modo que las notas de
crédito **descuentan** en vez de sumarse como positivas.

### Pagos parciales (abonos)

Un documento puede pagarse/cobrarse en partes. Cada parte es un **abono** (`Payment`) y el estado
se **deriva** de ellos, nunca se escribe a mano cuando existen abonos:

- sin abonos → `PENDING`;
- con abonos que no cubren el total → `PARTIAL`;
- al cubrir el total → `PAID` (y `paymentDate`/`paymentMethod` se toman del último abono).

El monto a cubrir es el `totalAmount` de la compra o, en una venta, el total **menos la
retención** (`saleSettleTotal`): lo retenido no se le cobra al cliente. Un abono no puede superar
el saldo, ni registrarse sobre un documento anulado o ya saldado, y solo se borra mientras el
documento no esté saldado (borrarlo recalcula el estado). Un documento con abonos administra el
pago desde su panel; los atajos "marcar pagada/cobrada" y "marcar pendiente" se ocultan (y el
`update` vuelve a recalcular el estado). El lote de estados de la lista tampoco toca documentos con
abonos. Los documentos pagados a la antigua (contador `PAID` sin abonos) siguen funcionando: su
saldo es 0.

`lib/payments.ts` concentra `listPayments`, `sumPayments`, `saleSettleTotal` y `recomputeStatus`;
`actions/payments.ts` expone `registerPayment`/`deletePayment`; la UI vive en
`components/payments-panel.tsx` (con `delete-payment-button.tsx`).

---

## 5. Autenticación, sesiones y multiempresa

### Sesiones opacas

- Token aleatorio de 32 bytes (base64url) en cookie `facturas_session` (httpOnly, sameSite lax,
  secure solo en producción); en BD solo su **hash SHA-256**.
- **"Recuérdame en este equipo"** (checkbox del login, marcado por defecto):
  - Marcado → cookie persistente con `expires` +90 días y BD +90 días. **Renovación automática**:
    en cada request, si a la sesión le quedan menos de 30 días, se extiende +90 (usuario activo
    nunca queda fuera).
  - Sin marcar → cookie **de sesión** (sin `expires`: muere al cerrar el navegador) y BD +7 días.
- `logout` borra la fila de Session y la cookie.

### Empresas activas y permisos

- `getCurrentUser` (cacheado por request) devuelve el usuario con sus memberships **activas**
  incluidas, cada una con la `company`.
- Cookie `facturas_company` guarda la empresa activa; `getActiveMembership` resuelve la membership
  de esa empresa (o la primera). Si no hay empresas → redirect a configuración.
- `requireContext(section?)`: exige sesión + empresa activa (+ acceso a la sección).
- **Matriz de permisos** (`lib/permissions.ts`):

  | Sección | Ver | Escribir |
  | --- | --- | --- |
  | panel | todos | — |
  | compras | ADMIN, ACCOUNTANT, VIEWER | ADMIN, ACCOUNTANT |
  | ventas | + SALES | ADMIN, ACCOUNTANT, SALES |
  | gastos | ADMIN, ACCOUNTANT, VIEWER | ADMIN, ACCOUNTANT |
  | clientes | + SALES | ADMIN, ACCOUNTANT, SALES |
  | proveedores | ADMIN, ACCOUNTANT, VIEWER | ADMIN, ACCOUNTANT |
  | catálogos / reportes / auditoría / importar | ADMIN, ACCOUNTANT | catálogos+importar: ídem; reportes/auditoría: nadie |
  | configuracion | ADMIN, ACCOUNTANT | ADMIN |

- **Alcance de usuarios al crear** (Configuración): el selector "Empresas visibles" permite
  *Solo esta empresa* o *Todas mis empresas* — en el segundo caso se crean memberships en todas
  las empresas donde el admin actual es ADMIN. En la empresa activa el rol elegido manda; en las
  otras no se pisan roles existentes.
- Protecciones de roles: no se puede quitar el último ADMIN de una empresa ni quitarse a sí mismo
  de la lista.
- **Crear empresa exige ser ADMIN de la empresa activa** (`createCompany` valida la membresía
  activa, no solo la sesión; el formulario se oculta a quien no lo sea). Antes bastaba con estar
  autenticado, así que cualquier rol podía crearse una empresa, quedar ADMIN en ella y ver datos
  fuera de su ámbito. Quien no pertenece a ninguna empresa ya no se crea una: pide que lo agreguen.

---

## 6. Server Actions (`src/app/actions/`)

| Archivo | Acciones |
| --- | --- |
| `auth.ts` | `login` (con remember), `logout` |
| `companies.ts` | `switchCompany`, `createCompany`, `updateCompany`, `addMember`, `createMember`, `updateMemberRole`, `removeMember`, `deleteCompany` (borrado en cascada con confirmación por nombre) |
| `defontana.ts` | `fetchPurchaseXmlAction` / `fetchSaleXmlAction` (trae el XML de un documento de Defontana desde la lista) |
| `modules.ts` | `switchModule` (cambia de módulo activo) |
| `purchases.ts` | CRUD + `markPurchasePaid`/`markPurchasePending` + `bulkSetPurchaseStatus` + `deletePurchase` |
| `sales.ts` | CRUD + `bulkSetSaleStatus` + `deleteSale` |
| `expenses.ts` | CRUD + toggle reembolso + delete |
| `partners.ts` | CRUD + `searchPartnersAction` (autocomplete) |
| `catalogs.ts` | CRUD de categorías/áreas/vendedores/pagadores/medios de pago |
| `import.ts` | `importFile` (Excel/CSV de compras, ventas o gastos) |
| `dte.ts` | `previewDteImport` + `confirmDteImport` (XML SII) |
| `payments.ts` | `registerPayment` / `deletePayment` (abonos de compras y ventas, con recálculo del estado) |
| `pos-sii-emit.ts` | `emitirDtePosSale` (emite DTE al SII para ventas POS), `reintentarDtePosSale` / `reintentarDteAction` (reintento individual), `reintentarDtesEnErrorAction` (reenvío masivo), `consultarEstadoDteAction` (consulta por TrackID), `anularDtePosSale` (nota de crédito tipo 61 al anular venta) |
| `notifications.ts` | Marcar leída / todas leídas |

**Reglas de seguridad (críticas)**: toda acción valida `requireContext` + `canWrite`/`isAdmin`
**dentro de la función** — nunca confiar en la UI, porque las Server Actions son alcanzables por
POST directo. El importador revalida folios y tipos en el servidor aunque la vista previa ya los
haya filtrado. `updateMemberRole`, `removeMember` y `deleteCompany` verifican membresía/rol
específico de la empresa activa.

---

## 7. Importación de planillas (Excel/CSV)

- Sección "Desde planilla" en `/facturas/importar`; elige compras/ventas/gastos, sube `.xlsx` o
  `.csv` (detección de separador `,` vs `;`, BOM tolerado).
- Columnas por encabezado difuso (`findColumn`): terceros por **nombre o RUT** (si no existe,
  la fila falla con mensaje; no se crean), fechas `AAAA-MM-DD` o `DD/MM/AAAA`, montos con
  separadores de miles tolerados, **el total se recalcula en el servidor** como neto + IVA.
- Filas con error se informan con su número; el resto se importa igual.
- Plantillas CSV descargables en `/facturas/importar/plantilla?tipo=…`.

---

## 8. Importación de XML DTE del SII (facturación electrónica)

### Qué acepta

`EnvioDTE` (el sobre estándar con `Carátula` y N documentos) o un `DTE`/`Documento` suelto.
Codificación **ISO-8859-1** (respetada según declaración; también UTF-8). Máx. 5 MB y 200
documentos por archivo. Ignora `TED` y `Signature` (no valida firmas).

### Tipos soportados

- **33** factura electrónica, **34** exenta → `INVOICE`
- **56** nota de débito → `DEBIT_NOTE`
- **61** nota de crédito → **se detecta pero se omite** (reportada en el resumen), por decisión
  del usuario; boletas (39/41) y guías (52) también se omiten con motivo visible.

### Mapeo XML → app

| XML | Destino |
| --- | --- |
| `IdDoc/Folio` | `documentNumber` (dedup por unique empresa+folio) |
| `IdDoc/FchEmis`, `FchVenc` | `date`, `dueDate` |
| `Receptor` (RUT, razón social) | Cliente existente (match por RUT normalizado o nombre) o **creado al vuelo** |
| `Receptor/DirRecep + CmnaRecep` | `Partner.address` (completa si estaba vacía, no pisa) |
| `Totales` (MntNeto, IVA, MntTotal) | `netAmount`, `ivaAmount`, `totalAmount` **sin recálculo** |
| `Referencia TpoDocRef=801` | `purchaseOrder` |
| `Referencia TpoDocRef=52` | `dispatchGuide` |
| `Detalle/NmbItem` | `description` (ítems unidos con "·") |
| `TermPagoGlosa` | `notes` (ej. "CREDITO 30 DIAS") |
| — | `status: PENDING` siempre; el pago se registra después en la app |

Guardia adicional: si `Company.rut` está configurado y el `RUTEmisor` del XML no coincide, el
documento se marca **error** (evita meter facturas de terceros en tus ventas).

### Sincronización con el RCV del SII (`@albertomarturelo/sii-core`)

Lectura de las facturas de **compra y venta** registradas oficialmente en el RCV del SII
(Importar → "Sincronizar con el SII"). **Solo lectura: la app jamás emite documentos.**

**Login desde la propia web** (diseñado para VPS Coolify/Ubuntu): en Importar, el admin
ingresa RUT + Clave Tributaria; la Clave viaja una sola vez por HTTPS a la Server Action,
se usa con el login headless del core (llena el formulario real del SII y la descarta con
el frame — ADR-010 de la librería) y **nunca se guarda ni se audita**. Solo queda el cookie
jar en `SII_HOME` (default `~/.sii`, **montar volumen en Coolify** para sobrevivir redeploys).
Límite propio: 3 intentos fallidos por usuario cada 5 min (el SII bloquea cuentas).
Arquitectura del runtime (`src/lib/sii/runtime.ts`): lecturas por **fetch puro** (driver
propio, sin Chromium); solo el login usa Playwright (lazy, subpath `/node`); store con el
mismo formato de la CLI (`~/.sii/session.json` — ambas conviven).

**Cuentas empresa**: el RCV se lee como RUT propio de la sesión; si la sesión es una persona
que representa empresas, se pasa el RUT de la activa como override (las cuentas empresa
rechazan overrides, incluso su propio RUT). Requiere el RUT de la empresa configurado.

Importa tipos 33/34 (facturas) y 56 (nota de débito) con los **montos oficiales del RCV**
(exento va al neto); NC (61), boletas y guías se omiten con motivo visible; dedup por folio;
terceros creados al vuelo (proveedor/cliente) con la guarda de RUT de trabajadores.

**Dockerfile (Coolify)**: `node:22-bookworm-slim` + pnpm + `playwright install --with-deps
chromium` (~500 MB). El entrypoint aplica `prisma migrate deploy` y el seed, y levanta `next start`
(las bases anteriores al baseline se basan una vez con `pnpm db:baseline`; ver §12.3). Montar volumen
en `/app/.sii`.

### Flujo de UI

1. Subir XML → **"Analizar XML"** (`previewDteImport`) → tabla de vista previa con badges:
   Nueva / Duplicada / Omitida / Error + resumen.
2. **"Importar N facturas"** (`confirmDteImport`) → crea clientes que falten + ventas; errores por
   folio reportados. Queda en auditoría.

### Traer XML de Defontana desde la lista de documentos

En Compras y Ventas, el menú de acciones (⋮) de cada fila incluye "Traer XML de Defontana".
Ejecuta `fetchPurchaseXmlAction` / `fetchSaleXmlAction` desde `src/app/actions/defontana.ts`:
valida que la empresa tenga credenciales de Defontana (`hasStoredDefontanaCredentials`),
busca el documento por folio + RUT del tercero en el Libro de Compras/Ventas de Defontana,
descarga el XML, guarda `xmlContent`, montos, ítems y stock, y registra auditoría. Si el
documento ya tiene XML, el ítem del menú dice "XML ya cargado". Si la empresa no tiene
credenciales, el botón dice "Configurar Defontana" y lleva a `/facturas/configuracion`.

### Emisión de DTE del POS al SII (Fase 1)

El punto de venta puede emitir documentos tributarios electrónicos (DTE) al SII
directamente desde cada venta. Requiere que la empresa tenga configurado el módulo
SII en `/pos/sii` (certificado digital .pfx, resolución SII, acteco y al menos un
CAF con folios disponibles).

**Flujo de emisión automática:**
1. Al completar una venta POS (`createPosSale`), si SII está habilitado, se dispara
   automáticamente `emitirDtePosSale`.
2. El sistema determina el tipo de DTE: **boleta (39)** para consumidor final, o
   **factura (33)** si el cliente tiene RUT distinto de consumidor final.
3. Obtiene un folio disponible del CAF correspondiente (tipo 33 o 39) con protección
   contra condiciones de carrera (bucle de reintentos + actualización condicional).
4. Genera el XML DTE con **typeDte** (`dte-typedte.ts`), lo firma con el
   certificado .pfx de la empresa y lo guarda en `PosDte`.
5. Genera el **PDF** (tamaño carta o ticket térmico 80mm con código PDF417)
   usando `typeDte/pdf`.
6. Vincula el `PosDte` con la `PosSale` para que el ticket muestre el folio real.
7. Incrementa `folioActual` del CAF solo si el SII aceptó el documento.

**Entorno SII:** configurable desde la UI en `/pos/sii` (selector "Entorno del SII"):
`pruebas` (`maullin.sii.cl`) por defecto, o `produccion` (`palena.sii.cl`).
Se guarda en la tabla `PosSiiConfig` (campo `siiEnvironment`) y se puede cambiar
en cualquier momento sin editar variables de entorno ni reiniciar el servidor.
Como fallback, se lee de la variable de entorno `SII_ENVIRONMENT` del servidor.

**Desde el ticket de venta** (`/pos/ventas/[id]`):
- Si el DTE está **EMITIDO**: muestra "Factura Electrónica N° XXX" o
  "Boleta Electrónica N° XXX" con el folio real y el TrackID. Incluye botón para
  descargar el PDF generado por typeDte (carta o ticket térmico).
- Si está **RECHAZADO** o **ERROR_ENVIO**: muestra el error y un botón
  "Reintentar envío al SII" para volver a intentar la emisión individual.
- Si no hay DTE: indica que el documento es interno de control (SII no habilitado).

**Generación de PDF:** Desde cualquier venta con DTE asociado, se puede descargar
el PDF en formato carta o ticket térmico, con el timbre PDF417 del SII.

**Reenvío masivo** (`/pos/sii`): lista todos los DTE en error/rechazados de la
empresa y permite reenviarlos en lote con `reintentarDtesEnErrorAction`.

**Anulación de DTE:** cuando se anula una venta POS que tiene un DTE EMITIDO,
`voidPosSale` prepara automáticamente una **nota de crédito tipo 61** (`PosDte`
con estado `PENDIENTE_ENVIO`) vinculada a la venta original, consumiendo un folio
del CAF de tipo 61. El envío real al SII se puede hacer después cuando se disponga
del certificado.

**Consulta manual de estado** (`consultarEstadoDteAction`): permite consultar el
estado de un DTE en el SII por su TrackID y actualizar el registro local.

**PDF de venta y compra (diseño typeDte):**
- `/facturas/ventas/[id]/pdf`: descarga el PDF en formato carta con el diseño
  oficial de typeDte (emisor, receptor, ítems, totales, timbre PDF417). El tipo
  de documento es boleta (39) para consumidor final o factura (33) si tiene RUT.
- `/facturas/compras/[id]/pdf`: descarga el PDF en formato carta con el mismo
  diseño, para compras registradas como factura de compra (tipo 46).

**DTE de Factura de Compra (tipo 46) — `emitirDteCompraAction`:**
Cuando un proveedor no emite factura electrónica, la empresa puede autofacturar
la compra emitiendo un DTE tipo 46 (`Factura de Compra Electrónica`). El emisor
es la empresa y el receptor es el proveedor. Se guarda un `PosDte` vinculado a
la `Purchase` (campo `purchaseId`) y se consume un folio del CAF de tipo 46.
Disponible desde la acción de compra en el detalle de la compra.

---

## 9. Reportes

| Reporte | Ruta | Contenido |
| --- | --- | --- |
| Resumen | `/facturas/reportes` | IVA débito/crédito/resultado, retenciones, estado de pagos |
| **Flujo de caja** | `reportes/caja` | Pendientes agrupados por vencimiento: Vencido / mes actual / +1 / +2 / más adelante; entradas (ventas por cobrar), salidas (compras por pagar), neto; fila vencida destacada |
| IVA mensual | `reportes/iva` | Preparación F29 del período con selector de mes (export CSV) |
| Libro de compras/ventas | `reportes/libro-*` | Detalle por documento con totales (export CSV) |
| Pagos y deudas | `reportes/pagos` | Pagado vs adeudado, listados de pendientes, reembolsos por pagador (export CSV) |
| Gastos por área | `reportes/gastos` | Desglose por categoría y área |

**Períodos**: `AAAA-MM`; navegación ← mes → + "Hoy". `monthRange` devuelve UTC `[from, to)`;
`currentPeriod`/`todayISO` usan `America/Santiago`. El panel agrega **gráficos propios**
(`components/charts.tsx`): `MonthlyBarsChart` (12 meses × ventas/compras/gastos, SVG sin JS) y
`RankBars` (top clientes y gastos por categoría).

---

## 10. Sistema de diseño y componentes

Leer **`DESIGN.md`** antes de tocar UI. Puntos clave:

- **Paleta azulada** (nunca verde/teal): `primary #1B5FA8` (claro) / `#4A9FD8` (oscuro), acento
  ámbar para pendientes, success/danger para estados. Tokens semánticos en `globals.css`
  (`@theme inline`): `bg-surface`, `bg-background`, `text-foreground`, `text-muted-foreground`,
  `border-border`, `bg-primary`, `bg-primary-soft`, `bg-accent`, `bg-success-soft`, `bg-danger`…
  **Nunca colores crudos**.
- **Dark mode**: clase `dark` en `<html>`, aplicada antes de pintar con script inline
  (`theme-initializer`) y alternada con `theme-toggle` (sol/luna con animación de rotación).
  Verificar **ambos** temas siempre (R-34).
- **Botones con efecto líquido**: `btn-liquid btn-liquid-primary|secondary|danger` (`lib/ui.ts` +
  CSS en globals) — relleno desde abajo al hover en todos los botones de la app.
- **Números tabulares**: clase `.tabular` en montos, folios y fechas de tablas.
- **Estado con texto+color** (badges): `PurchaseStatusBadge`, `SaleStatusBadge`
  (Pendiente de pago/Pago parcial/Pagada, Por cobrar/Parcial/Cobrada), `ReimbursementBadge` (gastos).
- Superficies planas; sombras solo en overlays/dropdowns.

### Componentes reutilizables (`src/components/`)

| Componente | Uso |
| --- | --- |
| `sidebar.tsx` | Navegación con buscador filtrante, grupos colapsables (chevron en el título) y sub-árbol bajo Reportes; badge de facturas por cobrar solo en Ventas; drawer móvil; **menú de usuario** (iniciales + nombre + rol) con Salir |
| `company-switcher.tsx` | Selector de empresa (top-right) con patrón dropdown; llama `switchCompany` de forma **imperativa** (`useTransition`) |
| `module-switcher.tsx` | Dropdown de módulos (⋮) para cambiar entre módulos activos; aparece solo si hay más de uno. Vive en los headers de Facturas, POS, Colegios y Billing |
| `select-dropdown.tsx` | Reemplaza todos los `<select>` nativos: trigger + menú con check en el activo; soporta modo controlado (`onValueChange`), `allowEmpty`, valor en input oculto (sirve en forms GET y de server actions) |
| `actions-dropdown.tsx` | Menú (⋮) Editar/Eliminar; en Compras y Ventas incluye "Traer XML de Defontana" (o "Configurar Defontana" si la empresa no tiene credenciales); posicionamiento **fixed** (tablas con scroll horizontal) con clamp al viewport; delete con confirm + acción imperativa |
| `date-range-filter.tsx` / `period-picker.tsx` | Calendarios react-day-picker v9 en popovers `right-0` |
| `autocomplete-partner.tsx` | Búsqueda de cliente/proveedor por RUT/nombre vía Server Action; muestra el nombre inicial en edición |
| `bulk-select.tsx` | "Seleccionar todas" + contador para acciones masivas |
| `charts.tsx` | `MonthlyBarsChart` (SVG) y `RankBars` |
| `toaster-flash.tsx` | Toasts (sonner) + consumo del mensaje flash de las acciones |
| `alert.tsx` | Alertas info/warning/destructive/success |
| `payments-panel.tsx` | Abonos de una compra o venta: historial, saldo y formulario de registro |
| `breadcrumb.tsx`, `submit-button.tsx`, `confirm-submit.tsx`, `partner-form/list.tsx`, badges | Soporte general |

**Patrón de dropdowns (unificado)**: trigger de contorno + chevron doble; menú `w-56 rounded-card
border bg-surface p-1 shadow-lg` con label opcional, ítems `gap-3`, check azul en el activo,
separador antes de acciones destructivas; cierre por Escape/click afuera/scroll/resize. Cualquier
dropdown nuevo debe seguirlo.

---

## 11. Convenciones

- **Idioma**: todo en español (UI, mensajes, auditoría). Comentarios de código también.
- **Moneda**: enteros CLP sin decimales; `formatCLP` con separador de miles es-CL.
- **Fechas**: almacenamiento UTC (`Date.UTC(año, mes, 1)` en rangos; `toDateOnly`), hora local
  Chile solo para "hoy" (`todayISO`). Formato visual `dd-MM-aaaa`.
- **Firmas**: notas de crédito siempre con signo −1 vía `documentSign`.
- **Server Components por defecto**; `"use client"` solo para interacción.
- **Rutas tipadas**: `PageProps<"/ruta">` y `LayoutProps<"/ruta">` generados por `next typegen`;
  `params`/`searchParams` son promesas en Next 16.
- **No hay `middleware` ni `proxy`**: Next 16 renombró `middleware` a `proxy`, pero este repo no
  tiene ninguno. La sesión y el rol se validan en cada página (`requireContext(section)`) y dentro
  de cada Server Action. Si se agrega, va en `src/proxy.ts`, runtime Node (nunca edge).
- ESLint directo (`pnpm lint`); warning conocido y aceptado en `period-picker.tsx`
  (`window.location.href`, decisión deliberada para evitar hooks de navegación y Suspense).
- **Impresión**: toda vista imprimible pasa por `window.print()`, y lo que no debe salir en papel
  se marca con la clase `.no-print` (barra de acción de `/facturas/ventas/[id]/print`, botones de
  imprimir, banners). La regla global `@media print { .no-print, [data-sonner-toaster] { display:
  none } }` vive en `globals.css` — antes solo existía en línea en la liquidación de RRHH, y por eso
  se imprimía la página entera. El chrome de cada shell (sidebar y barra superior de Facturas,
  encabezados de Colegios/Billing, header del POS) lleva `print:hidden` de Tailwind y el `<main>`
  `print:p-0`, así que cada layout imprime solo su contenido. Si agregas una vista imprimible dentro
  de un layout, repite ese patrón.
- Antes de construir UI nueva: resolver dirección en `DESIGN.md` (R-37 de antislop).
- **Error React #441 (hidratación)**: no renderices fechas con `new Date().toLocaleString()` ni
  funciones que dependan de la zona horaria del entorno en Server Components: el servidor y el
  cliente pueden discrepar y React aborta la hidratación. Usa un componente cliente con `useEffect`
  que calcule la fecha tras la hidratación (ver `src/components/formatted-date.tsx`). Lo mismo aplica
  a cualquier listener de evento adjuntado directamente en el JSX (`onClick` en elementos del
  servidor): adjúntalo en `useEffect` post-hidratación o usa un `<button type="button">` con un
  form/Server Action en su lugar.

---

## 12. Gotchas críticos (leer antes de debuguear)

1. **Prisma 7 exige driver adapter**: `new PrismaClient()` a secas no conecta. El singleton en
   `lib/db.ts` usa `PrismaPg`. Regenerar el client tras cambiar el schema: `pnpm db:migrate` +
   `pnpm db:generate`.
2. **CLI de Prisma en Windows + TLS**: el motor CLI usa schannel (TLS ≤ 1.2) y falla contra el
   certificado ECDSA de Coolify (`P1011 … os error -2146893018`). Por eso la CLI sale por
   `scripts/prisma-run.mjs`, que en Windows levanta el **puente TLS local** (`127.0.0.1:15433`,
   `sslmode=disable`; verifica la CA de `certs/`, ignorado por git) y en Linux llama a la CLI
   directo. **La app en runtime no lo necesita** (usa `pg`/OpenSSL directo).
3. **Migraciones: baseline `0_init`** (resuelto en oct-2026; antes esto era el gotcha nº1). El
   historial viejo solo creaba 15 de las 40 tablas —el resto lo aplicó `db push`—, así que una base
   nueva no se podía reconstruir y `migrate deploy` era imposible: el contenedor sincronizaba con
   `prisma db push` y, como último recurso, `--force-reset` (podía borrar la base en un redeploy).
   Ahora `prisma/migrations/0_init/migration.sql` reproduce el schema completo (verificado con
   `migrate diff --from-empty` + `pnpm db:drift`), y las bases que ya existían se pasan **una vez**
   por `pnpm db:baseline --si`, que borra las filas viejas de `_prisma_migrations` y marca `0_init`
   como aplicada sin ejecutar SQL de schema. El entrypoint corre `pnpm db:deploy`: si el historial
   no cuadra, **falla a propósito** en vez de resetear. Tras cualquier cambio de schema, `pnpm
   db:drift` debe salir 0.
4. **Turbopack cachea**: tras regenerar Prisma Client o crear archivos nuevos, el dev server puede
   quedar con bundles viejos (síntomas: "X is not defined"). Solución: parar dev, **borrar
   `.next`** y reiniciar.
5. **`pnpm build` sobrescribe el `.next` del dev server**: tras un build, reiniciar dev.
6. **Al cambiar `globals.css`** a veces hace falta reinicio completo del dev para ver los cambios
   de variables.
7. **Server Actions = POST directo**: validar auth/rol dentro de cada acción (hecho; mantenerlo).
8. **Cache Components desactivado a propósito** en `next.config.ts`; si se activa, todo
   `cookies()`/`headers()` debe ir dentro de `<Suspense>`.
9. **Dropdowns dentro de tablas con scroll horizontal**: usar posicionamiento fixed anclado al
   botón (como `ActionsDropdown`), no `absolute` (queda recortado).
10. **No desmontar un `<form>` en el mismo click que lo envía**: puede cancelar la Server Action.
    Para casos sensibles se llama la acción de forma imperativa (`startTransition`) — ver
    `company-switcher` y el delete de `actions-dropdown`.
11. **`syncDueNotifications` recalcula alertas** en cada load del layout: las notificaciones
    manuales/de prueba de vencimiento pueden ser recreadas o eliminadas.
12. **pnpm 12**: los build scripts se permiten en `pnpm-workspace.yaml` (`allowBuilds`); el campo
    `pnpm` de `package.json` ya no se lee.
13. **El estado de un documento con abonos es derivado**: no escribirlo a mano (lo pisa el próximo
    `recomputeStatus`). Los atajos de pagado/pendiente y el lote de la lista están bloqueados para
    documentos con abonos; el camino es siempre `lib/payments.ts`.

---

## 13. Estado actual y pendientes

### Funcional y probado

- CRUD completo de compras/ventas/gastos/clientes/proveedores/catálogos con filtros (búsqueda,
  selects patrón dropdown, rango de fechas con calendario), badges, KPIs y acciones masivas.
- **Clientes y Proveedores**: buscador por nombre o RUT, filtro de estado (Activos / Inactivos /
  Todos) y paginación en ambas listas.
- **Abonos**: pagos/cobros parciales en compras y ventas con saldo pendiente y estado derivado
  (`Pendiente` / `Pago parcial` / `Pagada`), verificados en vivo (registrar, saldar, eliminar).
- **XML de Defontana desde la lista**: en Compras y Ventas, el menú de acciones trae el XML de
  Defontana sin entrar al detalle; si la empresa no tiene credenciales, lleva a Configuración.
- Multiempresa completa (crear/cambiar/editar/borrar empresa con confirmación, usuarios con
  alcance de empresas y roles).
- Importador Excel/CSV y **importador XML DTE del SII** probado con un EnvioDTE real
  (factura 33 → venta con OC, guía, vencimiento y cliente auto-creado; duplicados detectados).
- Reportes con export CSV; flujo de caja proyectado; panel con gráficos propios.
- Login split-screen con Recuérdame persistente (90 días + renovación automática).
- Auditoría y notificaciones de vencimiento.
- **Selector de módulos**: ModuleSwitcher en los headers de Facturas, Punto de Venta, Colegios
  y Facturación SaaS; aparece cuando el usuario tiene más de un módulo activo.
- **Facturación SaaS (Billing)**: layout propio con header, ModuleSwitcher y navegación común.
- **Emisión de DTE del POS al SII**: en Compras y Ventas del POS, cada venta puede emitir
  su DTE (boleta 39 o factura 33) al SII con certificado digital, CAF y folio real. El
  ticket muestra el estado del DTE y permite reintentar el envío si falló.
- **Emisión DTE con typeDte (Fase 1 completa)**:
  - Librería `typedte-sii` integrada para los 12 tipos de DTE del SII chileno.
  - Generación de XML DTE tipo 33/39 y firma con certificado .pfx (XML-DSIG RSA-SHA256).
  - Envío al SII y registro de PosDte con estado (EMITIDO/RECHAZADO/ERROR_ENVIO/PENDIENTE_ENVIO).
  - Protección contra condiciones de carrera en CAF (reintentos + actualización condicional).
  - Reenvío masivo de DTEs en error desde `/pos/sii`.
  - Generación de PDF (carta y ticket térmico 80mm con código PDF417) desde cualquier venta con DTE.
  - Descarga del PDF desde el ticket de venta.
  - Anulación con nota de crédito tipo 61 preparada al anular venta con DTE EMITIDO.
  - Consulta manual de estado por TrackID (`consultarEstadoDteAction`).
  - Entorno SII configurable desde la UI en `/pos/sii` (pruebas/produccion).

### Pendientes / ideas

- **Deploy**: VPS Ubuntu + Coolify (build `pnpm build`, release `pnpm db:deploy`, variables
  `DATABASE_URL` + `ADMIN_*`). Pendiente: decidir cuál de las dos bases del VPS es la de producción
  (la del `.env`, 5433, ya quedó baseada en `0_init`; la 5432 hay que basearla antes del próximo
  deploy o el contenedor no arranca, a propósito).
- **Pagos parciales (abonos)**: implementados. El saldo de un documento es su total (en ventas,
  menos la retención) menos la suma de sus abonos; de ahí se deriva `PENDING`/`PARTIAL`/`PAID`.
  Los abonos viven en la tabla `Payment` y se administran en el detalle de compras y ventas.
- **POS DTE - requiere certificado SII real**: validación real contra el SII (maullin.sii.cl pruebas /
  palena.sii.cl producción), consulta automática de estado (reintento programado), reenvío automático
  de DTEs en ERROR_ENVIO.
- **POS Fase 2 (implementada)**:
  - Modelo `PosTerminal` + `terminalId` en `PosSession` (migración `20261104000000_pos_terminal`).
  - UI de gestión de terminales en `/pos/terminales` (crear, editar, desactivar).
  - Selector de terminal al abrir caja en `/pos/caja`.
  - `requirePosSupervisor` (ADMIN/ACCOUNTANT) protege `closePosSession`, `voidPosSale`,
    `createPosReturn`, `adjustPosStock`; `requirePosWrite` se mantiene en `createPosSale`,
    `createPosPartner`, `openPosSession`, `createPosProduct`, `updatePosProduct`.
  - Página `/pos/reportes`: ventas por período, producto, cajero y medio de pago, con
    tarjetas de totales y filtros por fecha y búsqueda.
  - Export CSV en `/pos/ventas/export` (mismos filtros que reportes).
  - **Stock por bodega**: `warehouseId` en `PosSession`, selector al abrir caja,
    movimientos de stock usan la bodega de la caja (migración
    `20261105000000_pos_warehouse_credit`).
  - **Venta a crédito / cuenta corriente**: `amountPaid`, `balanceDue`,
    `creditDueDate` en `PosSale`; estado `PENDING` en el enum `PosSaleStatus`.
    Abonos a ventas con saldo pendiente (`recordPosCreditPayment`,
    `recordPosCreditPaymentFormAction`), solo supervisor.
  - **Página `/pos/credito`**: lista de ventas con saldo pendiente y total
    por cobrar.
  - **Historial de compras del cliente** en el detalle de venta POS
    (consulta a tabla `Sale` de Facturas).
  - **Alertas de stock mínimo** en catálogo de productos POS (columna "Mín.",
    badge "Stock bajo" cuando stock ≤ minStock).
  - Historial de cajas muestra terminal y bodega de cada turno.
  - **DTE PDF tipo carta (diseño typeDte)**:
    - `/facturas/ventas/[id]/pdf`: PDF carta con diseño typeDte (PDF417 timbre,
      totales, emisor/receptor) para ventas (tipo 33/39).
    - `/facturas/compras/[id]/pdf`: PDF carta con el mismo diseño para compras.
  - **DTE tipo 46 (Factura de Compra) — `emitirDteCompraAction`**: autofactura de
    compras cuando el proveedor no emite electrónica. Emisor = empresa, receptor =
    proveedor. Guarda `PosDte` con `purchaseId`, consume folio del CAF tipo 46.
    Migración `20261106000000_pos_dte_purchase`.
  - **Transferencia de stock entre bodegas — `transferPosStock`**: mueve stock de
    una bodega a otra desde el catálogo de productos (solo supervisor). Usa
    movimiento TRANSFER que conserva el costo promedio (PPP).
  - **Filtro de terminal en historial de cajas** (`/pos/caja`): el listado de
    cajas se puede filtrar por terminal para ver cortes independientes.
  - **Abonos directos desde cuenta corriente** (`/pos/credito`): cada fila de
    venta pendiente tiene un form inline para registrar un abono sin entrar al
    detalle de la venta.
  - **Alerta de stock bajo en catálogo** (`/pos/productos`): banner superior con
    conteo de productos sin stock y con stock bajo el mínimo.
  - **Modo offline del POS**:
    - IndexedDB para almacenar ventas pendientes sin conexión
    - Hook `useOfflineSales` para detectar estado de conexión y sincronizar automáticamente
    - Indicador `ConnectionStatus` en el nav del POS con contador de pendientes
    - Página `/pos/sincronizar` para listar, sincronizar y eliminar ventas pendientes
    - Service Worker (`public/sw.js`) para cachear assets del POS
    - Al abrir una venta sin conexión, se guarda localmente y se sincroniza al recuperar internet
- **POS Fase 2+ (pendiente)**:
  - Notificaciones push/email para alertas de stock mínimo (ahora solo hay banner
    visual en el catálogo).
  - Cortes de caja totalmente independientes por terminal (las sesiones siguen
    siendo por usuario; el historial filtra por terminal pero no restringe por
    usuario).
- **POS Fase 3 (en progreso)**:
  - ✅ Modo offline con sincronización al volver (implementado)
  - Integración con terminales de pago (TPV) - Transbank/Webpay
  - Generación de etiquetas de código de barras para productos
  - API para e-commerce (productos, stock, pedidos)
  - Pantalla de cocina (KDS) para restaurantes
- **XML de compras**: reutilizar el parser para DTEs recibidos de proveedores (emisor = proveedor).
- Adjuntar XML/PDF a cada documento (requiere almacenamiento de archivos).
- OAuth (Google/Microsoft) y recuperación de contraseña (requiere servicio de email) — hoy el
  login no muestra esos botones/enlaces a propósito.
- F29 preliminar en formato de declaración; boletas de honorarios fin de flujo.
- Tests automatizados (no hay ninguno aún).

---

*Última actualización: 2026-10-27.*