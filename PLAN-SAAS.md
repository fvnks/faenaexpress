# Plan: de «Facturas» a un SaaS multiempresa

> Objetivo del dueño (textual): *«quiero que las empresas queden completamente separadas una de
> la otra, a menos que el usuario tenga permisos para revisar las empresas en su perfil»* y
> después *«crear una landing page y que este proyecto de facturas sea solo un módulo dentro de un
> gran SaaS»*.

Este documento es el plan. Las decisiones ya tomadas están justo abajo y la **§11** lista lo que
queda abierto.

## Decisiones tomadas (18-10-2026)

| Tema | Decisión |
| --- | --- |
| Permiso multiempresa | Atributo del perfil: `OrgMember.canSwitchCompanies`, apagado por defecto, **lo otorga el OWNER** de la organización. |
| A quién le vendemos | **Pocas empresas conocidas, alta asistida.** No hay registro público ni cobro automático al partir: nosotros creamos la organización y las empresas, e invitamos a los usuarios. |
| Landing y cobro | Landing **en este mismo repo y dominio**. Cuando se cobre, **Flow o Mercado Pago** (CLP local). |
| Nombre y dominio | El SaaS se llama **Yellow ERP**, en **`yellow-erp.cl`**. La instalación actual (la empresa que ya lo usa) **sigue en su propio dominio**. |
| Arquitectura de despliegue | **Un solo código, dos despliegues** (ver §7.1). Nunca un fork. |

Consecuencia directa: la **F2 se reduce** (invitaciones por enlace, sin proveedor de correo ni registro
público) y la **F3 (planes y cobro) se posterga** hasta que empiecen a cobrar de verdad.

---

## 0. Resumen ejecutivo (qué recomiendo)

1. **Una sola base de datos con aislamiento por fila (`companyId`), no una BD por cliente.** Lo que
   hay hoy ya es row-level y funciona; migrar a *database-per-tenant* multiplica la operación
   (migraciones × N, backups × N, conexiones × N) sin resolver nada que no resolvamos con
   disciplina. Se reevalúa cuando un cliente lo exija por contrato o cuando pasen los ~2.000
   tenants.
2. **Agregar una capa `Organization` (cuenta/workspace) arriba de `Company`.** Es donde viven el
   pago, los asientos (usuarios) y el permiso de «revisar varias empresas». `Company` sigue siendo
   el inquilino de datos, tal como hoy.
3. **El permiso de revisar empresas es un atributo del perfil**, no un rol: `OrgMember.canSwitchCompanies`
   (boolean, apagado por defecto). Sin él, el usuario ve **una** empresa y no existe selector.
4. **Cerrar los huecos de abuso antes de abrir la puerta**: hoy cualquier usuario autenticado puede
   crear empresas (`createCompany`), no hay invitaciones ni recuperación de contraseña, el
   entrypoint usa `prisma db push`, y la llave que cifra las credenciales SII/Defontana es una sola
   para todas las empresas.
5. **SaaS sí, monorepo todavía no.** La landing, las invitaciones y el shell de módulos viven en
   *este* app (route groups) y el mismo código corre en **dos despliegues**: la instalación de la
   empresa actual (su dominio, sin landing ni alta) y **Yellow ERP** (`yellow-erp.cl`). El corte a
   subdominios o monorepo se hace cuando exista el **segundo** módulo real, no antes.

Orden de trabajo: **saneamiento → aislamiento y permiso (el pedido) → alta asistida con invitaciones
→ landing y shell → autoservicio, planes y cobro → operación y cumplimiento.**

---

## 1. Qué hay hoy (auditoría real del código)

