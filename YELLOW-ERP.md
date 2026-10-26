# Yellow ERP — Especificación del Proyecto

> Módulos: Facturas (ERP empresarial), Colegios (libro de clases digital), Consola de operador (/admin), Portal de apoderados, Consola de plataforma.  
> Stack: Next.js 16 (App Router, src/), React 19, TypeScript, Tailwind CSS 4, PostgreSQL + Prisma 7 (@prisma/adapter-pg).  
> Contexto: Chile, CLP, IVA 19%. Todo en español.  
> Deploy: VPS Ubuntu con Coolify (148.113.196.87), app en erp.faenaexpress.cl.

---

## 1. Stack Técnico

| Capa | Tecnología |
|------|------------|
| Framework | Next.js 16.4.2 (App Router, `src/`) |
| React | 19 |
| Estilos | Tailwind CSS 4 |
| Base de datos | PostgreSQL + Prisma 7 (`@prisma/adapter-pg`) |
| Auth propia | Sesiones opacas en tabla `Session` (hash del token), contraseñas con `bcryptjs` |
| Roles empresa | ADMIN, ACCOUNTANT, SALES, VIEWER |
| Roles colegio | DIRECTOR, UTP, ADMIN, TEACHER, STAFF, VIEWER |
| Roles plataforma | SUPPORT, OPERATOR, OWNER |
| Despliegue | VPS Ubuntu + Coolify (148.113.196.87), app en `erp.faenaexpress.cl` |
| Build | `pnpm build` (`prisma generate && next build`) |
| Motor CLI Prisma en Windows | Puente TLS local (`scripts/pg-tls-bridge.mjs`) en puerto 15433 (schannel no soporta cert ECDSA de Coolify) |

---

## 2. Módulos del Sistema

| Módulo | Código | Qué hace |
|--------|--------|----------|
| Facturas | `facturas` | ERP de empresas: compras, ventas, gastos, catálogos de pago, reportes IVA, libros, guías de despacho, notas de crédito/débito, SII (RCV), Defontana (XML), conciliación bancaria, comisiones vendedores |
| Colegios | `colegios` | Dominio escolar: establecimiento, cursos, alumnos, apoderados, docentes, libro de clases digital |
| Libro de Clases Digital | `libro` | Dentro de Colegios: asistencia, leccionario, exportación EDE, firma con verificador de identidad MINEDUC, calendario escolar, calificaciones, actas, promoción |
| Comunicaciones | `comunicacion` | Circulares con acuse, justificaciones de inasistencia, citaciones/reuniones |
| Portal apoderados | `apoderados` | Portal familiar (`/apoderado`): ver notas, asistencia, justificar faltas, acuse circulares, solicitar reuniones con profesores |
| Calendario escolar | `calendario` | Feriados, vacaciones, días no lectivos, exportación EDE |
| Convivencia | `convivencia` | Denuncias, protocolos, Plan de Gestión de Convivencia (Ley 21.809), denuncia confidencial pública |
| Administración | `administracion` | Staff no docente (porteros, asistentes, admin), planes, suscripciones |
| Consola operador | `/admin` | Mesa de trabajo de Yellow ERP sobre todas las cuentas (SUPPORT / OPERATOR / OWNER) |
| SaaS Billing | `billing` | Facturación de la plataforma a organizaciones, planes, suscripciones, pagos (Flow, MercadoPago, Stripe, transferencia manual), morosidad |

---

## 3. Rutas Principales

### Facturas (`/facturas/*`)
- `/facturas` — Dashboard principal
- `/facturas/ventas` — Ventas, cotizaciones, guías de despacho
- `/facturas/compras` — Compras
- `/facturas/gastos` — Gastos
- `/facturas/ventas/guias` — Guías de despacho
- `/facturas/ventas/nota-credito` / `/facturas/ventas/nota-debito` — Notas de crédito/débito
- `/facturas/ventas/guias` — Guías de despacho (SII tipo 50)
- `/facturas/catalogos` — Catálogos de medios de pago, vendedores, comisiones
- `/facturas/ventas/guias` — Sincronización SII (tipos 50, 41, 46, 56)
- `/facturas/facturacion` — Plan y facturación de la empresa
- `/facturas/organizacion` — Ficha de organización, módulos por organización
- `/facturas/billing` — Panel de facturación SaaS (plan, facturas, pagos, métodos de pago)
- `/facturas/reportes` — Reportes, IVA, cuadre libros, pagos y dudas, comisiones

