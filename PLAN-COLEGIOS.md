# Plan: Yellow ERP Colegios

**Módulo nuevo** de la plataforma Yellow ERP, para establecimientos educacionales en Chile.
Escrito el 20-10-2026, a partir de una revisión del mercado chileno (FullCollege, Colegium,
DataEduc, TECED, Codinex, Kiva360, Edues, ColegioPro) y de la normativa vigente.

## 0. Decisiones tomadas (20-10-2026)

| Decisión | Elegido | Por qué |
| --- | --- | --- |
| ¿Dónde vive? | **Módulo nuevo en este repo** | La plataforma multi-tenant (organización, planes con límites, 2FA, auditoría, consola, proxy) ya está construida y endurecida; es justo lo que un SaaS de colegios necesita. Un repo aparte serían 2-3 semanas de plataforma repetida. |
| ¿A quién se le vende? | **Colegio particular** (particular particular y particular subvencionado) | Es el más simple: sin rendición de subvenciones ni carrera docente obligatoria, y decide rápido. **El particular subvencionado necesita el módulo de subvenciones (fase posterior).** |
| ¿Qué módulo primero? | **Libro de Clases Digital** | Es lo que la Circular N°30 vuelve obligatorio y lo que se fiscaliza en marzo. Es donde el mercado sigue con planillas y portapapeles. |
| ¿Firma con el verificador de identidad? | **Sí, desde el primer release** | Sin firma, el libro digital no vale para la fiscalización y el módulo pierde su razón de ser. |
| ¿Esquema de Prisma? | **Un solo archivo, sección marcada** | El multi-archivo es GA desde Prisma 6.7, pero hay un bug reportado en Prisma 7.0.0 y no voy a tocar el pipeline de migraciones de producción por una reorganización de archivos. |

**Pendiente de responder** (no bloquea los cimientos): nombre del producto, alcance de niveles y etapas,
si el cliente es el sostenedor o el colegio, y si el cobro de aranceles con Webpay entra desde el día uno.

---

## 1. Qué vende un ERP escolar en Chile

Consenso del mercado (fuente: guía de FullCollege, análisis de Colegium, sitios de DataEduc,
TECED, Codinex):

| Área | Contenido |
| --- | --- |
| Académico | Matrícula, ficha de alumno, notas y evaluaciones, asistencia, planificación, libro digital, reportes académicos |
| RRHH y remuneraciones | Fichas de funcionarios, contratos, jornadas, haberes, descuentos, liquidaciones, finiquitos, asistencia de funcionarios, **carrera docente**, información para rendición |
| Contabilidad | Contabilidad, Sixteen preventiva, control presupuestario, **rendición ante la Superintendencia** |
| Asistencia | Métodos de marcación, jornadas, horarios, turnos, excepciones, permisos, integración con remuneraciones, trazabilidad |
| Documental | Contratación, modificaciones contractuales, generación de documentos, finiquitos, certificados |
| Comunicación | Comunicados, mensajes, circulares, portal de apoderados,YPE, alertas |
| Analítica | Indicadores, metas, reportes para dirección, UTP y sostenedor |

Y en la Selector de precios de FullCollege: **$2.000.000 anuales desde, sin límite de usuarios**,
con implementación de 3 a 5 días hábiles.

## 2. La normativa que diferencia (y que un ERP genérico no tiene)

| Norma | Estado | Qué obliga al software |
| --- | --- | --- |
| **Circular N°30** (Superintendencia de Educación) | Vigente; transición al libro digital en curso | El **Libro de Clases Digital** con contenidos mínimos: asistencia por curso y asignatura (atrasos, retiros, justificaciones), leccionario, calificaciones con ponderaciones y promedios, anotaciones de convivencia, **Libro PIE** (NEEP/NEET), accidentes, salidas y eximidos. Debe **exportar el archivo EDE** para fiscalización, con **respaldo exportable** y **trazabilidad** (autor, fecha y correcciones de cada registro). |
| **Verificador de identidad** (MINEDUC) | Vigente | El docente firma el libro con un **código dinámico** (tipo PIN bancario) que obtiene con **Clave Única** en `tramites.mineduc.cl`. La Superintendencia exige firma + doble autenticación. El MINEDUC publica el **Estándar de datos para la educación** en `ede.mineduc.cl/desarrolladores` (specs del archivo EDE). |
| **Decreto 67** (2018) | Vigente | Criterios de evaluación y promoción. El número que todos los colegios manejan: **asistencia mínima 85%** para promover, además de las notas. |
| **Ley 21.809** (Convivencia, Buen Trato y Bienestar) | Promulgada abr-2026, **vigente desde 1-jul-2026** | Marco de acción contra acoso, discriminación y violencia; exige **Plan de Gestión de Convivencia** y protocolos con plazos; registro de denuncias y seguimiento. |
| **Ley 21.719** (Protección de Datos Personales) | Publicada dic-2024, **vigente desde 1-dic-2026** | Reemplaza la 19.628, crea la **Agencia de Protección de Datos Personales**, exige consentimiento, licitud, ARCOP y **portabilidad en JSON/CSV**. Aplica a **datos de menores de edad**. |
| **Subvenciones** | Vigente | Rendición de información ante la Superintendencia / Unidad de Subvención para los establecimientos subvencionados; los SLEP reportan a su koordinasi |
| **Registro Escolar / SIE** (MINEDUC) | Vigente | El establecimiento debe mantener el registro de matrícula de los alumnos. |

