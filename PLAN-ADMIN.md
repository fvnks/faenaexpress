# Plan: panel de administración universal de usuarios

> Pedido del dueño (textual): *«recomiéndame cómo podríamos manejar los usuarios de forma más
> universal, tal vez hacer un panel de administración para manejar todos los usuarios, asignar
> módulos, crear planes, etc. Dame un plan.»*

Este documento **no reemplaza** a `PLAN-SAAS.md`: lo complementa. Aquí se resuelve **quién administra
a quién** (los usuarios, los módulos y los planes). El plan anterior resolvía **cómo se aísla y cómo
se cobra**; este resuelve **desde dónde se opera todo eso**.

Fecha: 19-10-2026. Estado del repo: `main` con la capa `Organization`/`OrgMember` ya creada (F0/F1
cerradas), invitaciones por enlace (F2) y shell de módulos (F4) ya desplegados.

---

## 0. Resumen ejecutivo (qué recomiendo)

1. **Tres niveles de administración, no uno.** El error más común es hacer «un panel que maneja todo»:
   termina siendo un panel que no sirve ni para el dueño de la pyme ni para ti.
   - **Nivel 1 — Configuración de la organización** (ya existe, se ordena): el OWNER ve y administra
     **sus** empresas y **sus** usuarios.
   - **Nivel 2 — Consola de operador** (`/admin`, nueva, solo para ti): clientes, planes, límites,
     uso, incidencias. **No entra ningún usuario de cliente.**
   - **Nivel 3 — Contexto de empresa** (ya existe): rol por empresa, inventario, secciones.
2. **Una sola identidad, muchas pertenencias** (ya es así y está bien): `User` + `Membership`
   (por empresa, con rol) + `OrgMember` (organización, con permiso multiempresa). El panel es una
   **vista** de esas tablas, no un modelo nuevo.
3. **Los módulos se asignan por organización, no por usuario.** «Asignar módulos» se implementa con
   `Organization.enabledModules` (o `planId → Plan.modules`); el usuario ve los módulos que su
   organización tiene contratados **y** a los que su rol da acceso. Nunca una lista de módulos por
   usuario: eso no se puede explicar ni auditar.
4. **Los planes llegan con dos conceptos separados**: `Plan` (el catálogo: qué incluye, cuánto
   cuesta) y `Subscription` (lo que esa organización tiene contratado, con estado y período). El
   **enforcement** de los límites va en las Server Actions, nunca solo en la UI.
5. **Orden de trabajo**: cerrar los huecos de administración **antes** de abrir la consola
   (hoy `createCompany` es la puerta ancha), después la consola de operador, después módulos por
   organización, y los planes al final (cuando exista cobro real). Son 4 fases: A → B → C → D.

---

## 1. Qué hay hoy (auditoría real)

| Pieza | Estado actual | Archivo |
| --- | --- | --- |
| Identidad | `User` (email único global, `active`, `mustChangePassword`) | `prisma/schema.prisma:107` |
| Rol por empresa | `Membership(userId, companyId, role, inventoryAccess, active)` + `@@unique` | `prisma/schema.prisma:141` |
| Organización | `Organization` + `OrgMember(orgRole, canSwitchCompanies, active)` | `prisma/schema.prisma:30`,`:45` |
| Módulos | `enabledModules(userId)` **devuelve todos**; el comentario ya anticipa que leerá el plan | `src/lib/modules.ts:56` |
| Permisos | Matriz estática rol → sección, ver y escribir | `src/lib/permissions.ts` |
| Gestión de usuarios | «Usuarios de {empresa}» + «Organización» dentro de **Configuración**, en la misma pantalla que el IVA y las credenciales del SII | `src/app/facturas/configuracion/page.tsx` |
| Alta de usuarios | `addMember` (correo existente), `createMember` (cuenta nueva con contraseña), invitación por enlace | `src/app/actions/companies.ts:168`,`:220`, `invitations.ts` |
| Alta de empresas | `createCompany`: **solo ADMIN de la empresa activa**, hereda `organizationId` | `src/app/actions/companies.ts:71` |
| Permiso multiempresa | `toggleCanSwitchCompanies`: lo puede alternar un ADMIN de la empresa activa | `src/app/actions/companies.ts:422` |
| Consola de operador | **No existe**. Tampoco existe un rol de plataforma | — |
| Planes / uso / límites | **No existen** (ni `Plan`, ni `Subscription`, ni `UsageRecord`) | — |
| Auditoría | `AuditLog` por empresa, con `recordAudit(ctx, …)` | `src/lib/audit.ts` |
| Sesión | Token opaco (hash en BD), cookie `facturas_session` | `src/lib/session.ts` |