| Pieza | Estado actual | Archivo |
| --- | --- | --- |
| Tenant de datos | `Company` + `companyId` en ~50 archivos de `src/lib` y `src/app/actions` | `prisma/schema.prisma` |
| Pertenencia | `Membership(userId, companyId, role, inventoryAccess, active)` con `@@unique([userId, companyId])` | `prisma/schema.prisma:64` |
| Sesión | Token opaco; en BD solo el hash SHA-256; cookie `facturas_session` (httpOnly, sameSite lax) | `src/lib/session.ts` |
| Empresa activa | Cookie `facturas_company` + `resolveActiveMembership()`; valida que exista la membership | `src/lib/auth.ts:35` |
| Contexto por página | `requireContext(section?)` exige sesión + empresa activa + acceso a la sección. **No hay `middleware`/`proxy`**: cada página debe acordarse de llamarlo | `src/lib/auth.ts:62` |
| Permisos | Matriz estática rol → sección (ver/escribir) + `InventoryAccess` por membership | `src/lib/permissions.ts` |
| Selector de empresa | Lista **todas** las memberships del usuario, sin permiso que lo limite | `src/components/company-switcher.tsx`, `src/app/dashboard/layout.tsx:21` |
| Alta de empresa | `createCompany`: cualquier usuario autenticado, sin límite → queda ADMIN | `src/app/actions/companies.ts:63` |
| Alta de usuarios | `addMember` (por correo existente) y `createMember` (crea con contraseña); alcance «esta» o «todas mis empresas» | `src/app/actions/companies.ts:145`, `:197` |
| Registro público | **No existe** (el login dice «pídele acceso al administrador») | `src/app/login/page.tsx` |
| Correo saliente | **No existe** (por eso no hay invitaciones ni recuperación) | — |
| Deploy | Dockerfile + Coolify; entrypoint con `prisma db push`; seed admin+empresa desde `ADMIN_*` | `Dockerfile`, `scripts/docker-entrypoint.sh` |
| Cifrado de credenciales | Una llave global `SII_SECRET_KEY` (AES-256-GCM) para SII y Defontana de **todas** las empresas | `src/lib/sii-credentials.ts`, `src/lib/defontana/credentials.ts` |
| Tests | Ninguno | — |

Buena noticia: el aislamiento por fila ya es la norma y `resolveActiveMembership` valida la cookie
contra las memberships (no hay escalada por cookie manipulada). El problema no es «no hay
aislamiento», es que **el aislamiento se apoya en la convención** (cada consulta debe filtrar
`companyId`) y que **la visibilidad multiempresa no está gobernada por un permiso**.

---

## 2. Los cinco huecos a cerrar

1. **No hay cuenta que pague.** `Company` es a la vez inquilino de datos y «cliente». No hay dónde
   colgar plan, facturación, asientos ni usuarios del grupo.
2. **No hay permiso de multiempresa.** Cualquier miembro de 2 empresas ve el selector y opera en
   ambas; y cualquiera puede crearse una empresa y ser ADMIN de ella.
3. **No hay alta autoservicio.** Sin registro, sin invitaciones, sin verificación de correo, sin
   recuperación de contraseña. Hoy el alta es manual (script `reset-password.mjs` + seed).
4. **El aislamiento no está garantizado por el sistema.** Es convención: 50 archivos filtran a
   mano. Una consulta nueva sin `companyId` filtra datos de otra empresa y nadie lo nota.
5. **No hay operación multipropósito.** `db push` en vez de migraciones, una BD de producción con
   datos de dos clientes mezclados en el chat, una llave de cifrado global, sin límites de uso, sin
   observabilidad por tenant.

---

## 3. Modelo objetivo

```
Organization            ← la cuenta del SaaS (quien paga, quien agrupa)
  id, name, slug, plan, status, ownerUserId, trialEndsAt
  │
  ├── OrgMember         ← quien entra a la organización
  │     userId, organizationId, orgRole (OWNER|ADMIN|BILLING|MEMBER)
  │     canSwitchCompanies Boolean   ← «revisar las empresas» del perfil
  │
  ├── Company[]         ← inquilino de datos (lo que hoy existe, +organizationId)
  │     └── Membership[] (userId, companyId, role)   ← sin cambios: rol por empresa
  │
  ├── Invitation[]      ← correo, rol, empresas, token, expira
  └── Subscription / UsageRecord[]  ← plan, límites, consumo del mes
```

**Semántica de visibilidad** (el corazón del pedido):

- `canSwitchCompanies = false` (por defecto): el usuario solo ve las empresas donde tiene
  `Membership`. Si tiene una, entra directo y **no hay selector**. Si tuviera más de una, se fija la
  más antigua y las demás quedan ocultas (no debería pasar: el sistema no crea memberships extra
  sin el permiso).
- `canSwitchCompanies = true`: ve **todas las empresas de su organización** y aparece el selector.
  El permiso es *de la organización*, nunca global: nadie ve empresas de otra organización, ni con
  el permiso puesto.