**Conclusión estratégica:** el diferencial real de un SaaS escolar chileno no es «tener notas y
asistencia» (eso lo tiene cualquiera), es **cumplir la Circular 30 con el archivo EDE y la firma
del verificador**, **calcular la promoción por el Decreto 67**, y **gestionar la convivencia con
la Ley 21.809** encima, con los datos de menores bajo la 21.719.

## 3. Arquitectura: módulo en esta plataforma, no proyecto aparte

**Decisión propuesta:** un módulo nuevo en este mismo repo, no un repositorio separado.

Por qué (concreto, no por gusto):

1. **La plataforma multi-tenant ya está y está endurecida**: `Organization` (→ sostenedor),
   `Company` (→ en Colegios: establecimiento), membresías por empresa, roles, planes con límites y
   uso, 2FA para dueños, auditoría de plataforma, la consola `/admin`, el `proxy` de sesión, el
   registro de accesos. Todo eso se reutiliza tal cual.
2. **El aislamiento por `companyId` calza**: en Colegios el aislamiento es por `schoolId` (establecimiento)
   y el `Organization` es el **sostenedor** que puede tener varios colegios. Es el mismo patrón.
3. **El registro de módulos ya existe** (`src/lib/modules.ts`) y el plan de arquitectura del repo ya
   anticipaba `src/app/(app)/[modulo]/…` (`PLAN-SAAS.md` §7.2). Con 2+ módulos, el login pasa por
   `/modulos` y aparece el selector: la mecánica ya está hecha.
4. **Una consola, dos negocios**: el operador ve en el mismo tablero los clientes de Facturas y los
   de Colegios.

Contra (y por qué no pesan): un repo aparte duplicaría auth, planes, límites, 2FA, auditoría y
consola: 2-3 semanas de plataforma repetida y el doble de mantenimiento. El único argumento fuerte a
favor del repo aparte es el **acoplamiento de datos**: el dominio escolar (matrícula, cursos, notas)
no se parece en nada al de facturación, y un solo `schema.prisma` terminó con 47 tablas. Se
resuelve con el **schema de Prisma en carpeta** (una carpeta por módulo) o, si no, con secciones
muy marcadas en el schema.

```
/modulos              → Facturas | Colegios
/facturas/...         → el ERP de hoy, sin tocar
/colegios/...         → el módulo nuevo
/admin/...            → una consola, dos negocios
```

## 4. Modelo de datos del módulo

```
School            (establecimiento)  schoolId, RUT, nombre, dirección, nivel, sostenedorId
  └ Course        (curso)          "3°Básico", año, jornada, nivel
      └ Enrollment             matrícula de un estudiante en un curso
Student           (estudiante)      RUT, nombre, fecha nac., XV, colegio anterior
Guardian          (apoderado)      RUT, nombre, correo, teléfono
Guardianship      (vínculo)        apoderado ↔ estudiante, tipo (titular/suplente), escolaridad
Teacher           (docente)         RUT, nombre, asignaturas, carrera docente
Staff             (funcionarios)    porteros, asistentes, EEA, administración
Subject           (asignatura)      Matemática, Lenguaje, ...
TeachingAssignment                  docente × curso × asignatura, horas semanales
AttendanceRecord                     fecha × curso × asignatura, estado (presente/ausente/atraso/justificado), tipo
Justification                        retiro, justification médica, licencia
Grade                                nota, período, tipo (diagnóstico/formativa/sumativa)
Assessment                           evaluación, ponderación, fecha
ClassLogEntry                        registro de clase: contenidos, actividades, asistencia
Incident                             convivencia: anotación, tipo, gravedad, estado
IncidentProtocol                     protocolo, plazo, acciones, cierre
Fee                                  arancel mensual, monto en UF o CLP, allergens
ArancelPayment                        pago del apoderado, medio, estado
Document                             documentos del alumno (ficha de salud, consentimientos)
AuditEntry (libro)                   quién registró qué y cuándo (exigido por la Circular 30)
```

**Nada de esto se inventa de la nada**: el modelo de la Circular 30 y el Decreto 67 ya definen qué
registros existen. La Circular 30 es, literalmente, la especificación del producto.

## 5. Módulos vendibles del producto

| Código | Módulo | Qué incluye | Nota |
| --- | --- | --- | --- |
| `academico` | Académico | Matrícula, estudiantes, cursos, asignaturas, notas, evaluaciones, reportes, promoción | El núcleo |
| `asistencia` | Asistencia y Libro de Clases Digital | Asistencia por curso/asignatura, leccionario, registro de clases, archivo EDE, firma con verificador | **El diferencial** |
| `comunicacion` | Comunicación | Circulares, mensajes, portal del apoderado, alertas de inasistencia, citaciones, entrevistas | El módulo que más se usa todos los días |
| `cobranza` | Aranceles y cobranza | Aranceles en UF/CLP, pagos (Webpay), portal de pagos, deuda, recibos, morosidad | El que produce caja |
| `convivencia` | Convivencia y protocolos | Denuncias, protocolos Ley 21.809, plazos, Plan de Gestión de Convivencia | El que evita el problema grave |
| `pie` | PIE / NEE | Libro PIE, planes de apoyo, seguimiento | Difícil de vender al principio |
| `administracion` | Administración | Funcionarios, contratos, jornadas, asistencia de funcionarios, licenses, documentos | Se vende con la cuenta |

