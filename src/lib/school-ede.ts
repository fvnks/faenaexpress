// Exportación del libro de clases al formato que espera el MINEDUC.
//
// El contrato está en el repositorio del propio MINEDUC
// (https://github.com/Admin-EDE/DockerEdeCode): el contenedor `edemineduc/etl`
// recibe un `json.zip` y lo transforma en los CSV que después valida.
//
// La estructura del JSON es:
//
//   {
//     "<JSONGroup>": [                    // _Personas, _Establecimientos, _Cursos…
//       {
//         "<Table>": [                   // K12School, Person, RoleAttendanceEvent…
//           { "<Column>": valor, ... }   // las columnas del NDS Reference v7.1
//         ]
//       }
//     ]
//   }
//
// Los grupos y las tablas NO son los de CEDS puro: el MINEDUC usa los suyos
// (`_Establecimientos`, `_Personas`, `_ComunidadEducativa`, `_Cursos`,
// `_Calendarios`, `_Evaluaciones`…). Las columnas sí son las de CEDS v7.1 con
// las extensiones del MINEDUC (por eso aparece `firmaRatificador` en los
// eventos de asistencia: es la firma del verificador de identidad).
//
// Ver `PLAN-COLEGIOS.md` §2 y la ficha de la pantalla de exportación.

import { db } from "@/lib/db";
import { formatDate } from "@/lib/money";

type Json = Record<string, unknown>;

/** Un registro del EDE con sus columnas. */
type Fila = Record<string, string | number | boolean | null>;

/**
 * Un bloque del grupo: el nombre de la tabla con sus filas DIRECTAMENTE debajo
 * (así lo lee el parser del MINEDUC: `grupo[tabla]` es la lista de registros).
 */
function bloque(tabla: string, filas: Fila[]): Json {
  return { [tabla]: filas };
}

/**
 * Genera el `json.zip` con los contenidos mínimos del libro de clases.
 *
 * Contenidos mínimos (Circular N°30): asistencia, leccionario, calificaciones,
 * convivencia y libro PIE. Acá van la asistencia y el registro de la clase; las
 * calificaciones (C3) y la convivencia (C6) se suman después.
 */