- El caso real de hoy (FaenaExpress SpA + Vertikal, mismo dueño) es **una organización con dos
  empresas** y el dueño con `canSwitchCompanies = true`. Una oficina contable que lleva 20 clientes
  distintos es su propia organización con 20 empresas: un solo login, una sola factura, un solo
  permiso.

---

## 4. Aislamiento: cómo se convierte en «completo»

Tres capas, de barata a cara. Las dos primeras se hacen ahora; la tercera solo si alguien lo exige.

**Capa 1 — el punto único de decisión.** `src/lib/auth.ts` expone
`visibleCompanies(user) → Company[]` y `resolveActiveMembership()` se reescribe para usarla. El
selector de la UI se alimenta de ahí, y `requireContext` rechaza cualquier cookie que apunte a una
empresa no visible. Hoy ya casi es así; hay que agregarle la rama «organización completa».

**Capa 2 — guardia automática anti-fugas (barata y de alto valor).**
- `scripts/check-tenant-scope.mjs`: recorre `src/lib` y `src/app` y marca toda llamada
  `db.<Modelo>.<op>(…)` sobre un modelo con `companyId` que no mencione `companyId` en la misma
  llamada, salvo que esté en una lista blanca con el comentario `// tenant: org` (consultas legítimas
  sobre `Company`, `Membership`, `Organization`).
- `pnpm check:tenant` y se engancha en `pnpm lint` (o CI). Atrapa la regresión el día que se
  escribe, no en producción.
- Refuerzo opcional: extensión de Prisma en desarrollo
  (`db.$extends({ query: { $allModels: { $allOperations } } })`) que **truena** si una operación de
  un modelo-tenant no trae `companyId`. Sirve de red de seguridad en `pnpm dev`, no en producción.

**Capa 3 — RLS de PostgreSQL (diferir).** `SET LOCAL app.company_id` por transacción y políticas
`USING (company_id = current_setting('app.company_id')::text)`. Es el techo de garantía, pero pide
envolver cada request en transacción con el pool de `pg` y reescribir el acceso a datos. Se justifica
solo con requisito contractual (banca, licitaciones).

**Extra:** agregar `Session.activeCompanyId` (fuente de verdad en el servidor; la cookie queda como
comodidad) y registrar en auditoría las entradas a una empresa por el permiso multiempresa. Barato y
deja rastro.

---

## 5. Alta de clientes: invitaciones por enlace (asistida) y el autoservicio después

Decisión: **alta asistida**. Nosotros creamos la organización y las empresas; los usuarios entran por
invitación. Eso permite empezar **sin proveedor de correo, sin registro público y sin cobro**, que es
justo lo que la fase más cara de todo el plan.

### Ahora (F2 reducida)

1. **Invitación por enlace copiable**: tabla `Invitation` (organización, empresas, rol, token con
   hash, expira en 72 h, `acceptedAt`). El OWNER genera el enlace desde la configuración de la
   organización, **lo copia y lo manda por donde quiera** (WhatsApp, correo personal). Al abrirlo,
   `/invitacion/<token>`: si no tiene cuenta, la crea (nombre + contraseña, el correo viene fijado
   por la invitación); si ya la tiene, inicia sesión y acepta. Crea `OrgMember` + las `Membership`.
   - Por qué así y no con correo: es la mitad del trabajo, no depende de un tercero, y **el mismo
     token sirve** el día que agreguemos el envío automático por correo.
2. **Alta de organización (panel interno)**: pantalla para crear la organización, sus empresas y el
   primer OWNER. Reemplaza al seed por variables de entorno.
3. **Cambio de contraseña obligatorio** en el primer ingreso de un usuario invitado, y
   `/perfil` para cambiarla cuando quiera. Sigue existiendo `reset-password.mjs` como último recurso.
4. **Endurecimiento básico**: rate limit en login e invitaciones (por IP y por token), sin enumeración
   de usuarios (misma respuesta exista o no el correo), 2FA TOTP para `OWNER`.

### Cuando haya autoservicio (después, F2b)

- **Proveedor de correo** (Resend, o Amazon SES si el resto vive en AWS) con SPF/DKIM/DMARC: habilita
  invitaciones automáticas, verificación y recuperación de contraseña self-service.