**Empezar por los cuatro primeros.** Los últimos dos son expansions.

## 6. Las fases

| Fase | Contenido | Entregable verificable |
| --- | --- | --- |
| **C0. Cimientos** *(hecho)* | Módulo en el registro, `School`/`Course`/`Student`/`Guardian`/`Teacher`/`Subject`, roles del colegio, selector de establecimiento, la consola ve ambos negocios | Un colegio con sus cursos y sus alumnos; se entra por `/modulos` |
| **C1. Matrícula y ficha** *(hecho 20-10-2026)* | Matrícula (alta, traslado, retiro), ficha del estudiante, apoderados, documentos, consents | El expediente del alumno completo, exportable |
| **C2. Asistencia + Libro de Clases Digital** | Asistencia por curso/asignatura, atrasos/retiros/justificaciones, leccionario, registro de clases, **archivo EDE exportable**, **firma con el verificador de identidad** | El colegio puede entregar el libro digital en una fiscalización |
| **C3. Calificaciones y promoción** *(hecho 20-10-2026)* | Evaluaciones con ponderación, promedios, **promoción según el Decreto 67 (85% + notas)**, actas, certificados | El parte de notas del período y la promoción con el fundamento |
| **C4. Comunicación** *(hecho 21-10-2026)* | **Portal del apoderado**, circulares, mensajes, alertas de inasistencia, citaciones | El apoderado ve la asistencia y las notas de su hijo, recibe los comunicados y justifica inasistencias desde el celular |
| **C5. Aranceles y cobranza** | Aranceles en UF y CLP, emisión, **pago con Webpay**, portal de pagos, deuda, recibos, morosidad | Un apoderado paga el arancel y recibe el recibo |
| **C6. Convivencia** *(hecho 21-10-2026)* | Denuncias, protocolos con plazos (Ley 21.809), Plan de Gestión de Convivencia, registro | El caso se sigue con plazo y responsable |
| **C7. Administración y reporting** | Funcionarios, contratos, jornadas, asistencia de funcionarios, reportabilidad para la dirección | La dirección ve sus indicadores |
| **C8. Cobro real** | Flow / Mercado Pago para el SaaS (en el plano de la cuenta, no del arancel) | El SaaS se factura |

### El portal del apoderado (diseño, 21-10-2026)

Es la pieza que hace que el colegio se use **todos los días**, no una vez al mes. Pero es también
la primera superficie **pública** del producto: por primera vez los datos de un menor quedan
accesibles desde internet. Por eso va con diseño, no como un "extra".

**Quién entra.** El apoderado de uno o más alumnos del colegio. **No es un empleado**: no tiene
`Membership` ni `SchoolMembership`. Es un tercer tipo de usuario, y por eso va fuera del módulo
`/colegios` (ese layout exige una membresía del colegio) en su propia ruta: `/apoderado`.

**Cómo entra (v1).** Un **código de acceso por familia**, que el colegio entrega en persona (en la
reunión de apoderados, como hoy se reparte la libreta de notas). Decisiones:

- El código se guarda en `Guardian.accessCode` (aleatorio, largo y **rotable** por el colegio).
- **No hay correo ni SMS**: el proyecto no tiene proveedor de mensajes, y el correo del apoderado en
  la base suele estar vacío o equivocado. Agregar un canal dependable es trabajo para después, y
  mientras tanto el código es lo que se puede entregar de verdad.
- Es un **secreto de la familia**, no de la persona: con él se ven todos los hijos de esa familia.
- Se **limitan los intentos** por IP (como el login) y se registran los accesos (el `AccessLog` que
  ya existe alcanza: `kind = "portal_login"` / `"portal_failed"`), para que el colegio pueda
  responder "quién entró y cuándo".
- Si más adelante se quiere más seguridad, el segundo factor natural es el **RUT de un hijo**: el
  portal puede pedirlo sin cambiar nada del modelo. Queda anotado como decisión del colegio.
- La referencia de seguridad es honesta: hoy la información del alumno viaja en una libreta de notas
  de papel que cualquiera puede mirar por encima del hombro. El portal, con código, sesión con
  vencimiento y registro de accesos, es **más** seguro que eso.

**Qué ve la familia** (de cada uno de sus hijos, y solo de sus hijos):