**Conclusión de la auditoría:** el *modelo* de usuarios ya está bien (identidad + pertenencias). Lo
que falta es (a) una **superficie** ordenada para administrarlos, (b) un **nivel de operador** que hoy
no existe —hoy tú entras a la Configuración de *un cliente* para ayudarlo—, y (c) el **catálogo de
planes** y límites.

---

## 2. Los tres niveles (el corazón del plan)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ NIVEL 2 · Consola de operador  /admin          (solo tú, Yellow ERP)     │
│   Clientes (organizaciones) · Planes · Uso · Incidencias · Impersonar    │
│   Regla dura: sin sesión de plataforma no se entra; no la ve un cliente   │
└───────────────────────────┬──────────────────────────────────────────────┘
                            │ administra
┌───────────────────────────▼──────────────────────────────────────────────┐
│ NIVEL 1 · Organización  /facturas/configuracion/organizacion             │
│   Empresas del grupo · Miembros y permisos · Módulos · Facturación       │
│   Quién entra: OWNER / ADMIN de la organización                          │
└───────────────────────────┬──────────────────────────────────────────────┘
                            │ el rol se aplica dentro de
┌───────────────────────────▼──────────────────────────────────────────────┐
│ NIVEL 3 · Empresa (lo que ya existe)  /facturas/*                        │
│   Rol por empresa (ADMIN/ACCOUNTANT/SALES/VIEWER) · Inventario · Datos   │
└──────────────────────────────────────────────────────────────────────────┘
```

### 2.1 Nivel 1 — Organización (ordenar lo que ya existe)

Hoy la pantalla de Configuración mezcla tres cosas: datos fiscales de la empresa, credenciales de
servicios y administración de usuarios. Con un solo cliente se sostiene; con diez, no. Se separa en
dos pantallas:

- `/facturas/configuracion` → **la empresa activa**: datos fiscales, IVA, retenciones, SII, Defontana,
  alertas, exportar datos. (Lo que hay hoy, sin la parte de usuarios.)
- `/facturas/configuracion/organizacion` → **la cuenta**: empresas del grupo, miembros (con sus
  roles y el permiso «revisar empresas»), invitaciones pendientes, y más adelante módulos y plan.

Es una **mudanza de UI**, no un cambio de datos: todo lo que hace falta ya está en las tablas.

**Regla que falta implementar:** hoy `toggleCanSwitchCompanies` lo puede hacer cualquier ADMIN de la
empresa activa. Debe hacerlo **el OWNER de la organización** (así se decidió en `PLAN-SAAS.md`) y
quedar en auditoría de organización.

### 2.2 Nivel 2 — Consola de operador (`/admin`)

Es la pieza nueva del pedido. No es «un panel de usuarios»: es **tu mesa de trabajo como proveedor**.

| Pantalla | Qué resuelve |
| --- | --- |
| `/admin` | Tablero: organizaciones activas, altas del mes, uso contra límites, cobros pendientes, errores recientes |
| `/admin/organizaciones` | Listado con buscador: nombre, RUT, plan, estado, nº de empresas y usuarios, último acceso |
| `/admin/organizaciones/[id]` | Ficha: empresas, miembros (con rol y permiso), suscripción, uso del mes, historial de auditoría de plataforma, acciones (suspender, cambiar plan, crear invitación) |
| `/admin/planes` | Catálogo de planes: nombre, precio CLP, límites, módulos incluidos, activo/inactivo |
| `/admin/usuarios` | Búsqueda global de usuarios (soporte: «no me llega el correo», «quedó bloqueado») |
| `/admin/incidencias` | Lo que hoy vive en el chat: sync bancario caído, Defontana rechazando token, migración a medias |

**Cómo se protege (esto es lo crítico).** Un solo booleano en el `User` no basta, porque un error de
configuración expone a todos los clientes. Tres capas:

1. `PlatformStaff(userId, level)` en la BD — **no** un flag en el código ni una variable de entorno.
   `level`: `SUPPORT` (lee) / `OPERATOR` (actúa) / `OWNER` (todo).
2. `requireStaff(level)` en cada página y **en cada Server Action** de `/admin`.
3. Un `layout` de `/admin` que corta antes de renderizar, y el `proxy` de sesión (cuando exista) que
   ni siquiera deja entrar a quien no es staff.

**Impersonar («entrar como») es lo más delicado del panel.** Es la herramienta que más se usa en
soporte y la que más se puede abusar. Diseño:

- Sesión **separada** (`Session.impersonatedByStaffId` + `Session.organizationId` del cliente), no un
  cambio de cookie silencioso.
- **Banner permanente** en toda la app mientras dura, con salida a un clic.
- Tope duro de tiempo (30 min) y **prohibido** en acciones destructivas (borrar empresa, exportar
  datos, cambiar contraseñas, ver RRHH/remuneraciones).
- Cada apertura y cierre queda en auditoría de plataforma, y el dueño del cliente puede ver ese
  registro («quién entró a mi cuenta y cuándo»).

Alternativa si quieres partir más conservador: **Fase B sin impersonar**; el soporte se hace pidiendo
una captura al cliente. Lo agrego como fase propia (B2) para que la decisión sea explícita.

### 2.3 Nivel 3 — Empresa (se queda como está)

El rol por empresa (`ADMIN`, `ACCOUNTANT`, `SALES`, `VIEWER`) y `inventoryAccess` funcionan y son la
unidad correcta. Lo único que cambia: la UI para gestionarlos se mueve del Nivel 1 (Organización) y
deja de estar escondida entre el IVA y las credenciales.

---

## 3. «Asignar módulos»: por organización, no por usuario

Hoy `enabledModules(userId)` (`src/lib/modules.ts:56`) devuelve todo y ya tiene el comentario que
anticipa el cambio. La implementación correcta son **dos filtros en serie**:

```
módulos que ve el usuario =
    módulos habilitados para su organización   (contratados / del plan)
  ∩ secciones a las que su rol da acceso       (src/lib/permissions.ts)
```

- **Habilitación por organización** (una tabla o un campo): `Organization.enabledModules String[]` para
  el caso simple, o `Plan.modules` cuando existan planes. Para una organización puede haber *override*
  manual (le vendiste RRHH suelto): por eso conviene la tabla `OrganizationModule(organizationId,
  moduleCode, enabledFrom, enabledTo, source)` en vez de un array — deja historial y permite módulos
  sueltos fuera del plan.
- **La sección sigue mandando:** si RRHH está habilitado pero el usuario es `SALES`, no ve RRHH. Las
  dos reglas se aplican, no se reemplazan.
- **Auditoría obligatoria** al habilitar/deshabilitar un módulo: es un cambio comercial, no un ajuste.
- Consecuencia en la UI: el sidebar y `/modulos` se generan del resultado de esta función; ya lo hacen,
  solo cambia la fuente.

---

## 4. Usuarios: el modelo que recomiendo sostener

El modelo actual es correcto y **no hay que reinventarlo**. Se explicita para que el panel lo respete:

| Pregunta | Dónde se responde |
| --- | --- |
| ¿Quién es la persona? | `User` (una identidad, un correo único) |
| ¿A qué cuenta pertenece? | `OrgMember` (organización, `orgRole`, `canSwitchCompanies`) |
| ¿Qué puede hacer en cada empresa? | `Membership` (empresa, `role`, `inventoryAccess`) |
| ¿Qué contrató su organización? | `OrganizationModule` / `Subscription` (§3, §5) |
| ¿Esta persona es de mi equipo (Yellow ERP)? | `PlatformStaff` (§2.2) |

Reglas que el panel debe hacer cumplir:

1. **Nadie se auto-asigna un rol.** Crear/editar rol es de ADMIN de la organización (y OWNER para el
   permiso multiempresa).
2. **Al menos un OWNER activo por organización** (invariante: no se puede quitar el último).
3. **Un usuario activo por empresa como mínimo**, si la organización sigue vigente.
4. **El correo es la identidad**, pero el acceso es la `Membership`: desactivar a alguien = desactivar
   su `Membership`/`OrgMember`, no borrar el `User` (borra la trazabilidad de auditoría).
5. **Toda mutación pasa por una Server Action con `requireContext`/`requireStaff`** y deja
   `AuditLog` (empresa) o `PlatformAudit` (plataforma).

---

## 5. Planes y límites

**`Plan` (catálogo) ≠ `Subscription` (contratado).** Mezclarlos obliga a duplicar el catálogo por
cliente.

```
Plan                          Subscription                     UsageRecord
  id, code, name                organizationId, planId           organizationId, period (YYYY-MM)
  priceCLP, period MONTHLY      status (TRIAL|ACTIVE|          documentsCreated, activeUsers,
  maxCompanies, maxUsers          PAST_DUE|CANCELED)             storageBytes, bankSyncs
  maxDocsPerMonth               startedAt, currentPeriodEnd     computedAt
  modules String[]              trialEndsAt, canceledAt
  active Boolean
```

- **Se parte con una maqueta**: un solo plan `Free` en el catálogo, `maxCompanies`/`maxUsers`/
  `maxDocsPerMonth` en `null` (**sin tope**) y una suscripción `Free` de ejemplo para cada
  organización. La UI de facturación queda completa desde el día uno, pero no bloquea a nadie.
  Los números reales (y la pasarela) entran cuando definas el precio: el modelo no cambia, solo se
  llenan los campos y se activa el `enforcement`.
- **Límites, cuando existan** (propuesta de partida, a confirmar): Free 1 empresa / 2 usuarios / 50
  documentos al mes; Pro 3 empresas / 10 usuarios / 1.000 documentos al mes; Business sin tope.
  El modelo soporta cualquier combinación.
- **Enforcement en la Server Action**, no en la UI: al crear venta/compra/gasto, al agregar miembro,
  al crear empresa. Con `UsageRecord` del mes en curso y contador por organización (no contar
  haciendo `count(*)` de la tabla completa en cada request).
- **El mensaje de bloqueo importa** (es donde se pierde o se gana un cliente): «Llegaste a los 50
  documentos del mes en el plan Free. Tus documentos no se perdieron; pasa a Pro para seguir
  registrando este mes.»
- **Cobro (diferido, ver `PLAN-SAAS.md` §6):** Flow o Mercado Pago en CLP, webhook con firma e
  idempotencia, y la propia facturación del SaaS como documento del sistema (§9 de este plan).
- **Periodo de prueba:** `TRIAL` con `trialEndsAt`; al vencer, no se borra nada, se pasa a solo
  lectura con avisos. Nunca borrar datos de un cliente por falta de pago.

---

## 6. Fases, entregables y esfuerzo

| Fase | Contenido | Entregable verificable | Esfuerzo |
| --- | --- | --- | --- |
| **A. Saneamiento de administración** | Separar Configuración de empresa y Organización; `toggleCanSwitchCompanies` solo OWNER + auditoría; invariante «siempre un OWNER activo»; `createCompany` pasa a capacidad de organización (OWNER/ADMIN, decidido); `addMember` explícito por empresa (hoy puede repartir accesos en bloque); desactivar usuario en vez de borrar; aclarar en la UI quién puede qué | Un ADMIN de empresa ya no otorga permiso multiempresa; la pantalla de organización no habla de IVA; `pnpm typecheck`/`build` en verde | 2–3 días |

**Estado de A: implementada y verificada en la base local (19-10-2026).** Lo que quedó:

- **Nivel 1 nuevo: `/facturas/organizacion`** (`page.tsx` + `org-member-row.tsx`). Administra las
  empresas del grupo, sus miembros de organización y las invitaciones. Configuración
  (`/facturas/configuracion`) quedó acotada a la **empresa activa**: datos fiscales, SII, Defontana,
  alertas y usuarios de esa empresa; con un enlace a Organización para quien administra la cuenta.
- **Permisos por nivel** (`src/lib/auth.ts`): `isOrgManager` (OWNER/ADMIN), `isOrgOwner` (OWNER),
  `requireOrgManager`. El rol de organización decide si se entra; el rol de empresa decide qué se ve
  (sección `organizacion` en `src/lib/permissions.ts`). El sidebar y el switcher de empresas reciben
  `isOrgManager` para mostrar Organización sin depender de la empresa activa.
- **Acciones** (`src/app/actions/companies.ts`): `createCompany` liga la empresa a la organización del
  creador y le da `Membership(ADMIN)`; `setOrgRole`, `setOrgMemberActive` y `toggleCanSwitchCompanies`
  son **solo OWNER**. Invariantes servidor: no se puede dejar la organización sin OWNER activo, ni la
  empresa sin ADMIN activo, ni el último OWNER sin el permiso de revisión. Desactivar un miembro de
  organización desactiva además sus memberships de las empresas del grupo (si no, no cortaría nada).
  Desactivar en vez de borrar. `deleteCompany` exige ADMIN de la empresa **y** de la organización.
- **Reparación idempotente** (`src/lib/organizations.ts` → `ensureOrgOwner`): si una organización quedó
  sin OWNER activo, promueve al miembro activo más antiguo que sea ADMIN de alguna empresa. Se ejecuta
  al abrir Organización.
- **Invitaciones** (`src/app/actions/invitations.ts`): pasan a `requireOrgManager`; invitar sin empresa
  destino (toda la organización) es solo del OWNER; el destino debe pertenecer a la organización. La
  auditoría elige la primera empresa del grupo (el `AuditLog` es por empresa, no por organización).
- **Nombre de la cuenta**: con **una sola empresa**, la organización se llama como la empresa
  (`syncOrgName`, idempotente, se corre al abrir Organización y no se ofrece editar). Con **más de
  una**, el dueño le pone el nombre a su «holding» desde Organización (`updateOrganization` + el
  formulario `organization-name-form.tsx`). El `slug` no cambia (es identificador interno `@unique`).
- **Backfill** (`scripts/backfill-organizations.ts`, `pnpm db:backfill-orgs`): agrupa las empresas sin
  organización por **administrador activo compartido** (componentes conexas), crea la `Organization` +
  `OrgMember`, deja OWNER al ADMIN activo más antiguo y apunta `Company.organizationId`. Idempotente y
  simulable (dry-run sin `--si`).
| **B. Consola de operador (sin impersonar)** | `PlatformStaff`, `requireStaff`, layout de `/admin`; tablero, organizaciones, ficha de organización, usuarios, incidencias; `PlatformAudit` | Puedes crear una organización, invitación y ver su uso **sin entrar a la Configuración del cliente**; ningún cliente puede abrir `/admin` | 4–6 días |

**Estado de B: implementada y verificada en la base local (20-10-2026), pendiente de push.** Lo que quedó:

- **Schema** (migración `20261026120000_platform_staff`): `PlatformStaff(userId @unique, level, active)` con
  `PlatformLevel` = `SUPPORT`/`OPERATOR`/`OWNER`, y `PlatformAudit` (auditoría de plataforma: por persona
  del equipo, no por empresa, porque una acción puede no tener empresa —crear una organización—).
- **Autorización** (`src/lib/platform.ts`): `requirePlatformStaff(level)` con jerarquía (OWNER ⊇ OPERATOR ⊇
  SUPPORT). Redirige a `/facturas` si hay sesión pero no es staff (quien no es del equipo no debe ver
  siquiera que `/admin` existe) y a `/login` sin sesión. El `layout` de `/admin` corta antes de renderizar,
  y **cada Server Action** vuelve a exigir el nivel.
- **Auditoría** (`src/lib/platform-audit.ts`): `recordPlatformAudit(ctx, …)` deja rastro en `PlatformAudit`;
  nunca tumba la acción que registra.
- **Pantallas**: `/admin` (tablero), `/admin/organizaciones` (listado + buscador + alta asistida),
  `/admin/organizaciones/[id]` (empresas, miembros, invitación, historial de plataforma), `/admin/usuarios`
  (búsqueda global), `/admin/incidencias` (cuentas sin dueño, empresas sin admin, sync bancario con error,
  contraseñas provisionales) y `/admin/equipo` (solo OWNER: reparte el acceso a la consola).
- **Acciones** (`src/app/actions/platform.ts`): `createOrganizationFromAdmin` e
  `createInvitationFromAdmin` (OPERATOR), `addPlatformStaff`/`updatePlatformStaff` (OWNER, con invariante
  «siempre un OWNER de plataforma activo» y «no te puedes suspender a ti mismo»).
- **Bootstrap**: el `seed` acepta `PLATFORM_STAFF_EMAIL` (+ `PLATFORM_STAFF_LEVEL`, default `OWNER`) para
  dejar el primer dueño de plataforma. A propósito: el acceso a todas las cuentas no se reparte por defecto.
- **Impersonar no está**: es la Fase B2. `/admin/usuarios` lo dice explícitamente.

**Cómo se verificó B (local, 20-10-2026):**

- Un cliente con sesión (sin `PlatformStaff`) que abre `/admin` o `/admin/equipo` **rebota a `/facturas`**;
  el enlace «Consola de operador» tampoco le aparece en el menú de cuenta.
- Por nivel: `SUPPORT` lee y **no** ve «Nueva organización» ni «Equipo»; `OPERATOR` puede crear cuentas e
  invitar pero no entrar a `/admin/equipo`; `OWNER` ve todo.
- Invariantes del equipo: degradar o suspender al **único** dueño de plataforma se rechaza con
  «Debe quedar al menos un dueño activo en el equipo de plataforma», y nadie se puede suspender a sí mismo.
- Alta asistida probada de punta a punta: crear la cuenta en la consola → generar la invitación → el
  contacto abre el enlace, pone nombre y contraseña → queda como ADMIN en las empresas de la organización
  con contraseña provisional, y la invitación se marca aceptada.
- El enlace de la invitación **sobrevive a la revalidación** (cookie corta de 15 min + panel pintado por
  el servidor): el estado del componente de cliente se pierde al revalidar, así que el enlace no puede
  vivir ahí.
- Invitar dos veces al mismo correo avisa («Ya hay una invitación vigente») en vez de chocar con la
  restricción única `(organizationId, email)`. Si la anterior expiró sin usarse, se reemplaza.
- Auditoría de plataforma: quedan registradas la creación de la cuenta, la invitación, el alta y los
  cambios de nivel.
- Verificado en **ambos temas** (R-34): la consola usa los tokens semánticos (`bg-surface`, `text-muted-foreground`,
  `border-border`) y no colores crudos.
| **B2. Impersonar** *(decidido: se hace)* | Sesión separada, banner, tope de tiempo, acciones destructivas prohibidas, registro visible para el cliente | Entras como soporte, haces una tarea y el dueño del cliente lo ve registrado | 2–3 días |

**Estado de B2: implementada y verificada en la base local (20-10-2026), pendiente de push.**

- **Sesión separada** (`src/lib/impersonation.ts`): la impersonación crea una sesión **nueva** con su propia cookie
  (`facturas_impersonacion`). La del operador no se toca: salir es siempre un clic y nunca un «volver a mi
  cuenta» que se puede perder. `Session` ganó `impersonatedByStaffId`, `impersonatedOrganizationId`,
  `impersonatedUntil` e `impersonationReason` (migración `20261026130000_impersonation`).
- **Tope duro de 30 minutos** (`IMPERSONATION_MAX_MS`). No es configurable a voluntad: es el techo del
  permiso. Si se vence, la sesión se cierra sola y el operador vuelve a su propia sesión.
- **Banner permanente** en toda la app y en la consola, con la cuenta regresiva y el botón de salida. El
  servidor pinta «máx. 30 min» y el cliente la cuenta viva: si el servidor calculara el tiempo también,
  el HTML y la carga útil llegarían con un segundo de diferencia y React abortaría la hidratación (el
  botón «Salir» dejaría de funcionar).
- **Acciones prohibidas durante la impersonación** (`IMPERSONATION_FORBIDDEN`): eliminar una empresa,
  exportar los datos, cambiar contraseñas y ver RRHH. Los cuatro cortes están donde hacen falta:
  `deleteCompany`, la ruta de exportación ZIP, `changePassword` (+ la página de perfil) y
  `requireContext("rrhh")`, que es el punto único por donde pasan todas las páginas y rutas de RRHH
  (el ítem también desaparece del menú).
- **Registro para el cliente**: apertura y cierre quedan en `PlatformAudit`, y el **dueño de la cuenta**
  los ve en `/facturas/organizacion` («Accesos de Yellow ERP a esta cuenta»), con el motivo y la
  duración. La consola muestra además las sesiones de soporte abiertas.
- **Niveles**: entrar a la cuenta de un cliente es de `OPERATOR` (`SUPPORT` solo lee). A quién se entra:
  a los miembros activos de la organización con rol `OWNER` o `ADMIN` — nunca a un `MEMBER`, que no
  puede administrar su cuenta y abriría la puerta de más.
- **La consola no se abre desde una impersonación**: `requirePlatformStaff` usa la sesión **propia**, no
  la de la identidad del cliente.

**Cómo se verificó B2 (local, 20-10-2026):** alta asistida completa desde la consola (crear cuenta →
invitar → el contacto entra); la impersonación muestra el banner con la cuenta regresiva; RRHH bloqueado
por URL y oculto en el menú; exportación ZIP bloqueada con 403 y el motivo real; perfil sin formulario
de contraseña; `deleteCompany` bloqueado (la empresa sigue en la base); «Salir» vuelve a la sesión del
operador; la auditoría registra entrada y salida; y el dueño de la cuenta ve el registro. Sin errores de
hidratación y con ambos temas verificados.
| **C. Módulos por organización** | Tabla `OrganizationModule`, `enabledModules(userId)` con los dos filtros, auditoría del cambio, UI de módulos en la organización | Un cliente sin RRHH contratado no ve RRHH en `/modulos` ni puede entrar por URL | 2–3 días |
| **D. Planes, uso y cobro** *(diferido hasta que haya cobro real)* | `Plan`, `Subscription`, `UsageRecord`; enforcement en las actions; `/admin/planes`; pantalla de facturación del cliente; Flow/Mercado Pago + webhook. **Parte con una maqueta: plan `Free` único, límites en `null` (sin tope) y UI de facturación completa** | El plan Free corta al llegar al tope con un mensaje claro; el upgrade libera el mismo día. Con la maqueta: puedes mostrar la pantalla de plan y cambiar de plan a mano desde `/admin` | 6–9 días |
| **E. Endurecimiento** | 2FA para `OWNER` y para `PlatformStaff`; rate limit en invitaciones y login; registro de accesos por organización; `proxy` de sesión | Owner con 2FA; nadie entra a `/admin` sin segundo factor | 3–4 días |

**Dependencias:** B necesita A (si A no cierra, el operador administra sobre reglas ambiguas). C es
independiente de B pero se apoya en su UI de organización. D necesita C (los límites de «módulos» del
plan son los de C). B2 y E son decisiones de riesgo, no bloquean vender.

**Antes del primer cliente externo:** A + B + C, y revisar la lista de §7.

---

## 6b. Despliegue: el subdominio de la consola (Coolify)

**Corrección de un supuesto (verificado el 20-10-2026):** `yellow-erp.cl` **no** sirve esta app. Ese
dominio lo ocupa **otro proyecto** (la landing de marketing con un panel de muestra). Esta app (la de
"Facturas") está desplegada en **`erp.faenaexpress.cl`**, apuntando al mismo VPS (`148.113.196.87`).
Por eso, la consola quedó viva en **`erp.faenaexpress.cl/admin`** y no en `yellow-erp.cl/admin`.

**No es un problema de seguridad:** la autorización la decide `PlatformStaff` en la base, no el host. Un
cliente del SaaS (por ejemplo `paola@montajevertikal.cl`) que abra `/admin` rebota a `/facturas` porque no
está en la tabla de personal. Lo que sí es un problema es de **marca y de ergonomía**: la consola del
proveedor no debería vivir en el dominio del cliente.

**Decisión a tomar (pendiente):** cuando exista el despliegue de esta app con perfil `saas`, la consola se
publica como **`admin.yellow-erp.cl`** y el `/admin` del dominio del cliente devuelve 404. No es un cambio
de código salvo el punto 5 de abajo.

Decidido: durante el desarrollo la consola vive en el **mismo dominio** de la app; al
terminar las fases se publica como **`admin.yellow-erp.cl`**. No es un cambio de código: la app no
depende del host (`requireStaff` decide, no el dominio), así que es configuración de despliegue.

**Cuándo lo hacemos:** cuando el panel esté terminado y probado. Te acompaño entonces con estos pasos
(el DNS lo haces tú en el registrador de `yellow-erp.cl`; el resto es Coolify):

1. **DNS**: un registro `A` para `admin` apuntando a la IP del VPS (`148.113.196.87`), o un `CNAME`
   si el dominio ya está detrás de un proxy. Verificar con `nslookup admin.yellow-erp.cl` antes de
   seguir (si el DNS no propagó, Coolify no puede emitir el certificado).
2. **Coolify → mismo recurso, segundo dominio**: en los ajustes del servicio, agregar
   `admin.yellow-erp.cl` a la lista de dominios (FQDN) **manteniendo** el actual. Coolify usa Traefik:
   varios dominios en un mismo servicio es soportado y comparten contenedor.
   - Si el build necesitara comportarse distinto en ese host, se resuelve con una variable de entorno
     del perfil (`DEPLOYMENT_PROFILE`), **no** con otro despliegue ni bifurcando el código.
3. **Certificado**: Coolify emite el TLS de Let's Encrypt al guardar (necesita el paso 1 resuelto y
   el puerto 80/443 abiertos, que ya lo están).
4. **Decisión a tomar ahí**: `admin.yellow-erp.cl` **redirige** a `/admin` (más simple de recordar) o
   sirve la landing. Recomiendo redirigir.
5. **Cerrar el aislamiento del subdominio** (esto sí toca código, poco): un chequeo de host que en
   `admin.*` exija `requireStaff` para cualquier ruta, y que en el dominio del cliente `/admin`
   devuelva 404. Así el subdominio no es solo una puerta bonita: es una puerta con guardia.
6. **Verificación**: `admin.yellow-erp.cl` con sesión de cliente → 404/redirect; con sesión de staff →
   el tablero. Y `/admin` en el dominio del cliente → 404.

**Lo que no haría**: un segundo despliegue (otro contenedor, otra base, otro deploy) solo para el
subdominio. Duplica migraciones, backups y variables para ganar cero seguridad: el aislamiento sigue
siendo por fila y la autorización la decide `PlatformStaff`.

---

## 7. Riesgos y decisiones

**Riesgos**

1. **La consola de operador es la superficie más peligrosa del sistema.** Un fallo de autorización ahí
   no filtra una empresa: filtra todas. Por eso `PlatformStaff` en BD + `requireStaff` en cada action +
   auditoría de plataforma, y no un flag de entorno.
2. **«Asignar módulos por usuario» es una trampa de diseño.** Se vuelve imposible de explicar y de
   auditar («¿por qué Juan no ve RRHH?»). Módulos por organización, secciones por rol.
3. **Límites sin mensaje claro** se sienten como un cobro sorpresa. El bloqueo debe decir qué pasó, qué
   no se perdió y cómo seguir.
4. **Impersonar sin límites** es una puerta trasera con tu nombre. Si se hace, con tope de tiempo,
   banner y registro visible para el cliente.
5. **Hoy la administración vive en Configuración**, junto a credenciales del SII. Un admin de empresa
   que entra a «ver el IVA» ve la lista de personas: la mudanza de A también es higiene.

**Pendiente** (no bloquea ninguna fase): los números y precios reales de los planes (§5, fase D).

---

## 8. Lo que NO haría ahora

- **Un «superusuario» global implícito** (tu cuenta con acceso a todo): rompe el aislamiento por fila
  y no deja rastro. Si necesitas ver todo, que sea por `PlatformStaff` + impersonar, con registro.
- **Gestión de usuarios empresa por empresa desde la consola** para tareas cotidianas: el cliente se
  administra solo (Nivel 1). La consola es para excepciones y soporte.
- **Módulos por usuario** (§7.2).
- **Cobro automático antes de tener planes claros**: primero el catálogo y los límites, después la
  pasarela.
- **Mover todo a un monorepo** para «ordenar» la administración: no aporta nada a este problema.
  (El subdominio sí se hace, pero como configuración de despliegue: §6b, un solo contenedor.)

---

*Plan escrito el 19-10-2026 sobre `main` (`d95c43a`), con la capa `Organization`/`OrgMember`,
invitaciones por enlace y el shell de módulos ya presentes. Complementa a `PLAN-SAAS.md`, que sigue
siendo la referencia de aislamiento, alta y cobro.*