export async function buildEdePayload(schoolId: string): Promise<Json> {
  const school = await db.school.findUnique({
    where: { id: schoolId },
    select: { id: true, name: true, rut: true, level: true, commune: true, address: true },
  });
  if (!school) throw new Error("El colegio no existe.");

  const [cursos, alumnos, docentes, sesiones, matriculas] = await Promise.all([
    db.course.findMany({
      where: { schoolId },
      select: { id: true, name: true, year: true, level: true, section: true },
    }),
    db.student.findMany({
      where: { schoolId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        rut: true,
        birthDate: true,
        status: true,
      },
    }),
    db.teacher.findMany({
      where: { schoolId },
      select: { id: true, name: true, rut: true, email: true, phone: true },
    }),
    db.classSession.findMany({
      where: { schoolId },
      orderBy: { date: "asc" },
      include: {
        attendances: {
          include: { student: { select: { id: true } } },
        },
      },
    }),
    db.enrollment.findMany({
      where: { course: { schoolId } },
      select: { id: true, courseId: true, studentId: true, status: true },
    }),
  ]);

  // --- _Establecimientos: el colegio -------------------------------------
  const k12School: Fila[] = [
    {
      OrganizationId: school.id,
      OrganizationName: school.name,
      OrganizationIdentifier: school.rut ?? "",
      RefSchoolLevelId: nivelEscolar(school.level),
      AddressStreetNumberAndName: school.address ?? "",
      LocationCity: school.commune ?? "",
      RecordStartDateTime: "2026-01-01T00:00:00",
    },
  ];

  // --- _Personas: alumnos y docentes -----------------------------------
  const person: Fila[] = [];
  const personIdentifier: Fila[] = [];
  const personEmail: Fila[] = [];
  const personTelephone: Fila[] = [];

  for (const alumno of alumnos) {
    person.push({
      PersonId: alumno.id,
      FirstName: alumno.firstName,
      LastName: alumno.lastName,
      BirthDate: alumno.birthDate ? alumno.birthDate.toISOString().slice(0, 10) : "",
      RecordStartDateTime: "2026-01-01T00:00:00",
    });
    if (alumno.rut) {
      personIdentifier.push({
        PersonIdentifierId: `idn_${alumno.id}`,
        PersonId: alumno.id,
        Identifier: alumno.rut,
        IdentifierType: "RUT",
        RecordStartDateTime: "2026-01-01T00:00:00",
      });
    }
  }

  for (const docente of docentes) {
    person.push({
      PersonId: docente.id,
      FirstName: docente.name,
      LastName: "",
      RecordStartDateTime: "2026-01-01T00:00:00",
    });
    if (docente.rut) {
      personIdentifier.push({
        PersonIdentifierId: `idn_${docente.id}`,
        PersonId: docente.id,
        Identifier: docente.rut,
        IdentifierType: "RUT",
        RecordStartDateTime: "2026-01-01T00:00:00",
      });
    }
    if (docente.email) {
      personEmail.push({
        PersonEmailAddressId: `eml_${docente.id}`,
        PersonId: docente.id,
        EmailAddress: docente.email,
        RefEmailTypeId: "01",
        RecordStartDateTime: "2026-01-01T00:00:00",
      });
    }
    if (docente.phone) {
      personTelephone.push({
        PersonTelephoneId: `tel_${docente.id}`,
        PersonId: docente.id,
        TelephoneNumber: docente.phone,
        RecordStartDateTime: "2026-01-01T00:00:00",
      });
    }
  }

  // --- _ComunidadEducativa: la matrícula (persona + rol en el colegio) ----
  const organizationPersonRole: Fila[] = [];
  for (const matricula of matriculas) {
    if (matricula.status !== "ACTIVE") continue;
    organizationPersonRole.push({
      OrganizationPersonRoleId: `opr_${matricula.id}`,
      OrganizationId: school.id,
      PersonId: matricula.studentId,
      RoleId: "STU", // estudiante
      EntryDate: "2026-03-01",
      RecordStartDateTime: "2026-01-01T00:00:00",
    });
  }

  // --- _ComunidadEducativa: la asistencia (el corazón del registro) -------
  // `RoleAttendanceEvent` es el evento de asistencia de una persona en una
  // sesión; `firmaRatificador` es la firma de quien validó el registro.
  const roleAttendanceEvent: Fila[] = [];
  const roleAttendance: Fila[] = [];

  for (const sesion of sesiones) {
    for (const asistencia of sesion.attendances) {
      const matricula = matriculas.find(
        (e) => e.studentId === asistencia.studentId && e.courseId === sesion.courseId,
      );
      if (!matricula) continue;

      roleAttendanceEvent.push({
        RoleAttendanceEventId: `rae_${asistencia.id}`,
        OrganizationPersonRoleId: `opr_${matricula.id}`,
        Date: formatDate(sesion.date),
        RefAttendanceStatusId: estadoAsistencia(asistencia.status),
        RefAttendanceEventTypeId: "01", // clase dictada
        // Quién validó el registro y cuándo: la trazabilidad que pide la norma.
        fechaRatificador: formatDate(sesion.date),
        oprIdRatificador: sesion.teacherId,
        firmaRatificador: sesion.recordedById,
        RecordStartDateTime: "2026-01-01T00:00:00",
      });
    }
  }

  // El resumen por persona: asistencia y días ausentes.
  const porPersona = new Map<string, { total: number; ausentes: number }>();
  for (const sesion of sesiones) {
    for (const asistencia of sesion.attendances) {
      const matricula = matriculas.find(
        (e) => e.studentId === asistencia.studentId && e.courseId === sesion.courseId,
      );
      if (!matricula) continue;
      const actual = porPersona.get(matricula.id) ?? { total: 0, ausentes: 0 };
      actual.total += 1;
      if (asistencia.status === "ABSENT") actual.ausentes += 1;
      porPersona.set(matricula.id, actual);
    }
  }
  for (const [idMatricula, resumen] of porPersona) {
    roleAttendance.push({
      RoleAttendanceId: `rat_${idMatricula}`,
      OrganizationPersonRoleId: `opr_${idMatricula}`,
      NumberOfDaysInAttendance: resumen.total,
      NumberOfDaysAbsent: resumen.ausentes,
      AttendanceRate:
        resumen.total > 0
          ? Math.round(((resumen.total - resumen.ausentes) / resumen.total) * 100)
          : 100,
      RecordStartDateTime: "2026-01-01T00:00:00",
    });
  }

  // --- _Cursos: los cursos y su horario ----------------------------------
  const k12Course: Fila[] = cursos.map((curso) => ({
    K12CourseId: curso.id,
    OrganizationId: school.id,
    SCEDCourseCode: curso.name,
    SCEDGradeSpan: curso.name,
    CourseGradeLevel: String(curso.level),
    RecordStartDateTime: "2026-01-01T00:00:00",
  }));

  const courseSectionSchedule: Fila[] = sesiones.map((sesion) => ({
    CourseSectionScheduleId: `css_${sesion.id}`,
    OrganizationId: school.id,
    ClassBeginningTime: sesion.startTime ?? "",
    ClassEndingTime: sesion.endTime ?? "",
    ClassPeriod: String(sesion.period),
    ClassMeetingDays: "LUN_MAR_MIE_JUE_VIE",
    RecordStartDateTime: "2026-01-01T00:00:00",
  }));

  return {
    _Establecimientos: [bloque("K12School", k12School)],
    _Personas: [
      bloque("Person", person),
      bloque("PersonIdentifier", personIdentifier),
      bloque("PersonEmailAddress", personEmail),
      bloque("PersonTelephone", personTelephone),
    ],
    _ComunidadEducativa: [
      bloque("OrganizationPersonRole", organizationPersonRole),
      bloque("RoleAttendanceEvent", roleAttendanceEvent),
      bloque("RoleAttendance", roleAttendance),
    ],
    _Cursos: [
      bloque("K12Course", k12Course),
      bloque("CourseSectionSchedule", courseSectionSchedule),
    ],
  };
}

/** El código de nivel que usa el MINEDUC. */
function nivelEscolar(level: string): string {
  switch (level) {
    case "PARVULARIA":
      return "PT";
    case "PREBASICA":
      return "PR";
    case "BASICA":
      return "BA";
    case "MEDIA":
      return "ME";
    case "TECNICO":
      return "TP";
    default:
      return "BA";
  }
}

/** El código de estado de asistencia del MINEDUC. */
function estadoAsistencia(status: string): string {
  switch (status) {
    case "PRESENT":
      return "01";
    case "ABSENT":
      return "02";
    case "LATE":
      return "03";
    case "JUSTIFIED":
      return "04";
    case "EXCUSED":
      return "05";
    default:
      return "01";
  }
}