| Sección | Qué encuentra |
| --- | --- |
| **Asistencia** | El porcentaje de cada curso y si cumple el 85% (con el fundamento), los últimos registros, las inasistencias con su justificativo y los permisos/autorizaciones |
| **Notas** | Las notas por asignatura y período, el promedio final y la situación de promoción con su fundamento legal. Es el mismo cálculo del acta, no una versión aparte |
| **Comunicados** | Las circulares del colegio (y de su curso), con la fecha y si ya las leyó |
| **Citaciones** | Las entrevistas o reuniones agendadas, con fecha, motivo y con quién |
| **Documentos** | Solo los que el colegio **compartió con la familia** (un documento del expediente lleva su marca; la ficha médica y el documento de custodia **no** se exponen por defecto) |

**Qué puede hacer la familia** (esto es lo que lo vuelve útil, y no solo un tablero de lectura):

- **Justificar una inasistencia**: elige el registro, explica y adjunta el certificado. Queda como
  *solicitud*: el colegio la acepta o la rechaza. **La familia no cambia la asistencia por su
  cuenta** — eso la acepta o la rechaza la secretaría, que es quien responde por el registro.
- **Acusar recibo** de un comunicado (queda el acuse de lectura, que es lo que le sirve al colegio
  para saber si llegó).
- **Confirmar o reagendar** una citación.

**Qué gana el colegio** (el otro lado de la misma pantalla):

- Las **circulares con acuse de lectura** por familia: quién leyó y quién no. Hoy eso se sabe
  preguntando uno por uno.
- Las **alertas de inasistencia**: los alumnos que acumularon faltas sin justificar, para que la
  secretaría llame al apoderado. La Ley 21.809 y el propio reglamento obligan a hacer seguimiento.
- Los **pendientes**: justificaciones propuestas por las familias y citaciones pedidas, en una
  bandeja única.
- Quién tiene acceso al portal y cuándo entró por última vez.

**Lo que el portal NO va a mostrar** (y por qué): el libro de clases completo con los contenidos de
cada clase (es del colegio, no de la familia), las fichas de otros alumnos, el historial de
conducta (eso es de la convivencia y requiere su propio cuidado), y los documentos sensibles del
expediente salvo que el colegio los marque como compartidos.

**Cómo se construye** (para que quede el orden de trabajo):

1. ✅ **El acceso** (hecho 21-10-2026): `Guardian.accessCode` + el portal en `/apoderado`, con su
   propia sesión (`GuardianSession`, cookie `facturas_apoderado`, aparte de la del empleado) y el
   registro de accesos (el `AccessLog` que ya existe, con `kind = "portal_login"`).
2. ✅ **La pantalla del apoderado** (hecho 21-10-2026): asistencia (con el 85%), notas por asignatura
   y período, promedio y situación de promoción. Es el mismo cálculo que ve el colegio.
3. ⬜ **Las circulares** con acuse de lectura por familia.
4. ⬜ **La justificación de inasistencias** (solicitud de la familia, aceptar o rechazar en el
   colegio) y las **citaciones**, con la bandeja de pendientes del colegio.

**Lo que ya está hecho del portal** (21-10-2026, migración `20261026250000_guardian_portal`):

- El código se genera desde la ficha del alumno ("Dar acceso al portal", y "Rotar código" cuando ya
  existe) y se muestra en pantalla para que el colegio se lo entregue. **Al rotarlo se cortan las
  sesiones abiertas**: el código es el mismo secreto, y si cambió es para cortar el acceso.
- El portal vive fuera de `/colegios` a propósito (ese layout exige membresía del colegio) y **el
  apoderado no usa la sesión de empleados**: es un tercer tipo de usuario.
- Intentos limitados por IP (10 cada 15 minutos, con el mismo `RateLimiter` del login) y **acierto no
  gasta intento**: una familia que se equivoca una vez y acierta al segundo tiene que poder entrar.
- Los accesos quedan en el registro. Ojo: **el código que se intentó no se escribe en el log** (puede
  ser el válido de otra familia); queda la IP, la hora y una marca genérica.

**Riesgos que hay que tener a la vista** (del §7): exponer datos de menores por internet sin
verificación de la identidad es el riesgo grande de este módulo. Mitigaciones: código rotable,
sesiones con vencimiento, límite de intentos, registro de accesos, y que el colegio sea quien
entrega el código en persona.

### Estado de C0 (20-10-2026): implementada y verificada

- **Schema** (migración `20261026170000_school_domain`): `School`, `SchoolMembership`, `Course`, `Student`,
  `Guardian`, `Guardianship`, `Teacher`, `Subject`, `TeachingAssignment`, `Enrollment`, con los enums
  `SchoolRole` (DIRECTOR, UTP, ADMIN, TEACHER, STAFF, VIEWER), `SchoolLevel` y `StudentStatus`.
- **Aislamiento por colegio**: `SchoolMembership` es el equivalente escolar de `Membership` (que es de
  empresas), y la cookie del colegio es aparte de la de la empresa: una persona puede estar en un
  colegio y en una empresa a la vez.
- **Permisos propios** (`src/lib/school-permissions.ts`): un colegio y una empresa no se gobiernan
  igual, y mezclar los dos roles haría imposible de explicar quién ve qué.
- **El registro de módulos aprendió a filtrar por acceso**: `AppModule.hasAccess`. Una persona sin
  colegio no ve la tarjeta de Colegios (una tarjeta que lleva a ninguna parte es peor que no tenerla),
  y si solo tiene un módulo entra directo, sin selector.