- **Registro público** `/registro`: nombre, correo, contraseña, nombre de la empresa, RUT, IVA →
  `User` + `Organization` + `Company` + `OrgMember(OWNER)` + `Membership(ADMIN)`.
- **Verificación de correo** obligatoria antes de invitar.
- **OAuth** (Google/Microsoft) para conversión.

Con alta asistida, el «usuario global por correo» deja de ser problema: el correo de la invitación es
la identidad y el OWNER responde por ella.

---

## 6. Planes, límites y cobro (Chile) — **diferido**

No se cobra todavía (alta asistida). Se deja el diseño para no rehacer el modelo cuando llegue el
momento; el día que se active, el cobro va con **Flow o Mercado Pago** (CLP, tarjetas y transferencia
locales), no Stripe.

- `Plan` con límites: empresas, usuarios, documentos/mes, módulos habilitados, retención de
  históricos. Free razonable: 1 empresa, 2 usuarios, 50 documentos/mes.
- `UsageRecord` mensual por organización (documentos creados, usuarios activos, storage) y
  **enforcement en las Server Actions**, no en la UI (una action es alcanzable por POST directo).
- Cobro: **Flow** (tarjetas locales, transferencia, Webpay, emite boletas) o **Mercado Pago** para
  Chile. Webhook `/api/webhooks/<pasarela>` con verificación de firma e idempotencia.
- El propio producto puede emitir sus DTE de suscripción (comerse la propia comida), pero no es
  requisito para partir.

---

## 7. Yellow ERP: de «app» a «plataforma»

El producto se llama **Yellow ERP** (`yellow-erp.cl`). Lo que hoy es «Facturas» pasa a ser el primer
módulo. La instalación actual (la empresa que ya lo usa) **no se toca y sigue en su dominio**: mismo
código, despliegue distinto.

### 7.1 Un código, dos despliegues (nunca un fork)

| | Instalación de la empresa actual | Yellow ERP |
| --- | --- | --- |
| Dominio | el suyo, como hoy | `yellow-erp.cl` |
| Perfil | `DEPLOYMENT_PROFILE=standalone` | `DEPLOYMENT_PROFILE=saas` |
| Landing y precios | apagados | encendidos |
| Alta / invitaciones | internas (ya hay usuarios) | invitaciones al cliente |
| Organizaciones | una sola (la del dueño) | muchas |

Se implementa con un `src/lib/deployment.ts` que lee el perfil, y **la capa `Organization` existe en
ambos** (en la instalación sola hay una única organización). Así no hay dos modelos de datos ni dos
caminos de código: se agrega una empresa a un despliegue o al otro con la misma lógica.

**Más adelante, opcional**: si conviene unificar en un solo despliegue, `Organization.customDomain`
(y/o `slug.yellow-erp.cl`) permite servir a ese cliente desde Yellow ERP sin cambiar su dirección.
No se hace ahora: la instalación actual tiene datos reales en producción y no gana nada con moverse
mientras el SaaS no exista de verdad.

### 7.2 Rutas (route groups)

```
src/app/(marketing)/…        → landing, precios, legales, contacto, blog   (solo perfil saas)
src/app/(auth)/…             → login, invitación, perfil, contraseña
src/app/(app)/facturas/…     → lo que hoy es /dashboard (compras, ventas, gastos, banco, rrhh…)
src/app/(app)/[modulo]/…     → los módulos que vengan
```

**Registry de módulos** (`src/lib/modules.ts`): cada módulo declara `code`, `name`, `href`, la
sección de permisos que respeta y si está habilitado para la organización. El sidebar y el «home»
del SaaS se generan desde ahí. Agregar un módulo = agregar una entrada + sus rutas.

**Cuándo separar de verdad** (no ahora):
- *Subdominio por módulo* (`rrhh.yellow-erp.cl`): aislar deploys y equipos, compartiendo sesión con
  cookie en el dominio padre + `rewrites`. Se justifica con el segundo módulo y equipos distintos.
- *Monorepo pnpm* (`packages/db`, `packages/auth`, `packages/ui`, `apps/*`): cuando dos apps reales
  necesiten compartir el núcleo. Ya usan pnpm workspaces, así que el terreno está preparado.
- *Subdominio por cliente* (`faena.yellow-erp.cl`): cosmético y de marca; no aporta seguridad (el
  aislamiento es por fila). Se puede ofrecer como guiño comercial más adelante.