### Colegios (`/colegios/*`)
- `/colegios` — Panel principal del colegio
- `/colegios/asistencia` — Registro de asistencia por clase, firma con verificador MINEDUC
- `/colegios/asistencia/[id]` — Detalle de clase (fichero de clase, asistencia, firma)
- `/colegios/libro` — Exportación Libro de Clases Digital (EDE), estado de firmas
- `/colegios/libro/export` — Descarga zip del EDE para el MINEDUC
- `/colegios/cursos` — Gestión de cursos
- `/colegios/cursos/[id]` — Detalle de curso
- `/colegios/docentes` — Gestión de docentes
- `/colegios/estudiantes` — Listado de alumnos
- `/colegios/estudiantes/[id]` — Ficha del alumno (expediente)
- `/colegios/estudiantes/[id]/expediente` — Expediente impreso
- `/colegios/estudiantes/[id]/expediente` — Documentos y consentimientos (Ley 21.719)
- `/colegios/estudiantes/[id]/portabilidad` — Portabilidad de datos (Ley 21.719, art. 12)
- `/colegios/calificaciones` — Panel de calificaciones por curso/período/asignatura
- `/colegios/calificaciones/grade-sheet` — Hoja de notas
- `/colegios/calificaciones/evaluation-form` — Formulario de evaluación
- `/colegios/calificaciones/period-form` — Gestión de períodos de calificación
- `/colegios/promocion` — Acta de promoción (Decreto 67)
- `/colegios/promocion/art11` — Análisis Art. 11 (informe UTP, audiencia, decisión)
- `/colegios/convivencia` — Casos de convivencia (Ley 21.809)
- `/colegios/convivencia/casos/[id]` — Detalle de caso
- `/colegios/convivencia/protocolos` — Protocolos de convivencia
- `/colegios/convivencia/plan` — Plan de Gestión de Convivencia
- `/colegios/comunicacion` — Comunicación: circulares, bandeja de pendientes, citaciones
- `/colegios/apoderados` — Gestión de apoderados, códigos de acceso al portal
- `/colegios/libro` — Libro de clases digital (exportación EDE)

### Portal del Apoderado (`/apoderado`)
- `/apoderado` — Portal principal (asistencia, notas, circulares, citaciones)
- `/apoderado/api/docentes?studentId=xxx` — API para obtener profesores de un alumno

### Consola de Operador (`/admin/*`)
- `/admin` — Mesa de trabajo
- `/admin/planes` — Crear y gestionar planes de suscripción
- `/admin/usuarios` — Crear usuarios con contraseña provisional
- `/admin/usuarios/[id]` — Detalle de usuario, restablecer 2FA
- `/admin/colegios` — Gestión de colegios desde la plataforma
- `/admin/organizaciones` — Lista de organizaciones
- `/admin/organizaciones/[id]` — Ficha de organización (plan, uso, módulos, firmas)
- `/admin/modulos` — Gestión de módulos por organización
- `/admin/colegios` — Gestión de colegios desde la plataforma

### APIs
- `src/app/app/actions/schools.ts` — `saveAttendance`, `saveClassSession`, `createStudent` (invalida firmas al reescribir)
- `src/app/actions/school-sign.ts` — `firmarSesionAction`, `anularFirmaAction`
- `src/app/actions/school-portal-actions.ts` — `ackCircular`, `requestJustification`, `respondAppointment`
- `src/app/actions/portal-appointments.ts` — `requestTeacherAppointment`, `cancelMyAppointment`
- `src/app/actions/defontana.ts` — Acciones CRUD de credenciales Defontana, fetch de XML
- `src/app/actions/sii.ts` — Acciones SII (RCV, login, consulta)
- `src/app/api/catalogs/area/route.ts` — Ejemplo de ruta API

---

## 4. Modelos de Datos Clave (prisma/schema.prisma)

### Empresa / Usuario
- `Company` — Empresa cliente (rut, nombre, etc.)
- `Organization` — Organización (sostenedor en colegios)
- `User` — Usuario de plataforma (rut opcional para verificador MINEDUC, totpSecretEnc, totpEnabled)
- `Membership` — Membresía usuario ↔ empresa (rol, sectionAccess JSONB)
- `OrgMember` — Miembro de organización
- `Session` — Sesión opaca (hash del token)