- Verificado: el selector muestra las dos tarjetas con su estado real; `/colegios` muestra el colegio
  con sus métricas y cursos; un usuario sin colegio rebota a `/modulos`; Facturas sigue intacto.

### Estado de C3 (20-10-2026): implementada y verificada en local

La C3 se armó sobre el **Decreto 67/2018** (no el de 2009: aquel fue derogado por el de 2018, que
deroga los decretos exentos 511/97, 112/99 y 83/01). El texto se bajó y se leyó antes de escribir
una línea de cálculo, porque acá una cifra mal puesta no es un detalle: decide si un alumno pasa de
curso.

- **Schema** (migraciones `20261026220000_school_grades` y `20261026221000_subject_promotion_flag`):
  `GradingPeriod` (el semestre o trimestre del colegio, con su ponderación), `Evaluation` (la
  evaluación de una asignatura en un período, con su ponderación) y `Grade` (la nota de un alumno
  en una evaluación, con quién la puso y cuándo). En `Subject`, el campo `countsForPromotion` marca
  si la asignatura incide en el promedio final: es el Art. 7, que saca de la cuenta a Religión,
  Consejo de Curso y Orientación.
- **La matemática vive en un solo lugar** (`src/lib/school-grading-math.ts`): el promedio ponderado
  y el redondeo a un decimal (Art. 8) son la misma función para el servidor y para el cliente. Si
  fueran dos, el promedio de la pantalla y el del acta terminarían discrepando.
- **La regla de promoción** (`src/lib/school-grades.ts` → `situaciónPromocion`): aplica el Art. 10
  (aprobó todo, o reprobó una con promedio 4.5 o más, o reprobó dos con promedio 5.0 o más, **y**
  tiene 85% de asistencia anual) y, cuando no se cumple, **marca el caso para el análisis del
  Art. 11** en vez de declararlo repitente: esa decisión es del establecimiento, con informe del
  jefe técnico-pedagógico, y no del sistema.
- **La asistencia anual se consulta una vez** (`attendanceByStudents`): el acta de un curso con 40
  alumnos no puede hacer una consulta por persona.
- **La pantalla del docente** (`/colegios/calificaciones`): elige curso, período y asignatura, ve
  las evaluaciones y abre la hoja de notas. El promedio se calcula **mientras escribe**, con la
  misma matemática del acta.
- **El acta de promoción** (`/colegios/promocion`): tiene lo que pide el Art. 20 — la nómina
  completa (con el RUT o el identificador provisorio escolar), las calificaciones finales por
  asignatura, el promedio final anual, el porcentaje de asistencia y la situación final de cada
  alumno —, más el fundamento de cada caso y la lista de los que requieren análisis. La que se
  entrega al MINEDUC se emite con el SIGE y solo la firma el director.
- **Regla del Art. 18 h)**: la evaluación final de un período no puede pesar más del 30%, y la
  acción lo hace cumplir.

Verificado en local con el colegio de ejemplo: Ana (promovida por el Art. 10.1.a), Beto (promovido
por el Art. 10.1.b: reprobó Matemática con promedio 4.6) y Carla (requiere análisis: 0% de
asistencia).

**Lo que NO se hizo de la C3** (a propósito, por lo acordado): el flujo de excepciones del Art. 11
(el informe de la UTP, la autorización de excepción de asistencia por dirección+UTP y la resolución
caso a caso). La primera versión calcula la regla y marca los casos; resolverlos es lo que sigue.

### Estado de C1 (20-10-2026): implementada y verificada en local

Hasta acá el módulo Colegios **no era operable**: las acciones existían (`createStudent`, `createCourse`,
`saveClassSession`) pero ninguna tenía formulario, así que un colegio no podía matricular a un alumno,
crear un curso ni registrar una clase. La C1 cierra ese hueco.

- **Matrícula con historial** (`src/app/actions/school-enrollment.ts`): alta de alumno (nombre, RUT,
  fecha de nacimiento) y matrícula en un curso, en un solo paso; matriculación de un alumno que ya
  está en el colegio; **traslado** (cierra la matrícula del curso anterior con su motivo y abre la
  nueva) y **retiro** (cierra la matrícula con su motivo). La matrícula guarda `statusReason` y
  `endedAt` (migración `20261026230000_enrollment_history`): el curso anterior sigue contando para la
  asistencia y las notas de lo que ya cursó, y el motivo queda explicito.
- **El estado del alumno y su historial no se contradicen**: si a un alumno se le cierran todas sus
  matrículas activas, queda como retirado en el colegio.
- **Docentes**: alta de docente y **asignaturas** (`Subject`), y la **asignación** de asignatura +
  docente a un curso (`TeachingAssignment`), que es el plan del curso: sin plan no hay clase, y sin
  clase no hay nota ni asistencia. La página `/colegios/docentes` es nueva.
- **Registro de clase** (lo que faltaba de la C2): el formulario del leccionario que pide la Circular
  N°30 (contenidos, actividades y objetivos) cuelga de `/colegios/asistencia`, y la clase creada se
  abre directo a marcar la asistencia.