**Landing**: necesita su propia dirección visual (antislop R-37). El `DESIGN.md` actual describe el
producto denso de escritorio; la landing de `yellow-erp.cl` es otra cosa (narrativa, tipografía
grande, capturas, prueba social). Antes de escribirla hay que resolver esa dirección con el dueño:
hoy es lo único que falta definir para la fase 4.

---

## 8. Fases, esfuerzo y orden

| Fase | Contenido | Entregable verificable | Esfuerzo |
| --- | --- | --- | --- |
| **F0. Saneamiento** | Resolver la BD buena (5432 vs 5433), migraciones en vez de `db push` en el entrypoint, `createCompany` solo ADMIN, arreglar el desalineo de `AGENTS.md` (`src/proxy.ts` no existe) | `pnpm build` y deploy sin `db push`; nadie se crea una empresa solo | 1–2 días |
| **F1. Aislamiento + permiso** | `Organization`, `OrgMember.canSwitchCompanies`, `Company.organizationId`, backfill (1 org por grupo de empresas actuales), `visibleCompanies()`, selector condicionado, UI del permiso en el perfil, `scripts/check-tenant-scope.mjs` | Un usuario con una empresa no ve selector; el permiso habilita las empresas de **su** organización; `pnpm check:tenant` en verde | 4–6 días |
| **F2. Alta asistida** | `Invitation` con enlace copiable, panel interno de alta de organización/empresas/OWNER, `/perfil` + cambio de contraseña obligatorio al primer ingreso, rate limit, 2FA `OWNER` | Un cliente entra por enlace y queda con su rol, sin correo automático ni tocar la BD a mano | 3–4 días |
| **F2b. Autoservicio** *(después)* | Proveedor de correo, `/registro`, verificación, invitaciones por correo, recuperación de contraseña, OAuth | Un desconocido se registra solo y verifica su correo | 4–6 días |
| **F3. Planes y cobro** *(diferido)* | `Plan`, `UsageRecord`, límites en las actions, Flow/Mercado Pago + webhook, pantalla de facturación | Free con tope duro; upgrade cobra y libera | 5–8 días |
| **F4. Landing y shell** | Dirección visual de la landing (R-37), route groups, `deployment.ts` (perfil standalone/saas), registry de módulos, home de Yellow ERP | `yellow-erp.cl` vende y el producto se presenta como plataforma con Facturas como módulo | 4–7 días |
| **F5. Operación y cumplimiento** | Backups y exportación por empresa, observabilidad por tenant, llave de cifrado por organización/KMS, política de privacidad y DPA, datos de prueba fuera de producción | Dump restaurable, «Exportar mis datos», `organizationId` en logs/errores | continuo (3–5 días iniciales) |

**Dependencias:** F1 no depende de F2; F2 tampoco depende de correo (invitación por enlace); F2b sí lo
exige; F3 exige F1 (los límites se cuentan por organización); F4 puede ir en paralelo con F2/F3 una vez
resuelta la dirección visual de la landing.

**Antes de invitar al primer cliente externo**: F0 y F1 cerradas, `pnpm check:tenant` en verde, y la
lista de §12 revisada. F2b y F3 no son requisito para empezar a vender de a poco.

---

## 9. Cumplimiento y operación (Chile)

- **Ley 21.719 de protección de datos personales** (publicada dic-2024, vigencia plena dic-2026): al
  ser encargado de datos de terceros (clientes, y sobre todo trabajadores y remuneraciones del
  módulo RRHH) la plataforma necesitará base de licitud, derechos de acceso/rectificación/cancelación/
  oposición/portabilidad, notificación de brechas y contratos de encargo (DPA) con cada empresa
  cliente. Es requisito de producto, no un adorno legal.
- **Exportación de datos por empresa**: ZIP con CSV + XML DTE + PDFs. Sirve para la ley, para
  retención y como antídoto contra «no me quiero encerrar en tu SaaS».
- **Backups**: diario con retención, restauración probada (no basta con que exista el job), y
  **jamás** datos de producción en desarrollo: hoy la máquina de desarrollo apunta al VPS
  compartido y las dos bases tienen datos reales.
- **Llaves**: rotar `SII_SECRET_KEY` (queda comprometida: se pegó en un chat) y pasar a llave por
  organización envuelta con una llave maestra, o KMS. Hoy una sola llave abre las credenciales SII y
  Defontana de todos los clientes.
