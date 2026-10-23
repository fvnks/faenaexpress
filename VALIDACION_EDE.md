# Checklist de Validación EDE (MINEDUC) — Para correr con `edemineduc/etl`

## Prerrequisitos
- Docker Desktop instalado y corriendo
- Frase secreta del MINEDUC (la entrega el MINEDUC al registrar el proveedor)
- Carpeta local para montar en el contenedor (ej: `D:\dockerETL`)

## 1. Generar el EDE de prueba
```bash
# Desde la raíz del proyecto
pnpm tsx scripts/generate-test-ede.ts
```
Esto crea `./test-ede/json.zip` con datos reales del colegio de prueba.

## 2. Levantar el contenedor
```bash
docker pull edemineduc/etl
docker run -it --rm --name etl \
  -v D:\dockerETL:/usr/src/ede \
  -w /usr/src/ede \
  edemineduc/etl python3 parseCSVtoEDE.py --help
```

## 3. Paso PARSE (JSON → CSV)
```bash
docker run -it --rm --name etl \
  -v D:\dockerETL:/usr/src/ede \
  -w /usr/src/ede \
  edemineduc/etl python3 parseCSVtoEDE.py parse json ./test-ede/json.zip
```
✅ Debe crear archivos CSV en `./csv/` (uno por tabla).

## 4. Paso INSERT (CSV → SQLite encriptada)
```bash
docker run -it --rm --name etl \
  -v D:\dockerETL:/usr/src/ede \
  -w /usr/src/ede \
  edemineduc/etl python3 parseCSVtoEDE.py insert
```
✅ Debe crear `ceds-nds-v7_1_encryptedD3.db` (la BD que valida el MINEDUC).

## 5. Paso CHECK (Validación completa)
```bash
docker run -it --rm --name etl \
  -v D:\dockerETL:/usr/src/ede \
  -w /usr/src/ede \
  edemineduc/etl python3 parseCSVtoEDE.py check <FRASE_SECRETA> ./ceds-nds-v7_1_encryptedD3.db
```
✅ **Si sale sin errores = el EDE es válido para fiscalización.**

---

## Códigos de Referencia a Validar (NDS v7.1)

| Tabla | Campo | Código Esperado | Fuente |
|-------|-------|-----------------|--------|
| `Organization` | `RefOrganizationTypeId` | `10` (K12School) | NDS Reference |
| `Organization` | `RefOrganizationIdentificationSystemId` | `48` (RBD), `49` (RUT) | NDS Reference |
| `Person` | `RefPersonIdentificationSystemId` | `51` (RUN), `52` (IPE), `55` (Matrícula) | NDS Reference |
| `Person` | `RefSexId` | `1` (Male), `2` (Female), `3` (NotSelected) | NDS Reference |
| `OrganizationPersonRole` | `RoleId` | `4` (Profesor Jefe), `5` (Docente), `6` (Estudiante), `11` (Admin), `15` (Apoderado), `18` (Retira) | Mapeo oficial |
| `RoleAttendanceEvent` | `RefAttendanceEventTypeId` | `1` (ClassSection) | listValidationData.xlsx |
| `RoleAttendanceEvent` | `RefAttendanceStatusId` | `1` (Present), `2` (Absent), `3` (Late), `4` (Justified), `5` (Excused) | listValidationData.xlsx |
| `RoleAttendanceEvent` | `RefPresentAttendanceCategoryId` | `2` (In school) | listValidationData.xlsx |
| `RoleAttendanceEvent` | `RefAbsentAttendanceCategoryId` | `2` (Absent) | listValidationData.xlsx |
| `RoleAttendanceEvent` | `RefCalendarEventTypeId` | `1` (Instructional), `2` (Holiday), `3` (Vacation), `4` (NonInstructional), `5` (EarlyDismissal), `6` (MakeupDay), `7` (Other) | **NUEVO: Calendario** |
| `RoleAssessment` | `RefAssessmentTypeId` | `1` (Diagnostic), `2` (Formative), `3` (Summative), `4` (Benchmark), `5` (Other) | **NUEVO: Calificaciones** |
| `RoleAssessment` | `RefAssessmentReportingMethodId` | `1` (Numeric), `2` (Letter), `3` (Pass/Fail), `4` (Other) | **NUEVO: Calificaciones** |
| `RoleAssessment` | `RefScoreMetricTypeId` | `1` (Points), `2` (Percent), `3` (ScaleScore), `4` (RawScore) | **NUEVO: Calificaciones** |
| `AssessmentScore` | `RefScoreMetricTypeId` | `3` (ScaleScore = 1.0–7.0 Chile) | **NUEVO: Calificaciones** |
| `Organization` | `RefSchoolLevelId` | `01` (Parvularia), `02` (Básica), `05` (Media HC), `07` (Media TP) | listValidationData.xlsx |
| `Organization` | `RefInstructionLanguageId` | `400` (spa) | NDS Reference |
| `Organization` | `RefCourseSectionDeliveryModeId` | `7` (FaceToFace) | NDS Reference |
| `Person` | `RefPersonLocationTypeId` | `2` (Mailing) | NDS Reference |