- **Apoderados**: alta, edición, vínculo con el alumno (titular, suplente, emergencia) y desvinculo.
  El apoderado es la contraparte de todo lo que hace el colegio: el que recibe las comunicaciones, el
  que paga y el que autoriza.
- **La ficha del alumno** (`/colegios/estudiantes/[id]`) ahora es el expediente completo: matrícula con
  su historial, apoderados, asistencia con el 85%, **las notas por asignatura y período** (el mismo
  cálculo que el acta) y la situación de promoción con su fundamento. Y hay una versión
  **imprimible** (`/colegios/estudiantes/[id]/expediente`): un solo documento con todo, para cuando lo
  piden.
- **Las fechas de calendario se guardan al mediodía UTC**: al mediodía, ningún cambio de zona horaria
  del servidor corre la fecha de día.

Verificado en local: alta de alumno, traslado (la matrícula anterior queda con su motivo), retiro
(el alumno queda retirado), alta de docente, registro de clase y la ficha con sus notas.

**Lo que NO se hizo de la C1** (a propósito): los **documentos y consentimientos** quedaron para
después, porque había que decidir dónde se guardaban los archivos de los menores. Se resolvieron el
21-10-2026: el proyecto **ya tenía la convención** (los documentos del trabajador en el módulo de
Facturas, `WorkerDocument.fileData`, se guardan en la base), así que los del alumno van al mismo
lado. Y con eso se cierra la C1 entera:

- **Documentos del expediente** (`StudentDocument`, migración `20261026240000_student_documents`):
  certificado de nacimiento, certificado de estudios, ficha médica, documento de custodia u otro. El
  archivo (hasta 5 MB) queda en la base con su nombre, su tipo MIME y quién lo subió; se descarga
  por una ruta que **verifica que el documento sea de ese alumno y de ese colegio**.
- **Consentimientos** (`StudentConsent`): uno por fin, porque la Ley 21.719 pide que el consentimiento
  sea específico y no un "sí" a todo. Los fines son datos personales, fotografías, salud, actividades
  extraescolares y viajes; queda quién lo firmó, cómo y cuándo; y **se puede revocar** (con el
  motivo). El estado de cada uno se ve de un vistazo en la ficha.
- **Portabilidad de datos** (art. 12 de la Ley 21.719): `/colegios/estudiantes/[id]/portabilidad`
  devuelve un JSON con todo lo que el colegio tiene del alumno (datos, matrículas, apoderados,
  asistencia, notas, permisos, registros, consentimientos y documentos). Es lo que la familia puede
  pedir.

### Estado de C4 (21-10-2026): implementada y verificada en local

La comunicación es el módulo que se usa **todos los días**, así que va de las dos puntas: lo que el
colegio manda y lo que la familia responde. Esta primera versión tiene las tres piezas que la
familia necesita para no tener que llamar al colegio.

- **Schema** (migración `20261026260000_school_communication`): `Circular` (el comunicado, con su
  destinatario: todo el colegio, un curso o una familia), `CircularAck` (el acuse de lectura),
  `JustificationRequest` (la justificación que propone una familia) y `Appointment` (la citación).
- **Las circulares con acuse de lectura**: el colegio publica y ve **quién leyó y quién no**, con
  la lista de los que falta. Es el dato que hoy se averigua preguntando uno por uno.
- **La justificación de inasistencias**: la familia elige la clase que el hijo faltó, pone el
  motivo y el detalle del certificado, y lo envía. **La familia no cambia la asistencia por su
  cuenta**: queda como solicitud, y la secretaría la acepta o la rechaza. Al aceptarla, el registro
  pasa a "justificada" con la fecha de la resolución y quién la resolvió.
- **Las citaciones**: el colegio agenda una entrevista con la familia (fecha, duración, lugar) y la
  familia la confirma o dice que no puede.
- Del lado del colegio, `/colegios/comunicacion` tiene la **bandeja de pendientes** (lo que las
  familias esperan respuesta), las circulares con su conteo de lectura y los formularios de alta.

Verificado en local: una circular publicada para todo el colegio (2 familias, 1 leída), el acuse
desde el portal, la justificación propuesta por la familia de Beto, la aceptación en la secretaría
(y el registro de asistencia pasó a "justificada" con su motivo), y la citación agendada.

### Estado de C6 (21-10-2026): implementada y verificada en local

La **Ley 21.809** (publicada el 1-abr-2026, vigente desde el 1-jul-2026) cambió el reglamento interno de
convivencia escolar. Antes de escribir una línea se leyó la norma y sus obligaciones, porque acá el
sistema tiene que ayudar a que el colegio cumpla, no a que anote cosas:

- **El plazo de la investigación no lo elige el colegio**: la ley fija que la investigación interna
  de un caso de alumno no puede pasar de **2 meses** (60 días). El sistema calcula ese vencimiento
  al abrir el caso y avisa cuando se vence o cuando se acerca (15 días). Es el número que la ley
  quiso que se notara, y por eso vive en el código y no en un campo editable.
