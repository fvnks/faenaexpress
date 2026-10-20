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
| **C1. Matrícula y ficha** | Matrícula (alta, traslado, retiro), ficha del estudiante, apoderados, documentos, consents | El expediente del alumno completo, exportable |
| **C2. Asistencia + Libro de Clases Digital** | Asistencia por curso/asignatura, atrasos/retiros/justificaciones, leccionario, registro de clases, **archivo EDE exportable**, **firma con el verificador de identidad** | El colegio puede entregar el libro digital en una fiscalización |
| **C3. Calificaciones y promoción** | Evaluaciones con ponderación, promedios, **promoción según el Decreto 67 (85% + notas)**, actas, certificados | El parte de notas del período y la promoción con el fundamento |
| **C4. Comunicación** | Portal del apoderado, circulares, mensajes, alertas de inasistencia, citaciones | El apoderado ve la asistencia de su hijo y recibe los comunicados |
| **C5. Aranceles y cobranza** | Aranceles en UF y CLP, emisión, **pago con Webpay**, portal de pagos, deuda, recibos, morosidad | Un apoderado paga el arancel y recibe el recibo |
| **C6. Convivencia** | Denuncias, protocolos con plazos (Ley 21.809), Plan de Gestión de Convivencia, registro | El caso se sigue con plazo y responsable |
| **C7. Administración y reporting** | Funcionarios, contratos, jornadas, asistencia de funcionarios, reportabilidad para la dirección | La dirección ve sus indicadores |
| **C8. Cobro real** | Flow / Mercado Pago para el SaaS (en el plano de la cuenta, no del arancel) | El SaaS se factura |

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

## 9. Lo que NO se hará ahora

- Competir con FullCollege en ERP completo (remuneraciones + contabilidad + subvenciones) desde el día uno.
- El módulo de Recursos Humanos del personal del colegio (remuneraciones, carrera docente): es enorme
  y ya lo tiene el ERP de empresas.
- Planetary: la "aula virtual" y la IA para docentes. Es un mercado propio (Colegium lo llama Dia+).
- Atender a los tres segmentos a la vez:particular, subvencionado y municipal son tres productos.