### Colegio
- `School` — Establecimiento educativo (rut, nombre, nivel, comuna, sostenedorRut)
- `SchoolMembership` — Acceso de persona a colegio (rol: DIRECTOR, UTP, ADMIN, TEACHER, STAFF, VIEWER)
- `Course` — Curso (3°Básico A, año, nivel, sección)
- `Student` — Alumno (rut, nombre, fecha nacimiento, comuna)
- `Guardian` — Apoderado (rut, nombre, accessCode para portal)
- `Guardianship` — Vínculo apoderado-alumno (titular, suplente, emergencia)
- `Teacher` — Docente (rut, nombre)
- `Subject` — Asignatura (código, nombre, countsForPromotion)
- `TeachingAssignment` — Asignación docente × curso × asignatura
- `Enrollment` — Matrícula (estado ACTIVE/TRANSFERRED/WITHDRAWN, endedAt, statusReason)
- `ClassSession` — Clase dictada (curso × asignatura × docente × fecha × período, teacherId, recordedById)
- `AttendanceRecord` — Asistencia de alumno en clase (estado: PRESENT/ABSENT/LATE/JUSTIFIED/EXCUSED, justificationType)
- `SchoolSignature` — Firma del verificador de identidad (sesión, signedById, signerRut, otp, verifiedAt, attendances)
- `ClassSession.signature` — Relación 1:1 con firma
- `User.rut` — RUN del usuario para firma MINEDUC

### Calificaciones
- `GradingPeriod` — Período (semestre/trimestre, peso, orden)
- `Evaluation` — Evaluación (curso, asignatura, período, tipo, fecha, peso, isFinal)
- `Grade` — Nota (evaluación, alumno, valor 1.0-7.0, estado PENDIENTE/GRADED/EXCUSED)
- `Subject.countsForPromotion` — Si incide en promedio (Art. 7 D.67)

### Promoción (Decreto 67)
- `PromotionResolution` — Fila por (alumno, año): informe UTP, audiencia, decisión, excepción 85% asistencia

### Convivencia (Ley 21.809)
- `ConductCase` — Caso (tipo, severidad, título, estado, investigaciónDueAt 60 días)
- `CaseParticipant` — Participante (denunciante, afectado, testigo)
- `ConductAction` — Acción/etapa del protocolo (tipo, título, dueAt, doneAt, outcome)
- `ConductProtocol` — Protocolo del colegio (pasos con plazos)
- `ConvivenciaPlan` + `PlanActivity` — Plan de Gestión de Convivencia

### Comunicación
- `Circular` — Comunicado (título, cuerpo, audiencia COLEGIO/CURSO/FAMILIA, publicada)
- `CircularAck` — Acuse de lectura (circular, guardian, readAt)
- `JustificationRequest` — Solicitud de justificación de inasistencia (sesión, alumno, motivo, estado PENDIENTE/ACEPTADA/RECHAZADA)
- `Appointment` — Citación/reunión (schoolId, studentId, guardianId, title, reason, scheduledAt, durationMin, place, status PENDIENTE/CONFIRMADA/RECHAZADA/REALIZADA/CANCELADA, response)

### Banco / Conciliación
- `BankSync` — Sincronización bancaria
- `Reconciliation` — Conciliación bancaria (movimiento, documento, ignoredAt, ignoredReason internal_transfer/noise, reimbursed)

### Comisiones
- `CommissionAssignment` — Asignación de comisión a vendedor (commissionRate en centésimas de porcentaje)
- `CommissionClose` — Cierre de comisión mensual

### Facturación SaaS (NUEVO)
- `Plan` — Catálogo de planes (code, name, priceCLP, period, maxCompanies, maxUsers, maxDocsPerMonth, modules)
- `Subscription` — Contrato contratado (organizationId, planId, status ACTIVE/PAST_DUE/CANCELED/TRIAL, verifiedAt)
- `UsageRecord` — Contador del período (documentsCreated, activeUsers, bankSyncs)
- `SchoolSignature` — Firma de sesión de clase con verificador MINEDUC
- `SchoolMembership` — Acceso de persona a colegio

---

## 5. Comandos Principales

| Comando | Qué hace |
|---------|----------|
| `pnpm dev` | Servidor de desarrollo (Turbopack) |
| `pnpm build` | `prisma generate` + build de producción |
| `pnpm lint` | ESLint directo (`next lint` ya no existe en Next 16) |
| `pnpm typecheck` | `next typegen` + `tsc --noEmit` |
| `pnpm db:migrate` | Crea y aplica migración de desarrollo (pasa por puente TLS local) |
| `pnpm db:generate` | Regenera Prisma Client |
| `pnpm prisma db seed` | Crea admin y empresa (usa `ADMIN_*` del `.env`) |
| `pnpm db:deploy` | Aplica migraciones en producción (lo corre el entrypoint de Docker) |
| `pnpm db:drift` | Compara la base con el schema; exit 0 = alineados (`--exit-code`) |
| `pnpm db:baseline` | Basea una base antigua al baseline `0_init` |
| `pnpm db:studio` | Abre Prisma Studio (pasa por el puente TLS local) |
| `pnpm db:bridge` | Levanta solo el puente TLS local (para depurar) |

---

## 6. Comandos del CLI de Prisma (Windows + puente TLS)