- **El protocolo con plazos definidos**: el reglamento interno tiene que traer procedimientos de
  investigación con plazos. Los protocolos del colegio (`ConductProtocol`) se escriben con sus
  etapas y su plazo en días, en el formato en que están escritos en el RICE ("nombre | días |
  responsable"), sin obligar a nadie a escribir JSON.
- **La comisión de expulsión**: antes de una medida de expulsión o de cancelación de matrícula, la ley
  exige el informe de una comisión (profesor jefe, coordinador de convivencia y un
  técnico-pedagógico). El sistema **no deja cerrar el caso con una expulsión sin ese informe**.
- **El Plan de Gestión de la Convivencia Escolar**: obligatorio, con las áreas que la ley menciona
  (participación, igualdad, resolución pacífica, mediación, cuidados y responsabilidades digitales,
  desarrollo socioemocional y salud mental), con la **revisión participativa cada 4 años** y la
  **constancia de que se entregó copia a las familias** (que es lo que la ley pide).
- **Canales de denuncia confidenciales**: el registro del caso es interno del colegio; lo que la
  familia ve del caso es lo que el colegio comparte, y hoy la familia ve su asistencia, sus notas y
  los comunicados, no el historial de convivencia de su hijo.

- **Schema** (migración `20261026270000_school_convivencia`): `ConductCase` (el caso, con su
  vencimiento legal), `CaseParticipant` (quiénes y en qué calidad), `ConductAction` (las etapas con
  su plazo, su responsable y su resultado), `ConductProtocol` (los protocolos con sus etapas) y
  `ConvivenciaPlan` + `PlanActivity` (el plan de gestión).
- **Las pantallas**: `/colegios/convivencia` (los casos con su urgencia, las etapas por hacer y el
  alta de casos), `/colegios/convivencia/casos/[id]` (el caso etapa por etapa), `/protocolos` y
  `/plan`.

Verificado en local: caso reportado con el vencimiento legal de 60 días calculado, etapas con su
plazo, el rechazo del cierre sin informe de comisión cuando hubo expulsión, y el plan con su acción
y su fecha de revisión.

### Estado de C2 (20-10-2026): implementada y verificada en local

- **Schema** (migración `20261026180000_class_book`): `ClassSession` (la clase dictada: curso + asignatura +
  docente + fecha + período, con el contenido de la clase), `AttendanceRecord` (la asistencia de un alumno en
  una clase, con su justificativo) y `StudentAbsence` (permisos, licencias y retiradas anticipadas).
- **Trazabilidad**: cada clase y cada registro guardan **quién** lo registró y **cuándo**. La Circular N°30 la
  pide: en una fiscalización hay que poder identificar al autor de cada dato y sus correcciones.
- **El 85% del Decreto 67** (`src/lib/school-attendance.ts`): el requisito de promoción. La regla de conteo
  queda explícita y auditable: cuentan la presencia, los atrasos y las justificadas; la falta sin justificar
  no; y las eximidas (permisos, licencias) no suman ni restan. Cuando un curso no tiene clases
  registradas, la pantalla dice «sin clases registradas» en vez de un 100% engañoso.
- **La pantalla del docente** (`/colegios/asistencia`): elige la clase y marca. La ficha del alumno
  (`/colegios/estudiantes/[id]`) muestra el porcentaje por curso y cuántos atrasos le faltan para llegar
  al 85%.
- **La exportación al MINEDUC** (`src/lib/school-ede.ts` + `/colegios/libro/export`): genera el `json.zip`
  con la estructura exacta que espera el contenedor del MINEDUC.

**El contrato real de la exportación** (está en el repositorio del propio MINEDUC,
<https://github.com/Admin-EDE/DockerEdeCode>, y en la imagen `edemineduc/etl`):

```json
{
  "<JSONGroup>": [              // _Establecimientos, _Personas, _ComunidadEducativa, _Cursos…
    { "<Table>": [ { "<Column>": valor } ] }   // columnas del NDS Reference v7.1
  ]
}
```

Los grupos y las tablas son del MINEDUC, no de CEDS puro; las columnas sí son de CEDS v7.1 con sus
extensiones (por eso `RoleAttendanceEvent` trae `firmaRatificador`, `oprIdRatificador` y `fechaRatificador`:
la firma del verificador de identidad).

Lo que genera hoy: `K12School`, `Person`, `PersonIdentifier`, `PersonEmailAddress`, `PersonTelephone`,
`OrganizationPersonRole` (la matrícula), `RoleAttendanceEvent` (la asistencia), `RoleAttendance` (el
resumen con `AttendanceRate`), `K12Course` y `CourseSectionSchedule` (el horario).

Para validarlo en local hace falta Docker:

```
docker run -it --rm --name etl -v <carpeta>:/usr/src/ede -w /usr/src/ede \
  edemineduc/etl python3 parseCSVtoEDE.py parse json ./json.zip
docker run -it --rm --name etl -v <carpeta>:/usr/src/ede -w /usr/src/ede \
  edemineduc/etl python3 parseCSVtoEDE.py insert
docker run -it --rm --name etl -v <carpeta>:/usr/src/ede -w /usr/src/ede \
  edemineduc/etl python3 parseCSVtoEDE.py check {frase_secreta} ./file.db
```

**Lo que falta para la fiscalización** (y por qué no se hizo aún):

| Falta | Por qué |
| --- | --- |
| **Registro de convivencia** | Es la C6: anotaciones positivas, negativas y observaciones con su trazabilidad (Ley 21.809). |
| **Libro PIE** | Planes de apoyo de los NEEP/NEET (`ServicePlan` del EDE). |
| **Firma con el verificador de identidad** | El docente valida cada registro con su código dinámico (trámite en `tramites.mineduc.cl` con Clave Única). La plataforma debe guardar el resultado en `firmaRatificador`. |
| **Calendario escolar** | La Circular N°30 exige que el registro esté al día durante todo el año, no el día de la visita. Es la tabla `_Calendarios` del EDE. |
| **Códigos de referencia** | `RefSchoolLevelId`, `RefAttendanceStatusId` y compañía usan las tablas de referencia del MINEDUC; los valores que se usan hoy son los habituales, pero hay que confirmarlos contra el validador. |
| **Las calificaciones en el EDE** | La C3 ya calcula los promedios y el acta, pero todavía no se exportan al `json.zip`: falta la tabla de calificaciones del contrato del MINEDUC. |

## 7. Riesgos (y cómo se miran de frente)

| Riesgo | Por qué importa | Mitigación |
| --- | --- | --- |
| **El EDE es un estándar técnico del MINEDUC** | Si el archivo no valida, el colegio no puede usarlo para la fiscalización y el módulo no sirve | Leer las specs en `ede.mineduc.cl/desarrolladores` ANTES de escribir la C2; validar contra el validador oficial |
| **La firma con Clave Única es un trámite del docente** | Sin el trámite, el docente no puede firmar: el libro no vale | La plataforma avisa el estado del trámite y deja firmar a quien no lo tiene (con la marca de "pendiente de firma") |
| **Datos de menores bajo la Ley 21.719** (vigente 1-dic-2026) | Sanciones de la Agencia; además el colegio es el titular de los datos | Consentimiento registrado, portabilidad JSON/CSV, trazabilidad, mínimo de datos |
| **El mercado ya tiene 4-5 plataformas completas** | FullCollege lleva 27 años y tiene contabilidad, subvenciones, remuneraciones | No competir en "todo": entrar por el **Libro de Clases Digital** y la **cobranza**, que es donde el mercado sigue usando planillas y portapapeles |
| **Un colegio es un cliente de soporte intensive** | 300 familias llaman por una nota | La comunicación y el portal del apoderado son el producto, no un extra |
| **Alcance desmedido** | El mercado completo son 6-9 meses | Empezar por C0-C3 y vender así; el resto se agrega por contrato |
| **Un solo módulo sin clientes reales** | Construir un año sin un colegio probándolo | Conseguir 1-2 colegios piloto ANTES de la C3 |

## 8. Decisiones pendientes (las que cambian el diseño)

Ya están tomadas: dónde vive, a quién se le vende, qué módulo va primero y si entra la firma del
verificador (§0). Quedan estas, que **no bloquean los cimientos**:

1. **¿Nombre del producto?** (Yellow ERP Colegios / Aula / Liceo / otro) — entra en el registro de
   módulos, la URL y la marca.
2. **¿Alcance de niveles y etapas?** ¿pre-básica a media, técnico, EPJA, jardín infantil? ¿o solo
   básica-media al principio? (El modelo ya acepta los cinco; lo que se decide es la interfaz.)
3. **¿El cliente es el sostenedor (varios establecimientos) o el colegio?** El modelo ya soporta
   ambos (`School.organizationId`), pero cambia la consola y el cobro.
4. **¿El cobro de aranceles con Webpay/Transbank desde el día uno?** (C5)
5. **¿El colegio necesita contabilidad propia?** (hoy está en el ERP de Facturas, que es de empresas
   con IVA; un sostenedor sin fines de lucro tiene reglas distintas)
6. **¿Aislamiento de datos por cliente en la base, o una base por colegio?** (hoy es una base con
   aislamiento por fila, igual que en Facturas)
7. **¿Cómo se entrega el código del portal del apoderado?** En persona en la reunión (lo que se
   asume en el diseño) o por correo. Cambia el nivel de confianza, no el modelo.
8. **¿Se pide el RUT de un hijo como segundo factor del portal?** El diseño lo deja abierto: es un
   campo más en la pantalla de entrada. Depends de cuánta fricción acepte el colegio.
9. **¿Qué documentos del expediente se comparten con la familia?** El diseño deja el archivo con una
   marca (compartido o no) y por defecto no se comparte nada.

## 9. Lo que NO se hará ahora

- Competir con FullCollege en ERP completo (remuneraciones + contabilidad + subvenciones) desde el día uno.
- El módulo de Recursos Humanos del personal del colegio (remuneraciones, carrera docente): es enorme
  y ya lo tiene el ERP de empresas.
- Planetary: la "aula virtual" y la IA para docentes. Es un mercado propio (Colegium lo llama Dia+).
- Atender a los tres segmentos a la vez:particular, subvencionado y municipal son tres productos.