- **Observabilidad**: errores con `organizationId`/`companyId` como etiqueta, alertas de fallos del
  worker bancario y de los sync de Defontana por empresa.

---

## 10. Riesgos y trampas detectadas en el código

1. `createCompany` (`src/app/actions/companies.ts:63`) lo puede llamar **cualquier** usuario
   autenticado y sin límite → en SaaS es abuso directo del tier gratuito.
2. No hay `src/proxy.ts` aunque `AGENTS.md` lo declara: la protección es por página. Con más módulos
   y más superficies, un `proxy` (con guard de sesión y de módulo) o un `layout` que valide deja de
   ser opcional.
3. `prisma db push` en el entrypoint (`Dockerfile` §21-25, `scripts/docker-entrypoint.sh`) puede
   resetear y **borrar datos** con un cambio de schema incompatible. Con un cliente propio pasable;
   con cien, es un incidente.
4. `addMember` con alcance «todas mis empresas» reparte accesos en bloque y sin confirmación por
   empresa; en multiusuario debe ser explícito por empresa.
5. La cookie de empresa activa no está firmada: hoy no importa (`resolveActiveMembership` valida la
   membership), pero conviene moverla al servidor (`Session.activeCompanyId`).
6. El «usuario global por correo» impide que la misma persona tenga identidades separadas; es una
   decisión de producto (una identidad, N organizaciones) que hay que sostener a propósito.
7. Sin tests, la garantía de aislamiento es la revisión humana. El guard de §4 es el mínimo.

---

## 11. Decisiones: cerradas y abiertas

**Cerradas** (ver «Decisiones tomadas» arriba): el permiso `canSwitchCompanies` lo otorga el OWNER;
venta asistida a pocas empresas conocidas; landing en este repo; Flow o Mercado Pago cuando se cobre;
el SaaS se llama Yellow ERP en `yellow-erp.cl` y la instalación actual mantiene su dominio.

**Abiertas** (bloquean la fase indicada, nada más):

1. **Dirección visual de la landing** (bloquea F4): a quién le habla, qué debe transmitir, qué
   mostramos de capturas. Sin esto, antislop R-37 obliga a marcarla como «borrador sin dirección».
2. **¿La instalación actual entra entera a Yellow ERP?** Hoy se asume **no** (dos despliegues, §7.1).
   Si algún día conviene, `Organization.customDomain` lo resuelve sin mover datos a mano; la pregunta
   es de negocio: ¿la empresa actual es «un cliente más» de Yellow ERP o su instalación privada?
3. **El primer OWNER de la empresa actual** (bloquea F1): ¿`r.droguett@faenaexpress.cl` es el OWNER de
   la organización con `canSwitchCompanies = true` y `admin@facturas.local` queda como ADMIN interno?
   Hay que decidirlo antes del backfill para no dejar a nadie sin acceso.
4. **Alcance del módulo «Facturas» en el nombre** (bloquea F4, cosmético): ¿el módulo se llama
   «Facturas» o «Documentos»? El producto se llama Yellow ERP; el módulo puede quedarse como está.

---

## 12. Lo que NO haría ahora

- **Base de datos por cliente**: costo operativo alto (migraciones, backups, conexiones, soporte) y
  ninguna ventaja real frente al aislamiento por fila bien probado.
- **RLS de PostgreSQL**: garantía superior, pero reescribe el acceso a datos; solo con un cliente que
  lo exija por contrato.
- **Monorepo con `apps/*`**: se justifica con el segundo módulo real, no con el deseo.
- **Subdominio por cliente**: es marketing, no seguridad; al final, si acaso.
- **Agregar módulos nuevos** (RRHH ya existe y está a medias: falta el cálculo legal de
  remuneraciones y el kardex ligado a consumo de lotes) antes de que el núcleo multiempresa y el alta
  de clientes estén sólidos.

---

*Plan escrito el 18-10-2026 y actualizado el mismo día con las decisiones del dueño (permiso del
OWNER, venta asistida, landing en este repo, Flow/Mercado Pago, nombre Yellow ERP y `yellow-erp.cl`),
sobre el estado del repositorio en `main` (conciliación bancaria con gastos ya integrada). Ver
`CONTEXTO.md` §5 y §13 para el detalle del estado previo.*