En Windows, el motor de Prisma usa schannel (TLS ≤ 1.2) y falla contra el certificado ECDSA de Coolify. Por eso los comandos de Prisma pasan por `scripts/prisma-run.mjs`, que levanta un puente TLS local (`scripts/pg-tls-bridge.mjs`) en `127.0.0.1:15433` y ejecuta la CLI contra él.

**No usar `db push` en producción.** Siempre `db:deploy`.

Si hay una base antigua sin el historial de migraciones, usar `pnpm db:baseline` una sola vez.

---

## 7. Decisiones Arquitectónicas Importantes

### Firma con Verificador de Identidad (MINEDUC)
- API pública: `GET https://apiede.mineduc.cl/otp/verify-otp?rut=...&otp=...&DateWithTimeZone=...`
- Respuesta: `{"statusCode": 200, "body": "[{\"RUT\":\"...\",\"O\":0,\"OTPVERIFY\": true/false/\"RUT_NO_EXISTE\"}"]}`
- Mezcla string y boolean → fallar cerrado
- OTP caduca a los 30 segundos (TOTP)
- Zona horaria importa (America/Santiago con offset real)
- Un código firma una **sesión de clase** (curso × asignatura × fecha), no alumno por alumno
- Firma: docente que registró, o DIRECTOR/UTP en pendientes
- La firma se almacena en `SchoolSignature` y se vincula a `ClassSession`
- Si la sesión cambia después de firmar, la firma se invalida

### EDE (Estándar de Datos para la Educación)
- Formato JSON con grupos: `_Organizaciones`, `_Personas`, `_ComunidadEducativa`, `_Cursos`, `_Calendarios`, `_Calificaciones`
- `digitalRandomKey` = OTP real del MINEDUC (no hash inventado)
- `oprIdRatificador` = rol del firmante (si su RUN está en el archivo de personas)
- `fechaRatificador` = momento de verificación MINEDUC
- Exportar a `/colegios/libro/export` como JSON zip

### Migraciones
- El historial arranca en baseline `0_init` (40 tablas)
- Nunca usar `db push` en producción; siempre `db:deploy`
- Bases antiguas: pasar una vez por `pnpm db:baseline --si`

### Planes y Uso (Fase D)
- `Plan` (catálogo) ≠ `Subscription` (contratado) ≠ `UsageRecord` (contador)
- `checkPlanLimit` enforcement en Server Action (no en el botón)
- `syncPlanModules` es autoritativo; `source="manual"` no se pisa

### Impersonación (Fase B2)
- Sesión aparte (`facturas_impersonacion`), tope 30 min, banner permanente
- `IMPERSONATION_FORBIDDEN`: no eliminar empresa, exportar, cambiar contraseñas, ver RRHH
- Nivel OPERATOR, solo a miembros OWNER/ADMIN de la organización
- Entrada/salida en `PlatformAudit`

### Rate Limit Login
- 20 intentos por IP, 10 por cuenta cada 15 min (en memoria)

---

## 7. Rutas y Módulos (resumen rápido)

| Módulo | Ruta base | Qué hace |
|--------|-----------|----------|
| Facturas | `/facturas/*` | ERP de empresas |
| Colegios | `/colegios/*` | Dominio escolar |
| Portal Apoderados | `/apoderado` | Portal familiar |
| Consola | `/admin/*` | Mesa de trabajo Yellow ERP |
| Facturación SaaS | `/facturas/facturacion` | Facturas y pagos de la plataforma |

---

## 8. Cómo desplegar

1. Subir código al repositorio (GitHub `faenaexpress`)
2. Coolify detecta el cambio y hace deploy automático
3. El entrypoint del contenedor ejecuta `pnpm db:deploy` (migraciones)
4. La app arranca en `erp.faenaexpress.cl`

---

## 9. Próximos pasos pendientes (según PLAN-COLEGIOS.md)

- Validación EDE con contenedor `edemineduc/etl` (requiere Docker + frase secreta MINEDUC)
- Validación de códigos de referencia contra el validador oficial
- Exportar calificaciones al EDE (ya implementado en código, pendiente validación con contenedor)
- Módulo Aranceles y Cobranza (C5) — excluido por ahora
- Cobro SaaS (C8) — ya implementado (ver sección Facturación SaaS arriba)

---

## 10. Cómo hacer cambios

1. Modificar `prisma/schema.prisma` si hay cambios de modelo
2. Ejecutar `pnpm db:migrate` (local) o `pnpm db:deploy` (producción)
3. Escribir código en `src/lib`, `src/app/actions`, `src/app/colegios` o `src/app/facturas`
4. `pnpm typecheck` y `pnpm build` para verificar
5. Commitear y pushear a `main` (el desplegue en Coolify es automático)

---

Este documento es el punto de referencia único del proyecto. Si algo no está aquí, preguntar antes de asumir.