---

## Errores Comunes y Qué Revisar

| Error | Causa Probable | Solución |
|-------|----------------|----------|
| `KeyError: 'RefCalendarEventTypeId'` | Falta el campo en `OrganizationCalendarDay` | Verificar que `school-ede.ts` emita `RefCalendarEventTypeId` e `IsNonInstructional` |
| `KeyError: 'RefAssessmentTypeId'` | Falta tabla `_Calificaciones` | Verificar que `school-ede.ts` emita `RoleAssessment`, `AssessmentScore`, `AssessmentReportingPeriod` |
| `ValueError: invalid literal for int()` | Campo numérico con string vacío | Revisar `digitalRandomKey` vacío → debe ser `""` no `null` |
| `Duplicate key` en `OrganizationPersonRole` | Mismo alumno duplicado en `orgRolAlumnoEnCurso` | Verificar `orgRolAlumnoEnClase.set(\`${sesion.id}\|${asistencia.studentId}\`)` |
| `RefSchoolLevelId` inválido | Código de nivel no coincide con `listValidationData.xlsx` | Mapear `SchoolLevel` → código MINEDUC exacto |
| `digitalRandomKey` vacío en fila firmada | Firma no se está exportando | Verificar `firmasPorSesion.get(sesion.id)` y `digitalRandomKey: tieneFirma ? firma.otp : ""` |
| `oprIdRatificador` null | Ratificador no tiene RUN en `personaPorRut` | Verificar que el firmante sea docente con RUN o se cree como `ROLE.administrative` |

---

## Script de Generación de EDE de Prueba

Archivo: `scripts/generate-test-ede.ts`

```typescript
import { buildEdePayload } from "@/lib/school-ede";
import { db } from "@/lib/db";
import * as fs from "fs";
import * as path from "path";
import * as zlib from "zlib";

async function main() {
  // Busca un colegio con datos (el primero que tenga sesiones)
  const colegio = await db.school.findFirst({
    where: { sessions: { some: {} } },
    select: { id: true, name: true },
  });
  if (!colegio) throw new Error("No hay colegio con datos para probar");

  console.log(`Generando EDE para: ${colegio.name} (${colegio.id})`);

  const payload = await buildEdePayload(colegio.id);

  // Serializa igual que /colegios/libro/export
  const jsonString = JSON.stringify(payload, null, 0);
  const buffer = Buffer.from(jsonString, "utf8");
  const gzipped = zlib.gzipSync(buffer);

  const outDir = path.join(process.cwd(), "test-ede");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "json.zip"), gzipped);

  console.log(`✅ EDE generado en ${outDir}/json.zip (${gzipped.length} bytes)`);
  console.log("Grupos:", Object.keys(payload).join(", "));
}

main().catch((e) => { console.error(e); process.exit(1); });
```

---

## Cómo Ejecutar la Validación Completa (Resumen)

```bash
# 1. Generar EDE de prueba
pnpm tsx scripts/generate-test-ede.ts

# 2. Montar carpeta y parsear
docker run -it --rm --name etl \
  -v D:\dockerETL:/usr/src/ede \
  -w /usr/src/ede \
  edemineduc/etl python3 parseCSVtoEDE.py parse json ./test-ede/json.zip

# 3. Insertar en BD encriptada
docker run -it --rm --name etl \
  -v D:\dockerETL:/usr/src/ede \
  -w /usr/src/ede \
  edemineduc/etl python3 parseCSVtoEDE.py insert

# 4. VALIDAR (el paso clave)
docker run -it --rm --name etl \
  -v D:\dockerETL:/usr/src/ede \
  -w /usr/src/ede \
  edemineduc/etl python3 parseCSVtoEDE.py check "TU_FRASE_SECRETA_MINEDUC" ./ceds-nds-v7_1_encryptedD3.db

# Si el paso 4 termina sin errores → LISTO PARA FISCALIZACIÓN
```

---

## Próximos Pasos (cuando tengas Docker)

1. Instala Docker Desktop en la máquina de validación
2. Obtén la frase secreta del MINEDUC (registro de proveedor en `ede.mineduc.cl/desarrolladores/regístrese-en-ede`)
3. Ejecuta el script `scripts/generate-test-ede.ts`
4. Sigue los 4 pasos de arriba
5. Si hay errores, revisa la tabla "Errores Comunes" y corrige en `school-ede.ts` / `school-ede-codes.ts`
6. Repite hasta que el CHECK pase sin errores