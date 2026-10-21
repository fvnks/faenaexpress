import { createHash } from "node:crypto";

import { db } from "@/lib/db";
import {
  ABSENT_CATEGORY,
  ATTENDANCE_EVENT_TYPE,
  ATTENDANCE_STATUS,
  DELIVERY_MODE,
  DIAS_SEMANA,
  EMAIL_TYPE,
  ENROLLMENT_STATUS,
  GRADOS_BASICA,
  INSTRUCTION_LANGUAGE,
  INSTITUTION_TELEPHONE_TYPE,
  JERARQUIA,
  ORGANIZATION_IDENTIFICATION_SYSTEM,
  ORGANIZATION_IDENTIFIER_TYPE,
  ORGANIZATION_LOCATION_TYPE,
  ORGANIZATION_RELATIONSHIP,
  ORGANIZATION_TYPE,
  PERSON_IDENTIFICATION_SYSTEM,
  PERSON_LOCATION_TYPE,
  PERSON_RELATIONSHIP,
  PERSON_TELEPHONE_TYPE,
  PRESENT_CATEGORY,
  ROLE,
  SEX,
  SINGLE_SEX_STATUS,
} from "@/lib/school-ede-codes";
import type { SchoolLevel } from "@/generated/prisma/client";

/** Una fila del EDE: los valores de sus columnas. */
export type EdeFila = Record<string, string | number | boolean | null>;

/** Un bloque del grupo: tabla -> filas. */
export type EdeTabla = Record<string, EdeFila[]>;

/**
 * El JSON que espera el MINEDUC: grupo -> lista de bloques.
 *
 * El parser (`parseJSONtoCSV.py`) recorre `for grupo in jsonData[grupo]` y
 * después `for tbl in grupo[tabla]`: si un bloque del grupo no trae la tabla
 * que se está pidiendo, revienta con `KeyError` y esa tabla no genera CSV.
 * Por eso cada grupo es un bloque único con todas sus tablas.
 */
export type EdePayload = Record<string, EdeTabla[]>;

/** Contador de ids enteros (el MINEDUC no admite los cuids de Prisma). */
class Contador {
  private valor: number;

  constructor(inicio = 1) {
    this.valor = inicio - 1;
  }

  siguiente(): number {
    this.valor += 1;
    return this.valor;
  }
}

/** Los ids de organización arrancan en 101, como en el parser del MINEDUC. */
const INICIO_ORGANIZACION = 101;

// ---------------------------------------------------------------------------
// Fechas y horas
// ---------------------------------------------------------------------------

/** La fecha que ve el colegio ("2026-03-02"). */
function fechaLocal(fecha: Date): string {
  return fecha.toISOString().slice(0, 10);
}

/**
 * El desfase de Chile (hora oficial) en minutos para una fecha dada.
 *
 * Chile corre entre UTC-4 (invierno) y UTC-3 (verano), así que el desfase se
 * pregunta a la zona horaria y no se fija a mano. Si el runtime no trae la
 * base de datos de zonas, se cae al desfase de verano.
 */
function desfaseChile(fecha: string): number {
  const referencia = new Date(`${fecha}T12:00:00Z`);
  try {
    const partes = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Santiago",
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).formatToParts(referencia);
    const valor = (tipo: string) => Number(partes.find((p) => p.type === tipo)?.value ?? "0");
    const comoUtc = Date.UTC(
      valor("year"),
      valor("month") - 1,
      valor("day"),
      valor("hour") % 24,
      valor("minute"),
      valor("second"),
    );
    return Math.round((comoUtc - referencia.getTime()) / 60000);
  } catch {
    return -180;
  }
}

/**
 * Un momento del día en hora de Chile, con su desfase:
 * "2026-03-02T08:30:00.000-03:00".
 *
 * El desfase va en el texto porque el validador lo saca de ahí
 * (`substr(rae.Date, length(rae.Date)-5, 6)`) para comparar la hora de la
 * clase con el horario.
 */
function momentoChile(fecha: string, hora: string): string {
  const [anio, mes, dia] = fecha.split("-").map(Number);
  const [hh, mm] = hora.split(":").map(Number);
  const desfase = desfaseChile(fecha);
  const signo = desfase < 0 ? "-" : "+";
  const absoluto = Math.abs(desfase);
  const dos = (n: number) => String(n).padStart(2, "0");
  return `${String(anio).padStart(4, "0")}-${dos(mes)}-${dos(dia)}T${dos(hh)}:${dos(mm)}:00.000${signo}${dos(
    Math.floor(absoluto / 60),
  )}:${dos(absoluto % 60)}`;
}

/** "08:30" (o el respaldo) desde el texto del formulario. */
function horaDeClase(hora: string | null, respaldo: string): string {
  const limpio = (hora ?? "").trim();
  return /^\d{1,2}:\d{2}$/.test(limpio) ? limpio : respaldo;
}

/** Los minutos entre dos horas "HH:MM". */
function duracionMinutos(desde: string, hasta: string): number {
  const [h1, m1] = desde.split(":").map(Number);
  const [h2, m2] = hasta.split(":").map(Number);
  return Math.max(0, h2 * 60 + m2 - (h1 * 60 + m1));
}

// ---------------------------------------------------------------------------
// Nombres y códigos
// ---------------------------------------------------------------------------

/**
 * El apellido paterno y el materno.
 *
 * Chile tiene dos apellidos y el MINEDUC los pide por separado. El colegio
 * los escribe en un solo campo ("Pérez Soto"): se parte por el espacio y, si
 * hay un solo apellido, se repite (en Chile "Pérez Pérez" no es raro).
 */
function apellidos(apellido: string): { paterno: string; materno: string } {
  const partes = (apellido ?? "").trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return { paterno: "", materno: "" };
  if (partes.length === 1) return { paterno: partes[0], materno: partes[0] };
  return { paterno: partes[0], materno: partes.slice(1).join(" ") };
}

/** Nombre, apellidos y nombre medio desde un nombre completo. */
function nombreCompleto(nombre: string): { nombre: string; paterno: string; materno: string } {
  const partes = (nombre ?? "").trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return { nombre: "", paterno: "", materno: "" };
  if (partes.length === 1) return { nombre: partes[0], paterno: partes[0], materno: partes[0] };
  return { nombre: partes[0], paterno: partes[1], materno: partes.slice(2).join(" ") || partes[1] };
}

/** El código antes de los dos puntos ("110.02" de "110.02:2º Básico"). */
function codigoDe(nombre: string): string {
  const [codigo] = nombre.split(":");
  return (codigo ?? nombre).trim();
}

/** `RefSexId` según el sexo que tiene el alumno registrado. */
function sexoDe(genero: string | null): number {
  const g = (genero ?? "").trim().toUpperCase();
  if (g === "M") return SEX.male;
  if (g === "F") return SEX.female;
  return SEX.notSelected;
}

/**
 * El grado de enseñanza del curso, con el código que usa el MINEDUC.
 *
 * El grado sale del nombre del curso ("3°Básico A"), porque el modelo de
 * cursos no tiene un campo de grado. Cuando no se puede determinar, se
 * declara "sin información" en vez de inventar uno.
 */
function gradoDeCurso(nivel: SchoolLevel, nombre: string): string {
  if (nivel === "PARVULARIA" || nivel === "PREBASICA") {
    return /kinder|kínder/i.test(nombre)
      ? JERARQUIA.grados.PREBASICA
      : JERARQUIA.grados.PARVULARIA;
  }
  if (nivel === "BASICA") {
    const match = nombre.match(/(\d{1,2})\s*(?:[°º]|(?:ro|ero|era)\b)/i);
    const numero = match ? Number(match[1]) : Number.NaN;
    if (Number.isInteger(numero) && numero >= 1 && numero <= GRADOS_BASICA.length) {
      return GRADOS_BASICA[numero - 1];
    }
  }
  return JERARQUIA.gradoDesconocido;
}

/**
 * La letra del curso ("A").
 *
 * La jerarquía del MINEDUC usa la letra como nombre de la organización del
 * curso: es el "letraCurso" de la vista `jerarquiasList` y tiene que
 * calzar con `^[A-Z]{1,2}$`.
 */
function letraDeCurso(section: string | null, nombre: string): string {
  const declarada = (section ?? "").trim().toUpperCase();
  if (/^[A-Z]{1,2}$/.test(declarada)) return declarada;
  const delNombre = nombre.toUpperCase().match(/([A-Z]{1,2})\s*$/);
  return delNombre?.[1] ?? "";
}

/**
 * La jornada escolar, según la hora de las clases.
 *
 * Sin clases registradas no hay de dónde sacarla: se declara "Mañana", que es
 * lo que tiene la mayoría de los establecimientos con un solo turno.
 */
function jornadaDe(horas: string[]): string {
  if (horas.length === 0) return JERARQUIA.jornadas.manana;
  const todasManana = horas.every((h) => Number(h.slice(0, 2)) < 12);
  const todasTarde = horas.every((h) => Number(h.slice(0, 2)) >= 13);
  if (todasManana) return JERARQUIA.jornadas.manana;
  if (todasTarde) return JERARQUIA.jornadas.tarde;
  return JERARQUIA.jornadas.ambas;
}

/** El día de la semana de una fecha, como los escribe el validador. */
function diaDeSemana(fecha: string): string {
  const [anio, mes, dia] = fecha.split("-").map(Number);
  const indice = new Date(Date.UTC(anio, mes - 1, dia)).getUTCDay();
  return DIAS_SEMANA[indice];
}

/**
 * La clave de verificación del registro de asistencia.
 *
 * El MINEDUC exige que el evento de asistencia tenga el "verificador de
 * identidad" (`digitalRandomKey`): 6 dígitos y un dígito verificador, con el
 * formato `^[0-9]{6}([-][0-9kK])?$`.
 *
 * Acá sale de forma determinista del propio registro, para que el mismo dato
 * tenga siempre la misma clave (es trazabilidad, no un secreto). La firma
 * criptográfica con la llave del docente es la fase 2 del EDE: eso necesita la
 * PKI del MINEDUC y no se puede fabricar acá.
 */
function claveDeVerificacion(entrada: string): string {
  const hash = createHash("sha256").update(entrada).digest("hex");
  const digitos = (hash.match(/\d/g) ?? []).join("");
  const base = digitos.slice(0, 6).padEnd(6, "0");
  const suma = base.split("").reduce((total, digito) => total + Number(digito), 0);
  return `${base}-${suma % 10}`;
}

/** El estado de asistencia del colegio, en el código del MINEDUC. */
function estadoDeAsistencia(estado: string, justificativo: string | null): {
  estado: number;
  presente: number | null;
  ausente: number | null;
} {
  switch (estado) {
    case "PRESENT":
      return { estado: ATTENDANCE_STATUS.present, presente: PRESENT_CATEGORY.inSchool, ausente: null };
    case "LATE":
      return { estado: ATTENDANCE_STATUS.tardy, presente: PRESENT_CATEGORY.inSchool, ausente: null };
    case "JUSTIFIED":
      return {
        estado: ATTENDANCE_STATUS.excusedAbsence,
        presente: null,
        ausente: categoriaDeAusencia(justificativo),
      };
    case "EXCUSED":
      return {
        estado: ATTENDANCE_STATUS.earlyDeparture,
        presente: null,
        ausente: categoriaDeAusencia(justificativo),
      };
    default:
      return {
        estado: ATTENDANCE_STATUS.unexcusedAbsence,
        presente: null,
        ausente: ABSENT_CATEGORY.unknown,
      };
  }
}

/** Por qué no estuvo, según el justificativo que registró el colegio. */
function categoriaDeAusencia(justificativo: string | null): number {
  switch ((justificativo ?? "").trim().toUpperCase()) {
    case "ENFERMEDAD":
    case "LICENCIA_MEDICA":
    case "FALTA_JUSTIFICADA":
      return ABSENT_CATEGORY.illness;
    case "PERMISO":
    case "RETIRADA_TEMPORANA":
    case "RETIRADA_ANTICIPADA":
      return ABSENT_CATEGORY.familyActivity;
    case "DUELO":
    case "URGENCIA_FAMILIAR":
      return ABSENT_CATEGORY.familyEmergency;
    default:
      return ABSENT_CATEGORY.unknown;
  }
}

// ---------------------------------------------------------------------------
// El exportador
// ---------------------------------------------------------------------------

/**
 * Arma el JSON del libro de clases en el formato del MINEDUC.
 *
 * El MINEDUC no publica una API: publica un contenedor (`edemineduc/etl`) que
 * parsea este JSON, lo convierte en un CSV por tabla y lo carga en una base
 * cifrada donde corre la validación de la Circular N°30.
 *
 * Lo que se manda:
 *   - La jerarquía del colegio (establecimiento, modalidad, jornada, nivel,
 *     grado, curso y asignatura) como organizaciones encadenadas.
 *   - La comunidad educativa: alumnos, docentes y apoderados, con su rol en
 *     cada organización.
 *   - El libro de clases: una sesión de calendario por clase, con su
 *     asistencia y el leccionario.
 *
 * Lo que todavía no se manda (y por qué):
 *   - La firma criptográfica del docente (`firmaRatificador`): necesita la
 *     llave que emite el MINEDUC.
 *   - La dirección estructurada del alumno y del apoderado (el modelo la
 *     guarda como texto libre) y la región y comuna con su código.
 *   - Los feriados y los días no lectivos: el colegio todavía no declara el
 *     calendario escolar.
 */
export async function buildEdePayload(schoolId: string): Promise<EdePayload> {
  const [colegio, cursos, alumnos, apoderados, docentes, asignaturas, asignaciones, sesiones, matriculas] =
    await Promise.all([
      db.school.findUnique({
        where: { id: schoolId },
        select: {
          id: true,
          name: true,
          rut: true,
          level: true,
          address: true,
          commune: true,
          phone: true,
          email: true,
        },
      }),
      db.course.findMany({
        where: { schoolId },
        orderBy: [{ year: "asc" }, { name: "asc" }],
        select: { id: true, name: true, year: true, level: true, section: true },
      }),
      db.student.findMany({
        where: { schoolId },
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
        select: {
          id: true,
          firstName: true,
          lastName: true,
          rut: true,
          birthDate: true,
          gender: true,
          address: true,
          commune: true,
          email: true,
          phone: true,
        },
      }),
      db.guardian.findMany({
        where: { schoolId },
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          rut: true,
          email: true,
          phone: true,
          guardianships: { select: { studentId: true } },
        },
      }),
      db.teacher.findMany({
        where: { schoolId },
        orderBy: { name: "asc" },
        select: { id: true, name: true, rut: true, email: true, phone: true },
      }),
      db.subject.findMany({
        where: { schoolId },
        orderBy: { name: "asc" },
        select: { id: true, code: true, name: true },
      }),
      db.teachingAssignment.findMany({
        where: { course: { schoolId } },
        select: { courseId: true, subjectId: true, teacherId: true },
      }),
      db.classSession.findMany({
        where: { schoolId },
        orderBy: [{ date: "asc" }, { period: "asc" }],
        select: {
          id: true,
          courseId: true,
          subjectId: true,
          teacherId: true,
          date: true,
          period: true,
          startTime: true,
          endTime: true,
          contents: true,
          activities: true,
          objectives: true,
          recordedAt: true,
          attendances: {
            select: {
              id: true,
              studentId: true,
              status: true,
              justificationType: true,
              justificationNote: true,
              recordedAt: true,
            },
          },
        },
      }),
      db.enrollment.findMany({
        where: { course: { schoolId } },
        select: {
          id: true,
          courseId: true,
          studentId: true,
          status: true,
          enrolledAt: true,
          endedAt: true,
        },
      }),
    ]);

  if (!colegio) throw new Error("El colegio no existe.");

  const marcaTiempo = new Date();
  const inicio = momentoChile(fechaLocal(marcaTiempo), "00:00:00");

  // --- Contadores de ids ---
  const idOrganizacion = new Contador(INICIO_ORGANIZACION);
  const idIdentificadorOrg = new Contador();
  const idRelacionOrg = new Contador();
  const idEmailOrg = new Contador();
  const idTelefonoOrg = new Contador();
  const idUbicacionOrg = new Contador();
  const idLocation = new Contador();
  const idPersona = new Contador();
  const idIdentificadorPersona = new Contador();
  const idEmailPersona = new Contador();
  const idTelefonoPersona = new Contador();
  const idDireccionPersona = new Contador();
  const idRelacionPersona = new Contador();
  const idRol = new Contador();
  const idEvento = new Contador();
  const idAsistencia = new Contador();
  const idHorario = new Contador();
  const idCalendario = new Contador();
  const idSesionCalendario = new Contador();
  const idDiaCalendario = new Contador();

  // --- Filas ---
  const organizaciones: EdeFila[] = [];
  const identificadoresOrg: EdeFila[] = [];
  const relacionesOrg: EdeFila[] = [];
  const emailsOrg: EdeFila[] = [];
  const telefonosOrg: EdeFila[] = [];
  const ubicacionesOrg: EdeFila[] = [];
  const locations: EdeFila[] = [];
  const direccionesLocation: EdeFila[] = [];
  const personas: EdeFila[] = [];
  const identificadoresPersona: EdeFila[] = [];
  const emailsPersona: EdeFila[] = [];
  const telefonosPersona: EdeFila[] = [];
  const direccionesPersona: EdeFila[] = [];
  const relacionesPersona: EdeFila[] = [];
  const roles: EdeFila[] = [];
  const eventos: EdeFila[] = [];
  const asistencias: EdeFila[] = [];
  const matriculasEde: EdeFila[] = [];
  const cursosEde: EdeFila[] = [];
  const seccionesEde: EdeFila[] = [];
  const horariosEde: EdeFila[] = [];
  const calendarios: EdeFila[] = [];
  const sesionesCalendario: EdeFila[] = [];
  const diasCalendario: EdeFila[] = [];

  // --- La jerarquía ---
  const orgPorClave = new Map<string, number>();

  function agregarOrg(tipo: number, nombre: string, short: string, padre?: number): number {
    const clave = `${padre ?? 0}|${tipo}|${nombre}`;
    const existente = orgPorClave.get(clave);
    if (existente !== undefined) return existente;
    const id = idOrganizacion.siguiente();
    orgPorClave.set(clave, id);
    organizaciones.push({
      OrganizationId: id,
      RefOrganizationTypeId: tipo,
      Name: nombre.slice(0, 128),
      ShortName: short.slice(0, 30),
      RecordStartDateTime: inicio,
      RecordEndDateTime: null,
    });
    if (padre !== undefined) {
      relacionesOrg.push({
        OrganizationRelationshipId: idRelacionOrg.siguiente(),
        OrganizationId: id,
        Parent_OrganizationId: padre,
        RefOrganizationRelationshipId: ORGANIZATION_RELATIONSHIP.internal,
        RecordStartDateTime: inicio,
        RecordEndDateTime: null,
      });
    }
    return id;
  }

  const orgEscuela = agregarOrg(
    ORGANIZATION_TYPE.school,
    colegio.name,
    (colegio.rut ?? "").trim() || colegio.name.slice(0, 30),
  );

  // El RUT del colegio, como identificador del MINEDUC. El RBD (el código que
  // entrega el Ministerio) todavía no se tiene: se anota en la ficha del
  // colegio.
  if (colegio.rut?.trim()) {
    identificadoresOrg.push({
      OrganizationIdentifierId: idIdentificadorOrg.siguiente(),
      OrganizationId: orgEscuela,
      RefOrganizationIdentificationSystemId: ORGANIZATION_IDENTIFICATION_SYSTEM.rut,
      RefOrganizationIdentifierTypeId: ORGANIZATION_IDENTIFIER_TYPE.mineduc,
      Identifier: colegio.rut.trim(),
      RecordStartDateTime: inicio,
      RecordEndDateTime: null,
    });
  }

  if (colegio.email?.trim()) {
    emailsOrg.push({
      OrganizationEmailId: idEmailOrg.siguiente(),
      OrganizationId: orgEscuela,
      ElectronicMailAddress: colegio.email.trim(),
      RefEmailTypeId: EMAIL_TYPE.organizational,
      RecordStartDateTime: inicio,
      RecordEndDateTime: null,
    });
  }

  if (colegio.phone?.trim()) {
    telefonosOrg.push({
      OrganizationTelephoneId: idTelefonoOrg.siguiente(),
      OrganizationId: orgEscuela,
      TelephoneNumber: colegio.phone.trim(),
      RefInstitutionTelephoneTypeId: INSTITUTION_TELEPHONE_TYPE.administrative,
      PrimaryTelephoneNumberIndicator: true,
      RecordStartDateTime: inicio,
      RecordEndDateTime: null,
    });
  }

  if (colegio.address?.trim() || colegio.commune?.trim()) {
    const idUbicacion = idLocation.siguiente();
    locations.push({
      LocationId: idUbicacion,
      RecordStartDateTime: inicio,
      RecordEndDateTime: null,
    });
    direccionesLocation.push({
      LocationId: idUbicacion,
      StreetNumberAndName: (colegio.address ?? "").trim(),
      City: (colegio.commune ?? "").trim(),
      CountyName: (colegio.commune ?? "").trim(),
      RecordStartDateTime: inicio,
      RecordEndDateTime: null,
    });
    ubicacionesOrg.push({
      OrganizationLocationId: idUbicacionOrg.siguiente(),
      OrganizationId: orgEscuela,
      LocationId: idUbicacion,
      RefOrganizationLocationTypeId: ORGANIZATION_LOCATION_TYPE.physical,
      RecordStartDateTime: inicio,
      RecordEndDateTime: null,
    });
  }

  const orgModalidad = agregarOrg(
    ORGANIZATION_TYPE.modality,
    JERARQUIA.modalidades.regular,
    JERARQUIA.modalidades.regular,
    orgEscuela,
  );

  const horasDeClase = sesiones
    .map((sesion) => horaDeClase(sesion.startTime, "08:00"))
    .filter(Boolean);
  const orgJornada = agregarOrg(
    ORGANIZATION_TYPE.jornada,
    jornadaDe(horasDeClase),
    jornadaDe(horasDeClase),
    orgModalidad,
  );

  // --- Las personas ---
  const personaDeAlumno = new Map<string, number>();
  const personaDeDocente = new Map<string, number>();
  const personaDeApoderado = new Map<string, number>();

  function agregarPersona(
    id: number,
    nombre: string,
    paterno: string,
    materno: string,
    nacimiento: Date | null,
    sexo: number,
  ): void {
    personas.push({
      PersonId: id,
      FirstName: nombre.slice(0, 35),
      MiddleName: "",
      LastName: paterno.slice(0, 35),
      SecondLastName: materno.slice(0, 35),
      Birthdate: nacimiento ? fechaLocal(nacimiento) : null,
      RefSexId: sexo,
      RecordStartDateTime: inicio,
      RecordEndDateTime: null,
    });
  }

  for (const alumno of alumnos) {
    const id = idPersona.siguiente();
    personaDeAlumno.set(alumno.id, id);
    const { paterno, materno } = apellidos(alumno.lastName);
    agregarPersona(id, alumno.firstName, paterno, materno, alumno.birthDate, sexoDe(alumno.gender));

    if (alumno.rut?.trim()) {
      identificadoresPersona.push({
        PersonIdentifierId: idIdentificadorPersona.siguiente(),
        PersonId: id,
        RefPersonIdentificationSystemId: PERSON_IDENTIFICATION_SYSTEM.run,
        Identifier: alumno.rut.trim(),
        RecordStartDateTime: inicio,
        RecordEndDateTime: null,
      });
    }
    if (alumno.email?.trim()) {
      emailsPersona.push({
        PersonEmailAddressId: idEmailPersona.siguiente(),
        PersonId: id,
        EmailAddress: alumno.email.trim(),
        RefEmailTypeId: EMAIL_TYPE.home,
        RecordStartDateTime: inicio,
        RecordEndDateTime: null,
      });
    }
    if (alumno.phone?.trim()) {
      telefonosPersona.push({
        PersonTelephoneId: idTelefonoPersona.siguiente(),
        PersonId: id,
        TelephoneNumber: alumno.phone.trim(),
        RefPersonTelephoneNumberTypeId: PERSON_TELEPHONE_TYPE.mobile,
        PrimaryTelephoneNumberIndicator: true,
        RecordStartDateTime: inicio,
        RecordEndDateTime: null,
      });
    }
    if (alumno.address?.trim() || alumno.commune?.trim()) {
      direccionesPersona.push({
        PersonAddressId: idDireccionPersona.siguiente(),
        PersonId: id,
        StreetNumberAndName: (alumno.address ?? "").trim(),
        City: (colegio.commune ?? "").trim(),
        AddressCountyName: (alumno.commune ?? "").trim(),
        RefPersonLocationTypeId: PERSON_LOCATION_TYPE.mailing,
        RecordStartDateTime: inicio,
        RecordEndDateTime: null,
      });
    }
  }

  for (const docente of docentes) {
    const id = idPersona.siguiente();
    personaDeDocente.set(docente.id, id);
    const { nombre, paterno, materno } = nombreCompleto(docente.name);
    agregarPersona(id, nombre, paterno, materno, null, SEX.notSelected);

    if (docente.rut?.trim()) {
      identificadoresPersona.push({
        PersonIdentifierId: idIdentificadorPersona.siguiente(),
        PersonId: id,
        RefPersonIdentificationSystemId: PERSON_IDENTIFICATION_SYSTEM.run,
        Identifier: docente.rut.trim(),
        RecordStartDateTime: inicio,
        RecordEndDateTime: null,
      });
    }
    if (docente.email?.trim()) {
      emailsPersona.push({
        PersonEmailAddressId: idEmailPersona.siguiente(),
        PersonId: id,
        EmailAddress: docente.email.trim(),
        RefEmailTypeId: EMAIL_TYPE.work,
        RecordStartDateTime: inicio,
        RecordEndDateTime: null,
      });
    }
    if (docente.phone?.trim()) {
      telefonosPersona.push({
        PersonTelephoneId: idTelefonoPersona.siguiente(),
        PersonId: id,
        TelephoneNumber: docente.phone.trim(),
        RefPersonTelephoneNumberTypeId: PERSON_TELEPHONE_TYPE.work,
        PrimaryTelephoneNumberIndicator: true,
        RecordStartDateTime: inicio,
        RecordEndDateTime: null,
      });
    }
  }

  for (const apoderado of apoderados) {
    const id = idPersona.siguiente();
    personaDeApoderado.set(apoderado.id, id);
    const { nombre, paterno, materno } = nombreCompleto(apoderado.name);
    agregarPersona(id, nombre, paterno, materno, null, SEX.notSelected);

    if (apoderado.rut?.trim()) {
      identificadoresPersona.push({
        PersonIdentifierId: idIdentificadorPersona.siguiente(),
        PersonId: id,
        RefPersonIdentificationSystemId: PERSON_IDENTIFICATION_SYSTEM.run,
        Identifier: apoderado.rut.trim(),
        RecordStartDateTime: inicio,
        RecordEndDateTime: null,
      });
    }
    if (apoderado.email?.trim()) {
      emailsPersona.push({
        PersonEmailAddressId: idEmailPersona.siguiente(),
        PersonId: id,
        EmailAddress: apoderado.email.trim(),
        RefEmailTypeId: EMAIL_TYPE.home,
        RecordStartDateTime: inicio,
        RecordEndDateTime: null,
      });
    }
    if (apoderado.phone?.trim()) {
      telefonosPersona.push({
        PersonTelephoneId: idTelefonoPersona.siguiente(),
        PersonId: id,
        TelephoneNumber: apoderado.phone.trim(),
        RefPersonTelephoneNumberTypeId: PERSON_TELEPHONE_TYPE.mobile,
        PrimaryTelephoneNumberIndicator: true,
        RecordStartDateTime: inicio,
        RecordEndDateTime: null,
      });
    }

    // El apoderado es el contacto del alumno: va como tal en el MINEDUC.
    for (const vinculo of apoderado.guardianships) {
      const alumnoId = personaDeAlumno.get(vinculo.studentId);
      if (alumnoId === undefined) continue;
      relacionesPersona.push({
        PersonRelationshipId: idRelacionPersona.siguiente(),
        PersonId: id,
        RelatedPersonId: alumnoId,
        RefPersonRelationshipId: PERSON_RELATIONSHIP.apoderado,
        PrimaryContactIndicator: true,
        EmergencyContactInd: true,
        RecordStartDateTime: inicio,
        RecordEndDateTime: null,
      });
    }
  }

  // --- Las matrículas ---
  const cursoPorId = new Map(cursos.map((curso) => [curso.id, curso]));
  const asignaturaPorId = new Map(asignaturas.map((asignatura) => [asignatura.id, asignatura]));
  const alumnoPorId = new Map(alumnos.map((alumno) => [alumno.id, alumno]));

  const matriculasActivas = matriculas.filter((matricula) => matricula.status === "ACTIVE");
  const alumnosPorCurso = new Map<string, string[]>();
  for (const matricula of matriculasActivas) {
    const lista = alumnosPorCurso.get(matricula.courseId) ?? [];
    lista.push(matricula.studentId);
    alumnosPorCurso.set(matricula.courseId, lista);
  }
  for (const lista of alumnosPorCurso.values()) {
    lista.sort((a, b) => {
      const alumnoA = alumnoPorId.get(a);
      const alumnoB = alumnoPorId.get(b);
      const orden = `${alumnoA?.lastName ?? ""}${alumnoA?.firstName ?? ""}`.localeCompare(
        `${alumnoB?.lastName ?? ""}${alumnoB?.firstName ?? ""}`,
        "es",
      );
      return orden !== 0 ? orden : a.localeCompare(b);
    });
  }

  // El primer curso de cada alumno: los cursos vienen ordenados por año y
  // nombre, así que el primero es el más antiguo.
  const primerCursoDeAlumno = new Map<string, string>();
  for (const curso of cursos) {
    for (const studentId of alumnosPorCurso.get(curso.id) ?? []) {
      if (!primerCursoDeAlumno.has(studentId)) primerCursoDeAlumno.set(studentId, curso.id);
    }
  }

  // El número de lista del alumno en su curso.
  const numeroDeLista = new Map<string, number>();
  for (const [courseId, lista] of alumnosPorCurso) {
    lista.forEach((studentId, indice) => {
      numeroDeLista.set(`${courseId}|${studentId}`, indice + 1);
    });
  }

  // El número correlativo de matrícula del alumno en el año escolar.
  const anioDeAlumno = new Map<string, number>();
  for (const matricula of matriculas) {
    const curso = cursoPorId.get(matricula.courseId);
    if (!curso) continue;
    const previo = anioDeAlumno.get(matricula.studentId);
    if (previo === undefined || curso.year < previo) anioDeAlumno.set(matricula.studentId, curso.year);
  }
  const alumnosPorAnio = new Map<number, string[]>();
  for (const [studentId, anio] of anioDeAlumno) {
    const lista = alumnosPorAnio.get(anio) ?? [];
    lista.push(studentId);
    alumnosPorAnio.set(anio, lista);
  }
  const matriculaCorrelativa = new Map<string, string>();
  for (const [anio, lista] of alumnosPorAnio) {
    lista.sort((a, b) => {
      const alumnoA = alumnoPorId.get(a);
      const alumnoB = alumnoPorId.get(b);
      const orden = `${alumnoA?.lastName ?? ""}${alumnoA?.firstName ?? ""}`.localeCompare(
        `${alumnoB?.lastName ?? ""}${alumnoB?.firstName ?? ""}`,
        "es",
      );
      return orden !== 0 ? orden : a.localeCompare(b);
    });
    lista.forEach((studentId, indice) => {
      matriculaCorrelativa.set(studentId, `${anio}${String(indice + 1).padStart(4, "0")}`);
    });
  }

  // El número de lista que el MINEDUC exige (sistema "listNumber"): va una vez
  // por alumno, con el número que tiene en su primer curso.
  for (const alumno of alumnos) {
    const personaId = personaDeAlumno.get(alumno.id);
    if (personaId === undefined) continue;
    const lista = numeroDeLista.get(`${primerCursoDeAlumno.get(alumno.id) ?? ""}|${alumno.id}`);
    if (lista === undefined) continue;
    identificadoresPersona.push({
      PersonIdentifierId: idIdentificadorPersona.siguiente(),
      PersonId: personaId,
      RefPersonIdentificationSystemId: PERSON_IDENTIFICATION_SYSTEM.listNumber,
      Identifier: String(lista),
      RecordStartDateTime: inicio,
      RecordEndDateTime: null,
    });
    const correlativa = matriculaCorrelativa.get(alumno.id);
    if (correlativa) {
      identificadoresPersona.push({
        PersonIdentifierId: idIdentificadorPersona.siguiente(),
        PersonId: personaId,
        RefPersonIdentificationSystemId: PERSON_IDENTIFICATION_SYSTEM.schoolNumber,
        Identifier: correlativa,
        RecordStartDateTime: inicio,
        RecordEndDateTime: null,
      });
    }
  }

  // --- Los cursos y su jerarquía ---
  const orgDeCurso = new Map<string, number>();
  for (const curso of cursos) {
    const nivel = JERARQUIA.niveles[curso.level];
    const codigoEnsenanza = JERARQUIA.codigoEnse[curso.level];

    const orgNivel = agregarOrg(ORGANIZATION_TYPE.level, nivel, codigoDe(nivel), orgJornada);
    const orgRama = agregarOrg(ORGANIZATION_TYPE.branch, JERARQUIA.rama, codigoDe(JERARQUIA.rama), orgNivel);
    const orgSector = agregarOrg(ORGANIZATION_TYPE.sector, JERARQUIA.sector, codigoDe(JERARQUIA.sector), orgRama);
    const orgEspecialidad = agregarOrg(
      ORGANIZATION_TYPE.specialty,
      JERARQUIA.especialidad,
      codigoDe(JERARQUIA.especialidad),
      orgSector,
    );
    const orgTipoCurso = agregarOrg(
      ORGANIZATION_TYPE.courseType,
      JERARQUIA.tipoCurso,
      codigoDe(JERARQUIA.tipoCurso),
      orgEspecialidad,
    );
    const orgEnsenanza = agregarOrg(
      ORGANIZATION_TYPE.teachingCode,
      codigoEnsenanza,
      codigoDe(codigoEnsenanza),
      orgTipoCurso,
    );
    const grado = gradoDeCurso(curso.level, curso.name);
    const orgGrado = agregarOrg(ORGANIZATION_TYPE.grade, grado, codigoDe(grado), orgEnsenanza);
    const letra = letraDeCurso(curso.section, curso.name);
    const orgCurso = agregarOrg(ORGANIZATION_TYPE.course, letra, letra, orgGrado);
    orgDeCurso.set(curso.id, orgCurso);

    cursosEde.push({
      OrganizationId: orgCurso,
      Description: curso.name.slice(0, 60),
      RefInstructionLanguage: INSTRUCTION_LANGUAGE.spanish,
      RecordStartDateTime: inicio,
      RecordEndDateTime: null,
    });
  }

  // --- Las asignaturas de cada curso ---
  const orgDeAsignatura = new Map<string, number>();
  const asignaturasPorCurso = new Map<string, string[]>();
  for (const asignacion of asignaciones) {
    const lista = asignaturasPorCurso.get(asignacion.courseId) ?? [];
    if (!lista.includes(asignacion.subjectId)) lista.push(asignacion.subjectId);
    asignaturasPorCurso.set(asignacion.courseId, lista);
  }
  for (const [courseId, lista] of asignaturasPorCurso) {
    const curso = cursoPorId.get(courseId);
    const orgCurso = orgDeCurso.get(courseId);
    if (!curso || orgCurso === undefined) continue;
    const cantidad = alumnosPorCurso.get(courseId)?.length ?? 0;
    for (const subjectId of lista) {
      const asignatura = asignaturaPorId.get(subjectId);
      if (!asignatura) continue;
      const orgAsignatura = agregarOrg(
        ORGANIZATION_TYPE.courseSection,
        asignatura.name,
        asignatura.code,
        orgCurso,
      );
      orgDeAsignatura.set(`${courseId}|${subjectId}`, orgAsignatura);
      seccionesEde.push({
        OrganizationId: orgAsignatura,
        CourseId: orgCurso,
        VirtualIndicator: false,
        RefCourseSectionDeliveryModeId: DELIVERY_MODE.faceToFace,
        RefSingleSexClassStatusId: SINGLE_SEX_STATUS.notSingleSex,
        RefInstructionLanguageId: INSTRUCTION_LANGUAGE.spanish,
        MaximumCapacity: Math.max(cantidad, 1),
        RecordStartDateTime: inicio,
        RecordEndDateTime: null,
      });
    }
  }

  // --- El rol de cada persona en cada organización ---
  const orgRolAlumnoEnCurso = new Map<string, number>();
  const orgRolAlumnoEnClase = new Map<string, number>();
  const orgRolDocenteEnClase = new Map<string, number>();
  const orgRolDocenteEnColegio = new Map<string, number>();
  const orgRolApoderado = new Map<string, number>();

  function agregarRol(organizacion: number, persona: number, rol: number, entrada: string, salida: string | null): number {
    const id = idRol.siguiente();
    roles.push({
      OrganizationPersonRoleId: id,
      OrganizationId: organizacion,
      PersonId: persona,
      RoleId: rol,
      EntryDate: entrada,
      ExitDate: salida,
      RecordStartDateTime: inicio,
      RecordEndDateTime: null,
    });
    return id;
  }

  for (const matricula of matriculas) {
    const personaId = personaDeAlumno.get(matricula.studentId);
    const orgCurso = orgDeCurso.get(matricula.courseId);
    if (personaId === undefined || orgCurso === undefined) continue;
    const clave = `${matricula.courseId}|${matricula.studentId}`;
    if (matricula.status !== "ACTIVE") continue;

    const entrada = momentoChile(fechaLocal(matricula.enrolledAt), "08:00:00");
    const salida = matricula.endedAt ? momentoChile(fechaLocal(matricula.endedAt), "13:00:00") : null;
    const idRol = agregarRol(orgCurso, personaId, ROLE.student, entrada, salida);
    orgRolAlumnoEnCurso.set(clave, idRol);

    const lista = numeroDeLista.get(clave);
    matriculasEde.push({
      OrganizationPersonRoleId: idRol,
      StudentListNumber: lista ?? 0,
      active: 1,
      RefEnrollmentStatusId: ENROLLMENT_STATUS.currentlyEnrolled,
      RecordStartDateTime: inicio,
      RecordEndDateTime: null,
    });
  }

  for (const docente of docentes) {
    const personaId = personaDeDocente.get(docente.id);
    if (personaId === undefined) continue;
    const idRol = agregarRol(orgEscuela, personaId, ROLE.teacher, inicio, null);
    orgRolDocenteEnColegio.set(docente.id, idRol);
  }

  for (const apoderado of apoderados) {
    const personaId = personaDeApoderado.get(apoderado.id);
    if (personaId === undefined) continue;
    const idRol = agregarRol(orgEscuela, personaId, ROLE.guardian, inicio, null);
    orgRolApoderado.set(apoderado.id, idRol);
  }

  // --- El libro de clases ---
  const calendarioPorAsignatura = new Map<string, number>();
  const clasesPorAlumno = new Map<string, number>();
  const ausenciasPorAlumno = new Map<string, number>();
  const diasPorAsignatura = new Map<string, Set<string>>();

  for (const sesion of sesiones) {
    const orgAsignatura = orgDeAsignatura.get(`${sesion.courseId}|${sesion.subjectId}`);
    const orgCurso = orgDeCurso.get(sesion.courseId);
    if (orgAsignatura === undefined || orgCurso === undefined) continue;

    const fecha = fechaLocal(sesion.date);
    const inicioClase = horaDeClase(sesion.startTime, "08:00");
    const finClase = horaDeClase(sesion.endTime, "09:00");
    const momento = momentoChile(fecha, inicioClase);
    const finMomento = momentoChile(fecha, finClase);
    const dia = diaDeSemana(fecha);
    const minutos = duracionMinutos(inicioClase, finClase);

    // El horario de la asignatura.
    horariosEde.push({
      CourseSectionScheduleId: idHorario.siguiente(),
      OrganizationId: orgAsignatura,
      ClassMeetingDays: dia,
      ClassBeginningTime: inicioClase,
      ClassEndingTime: finClase,
      ClassPeriod: `Bloque${String(sesion.period).padStart(2, "0")}`,
      TimeDayIdentifier: dia,
      RecordStartDateTime: momento,
      RecordEndDateTime: null,
    });

    // El calendario de la asignatura: una sesión por clase.
    const claveAsignatura = `${sesion.courseId}|${sesion.subjectId}`;
    let orgCalendario = calendarioPorAsignatura.get(claveAsignatura);
    if (orgCalendario === undefined) {
      orgCalendario = idCalendario.siguiente();
      calendarioPorAsignatura.set(claveAsignatura, orgCalendario);
      const asignatura = asignaturaPorId.get(sesion.subjectId);
      const curso = cursoPorId.get(sesion.courseId);
      calendarios.push({
        OrganizationCalendarId: orgCalendario,
        OrganizationId: orgAsignatura,
        CalendarDescription: `${asignatura?.name ?? "Asignatura"} ${curso?.name ?? ""}`.trim().slice(0, 60),
        CalendarCode: `CAL-${orgAsignatura}`.slice(0, 30),
        CalendarYear: String(curso?.year ?? ""),
        RecordStartDateTime: inicio,
        RecordEndDateTime: null,
      });
    }

    const dias = diasPorAsignatura.get(claveAsignatura) ?? new Set<string>();
    dias.add(dia);
    diasPorAsignatura.set(claveAsignatura, dias);

    // La sesión del calendario: el leccionario de la clase.
    const leccionario = [
      sesion.contents ? `Contenidos: ${sesion.contents}` : "",
      sesion.activities ? `Actividades: ${sesion.activities}` : "",
      sesion.objectives ? `Objetivos: ${sesion.objectives}` : "",
    ]
      .filter(Boolean)
      .join(" | ");
    sesionesCalendario.push({
      OrganizationCalendarSessionId: idSesionCalendario.siguiente(),
      OrganizationCalendarId: orgCalendario,
      Code: `S-${fecha}-${sesion.period}`.slice(0, 30),
      Designator: `P${sesion.period}`,
      Description: leccionario || "Clase registrada sin contenidos.",
      BeginDate: fecha,
      EndDate: fecha,
      FirstInstructionDate: fecha,
      LastInstructionDate: fecha,
      SessionStartTime: inicioClase,
      SessionEndTime: finClase,
      MinutesPerDay: minutos,
      InstructionalMinutes: minutos,
      DaysInSession: 1,
      AttendanceTermIndicator: true,
      MarkingTermIndicator: false,
      SchedulingTermIndicator: false,
      RecordStartDateTime: inicio,
      RecordEndDateTime: null,
    });

    // El rol del docente en la clase.
    const personaDocente = personaDeDocente.get(sesion.teacherId);
    let idRolDocente: number | undefined;
    if (personaDocente !== undefined) {
      idRolDocente = orgRolDocenteEnClase.get(`${sesion.id}`);
      if (idRolDocente === undefined) {
        idRolDocente = agregarRol(orgAsignatura, personaDocente, ROLE.teacher, momento, finMomento);
        orgRolDocenteEnClase.set(`${sesion.id}`, idRolDocente);
      }
    }

    // La asistencia de los alumnos de la clase.
    for (const asistencia of sesion.attendances) {
      const personaAlumno = personaDeAlumno.get(asistencia.studentId);
      if (personaAlumno === undefined) continue;

      const idRolAlumno = agregarRol(orgAsignatura, personaAlumno, ROLE.student, momento, finMomento);
      orgRolAlumnoEnClase.set(`${sesion.id}|${asistencia.studentId}`, idRolAlumno);

      const estado = estadoDeAsistencia(asistencia.status, asistencia.justificationType);
      eventos.push({
        RoleAttendanceEventId: idEvento.siguiente(),
        OrganizationPersonRoleId: idRolAlumno,
        Date: momento,
        RefAttendanceEventTypeId: ATTENDANCE_EVENT_TYPE.classSection,
        RefAttendanceStatusId: estado.estado,
        RefPresentAttendanceCategoryId: estado.presente,
        RefAbsentAttendanceCategoryId: estado.ausente,
        VirtualIndicator: false,
        digitalRandomKey: claveDeVerificacion(`${sesion.id}:${asistencia.id}`),
        digitalRandomKeyDate: momentoChile(fechaLocal(asistencia.recordedAt), "00:00:00"),
        observaciones: [asistencia.justificationNote, asistencia.justificationType]
          .filter(Boolean)
          .join(" - ")
          .slice(0, 2000),
        oprIdRatificador: idRolDocente ?? null,
        fechaRatificador: momentoChile(fechaLocal(sesion.recordedAt), inicioClase),
        RecordStartDateTime: inicio,
        RecordEndDateTime: null,
      });

      const claveAlumno = `${sesion.courseId}|${asistencia.studentId}`;
      clasesPorAlumno.set(claveAlumno, (clasesPorAlumno.get(claveAlumno) ?? 0) + 1);
      if (asistencia.status === "ABSENT") {
        ausenciasPorAlumno.set(claveAlumno, (ausenciasPorAlumno.get(claveAlumno) ?? 0) + 1);
      }
    }
  }

  // Los días que hay clases de cada asignatura.
  for (const [clave, dias] of diasPorAsignatura) {
    const orgAsignatura = orgDeAsignatura.get(clave);
    const orgCalendario = calendarioPorAsignatura.get(clave);
    if (orgAsignatura === undefined || orgCalendario === undefined) continue;
    for (const dia of [...dias].sort()) {
      diasCalendario.push({
        OrganizationCalendarDayId: idDiaCalendario.siguiente(),
        OrganizationCalendarId: orgCalendario,
        DayName: dia,
        AlternateDayName: dia.slice(0, 1),
        RecordStartDateTime: inicio,
        RecordEndDateTime: null,
      });
    }
  }

  // El resumen de asistencia por alumno y curso.
  for (const [clave, idRol] of orgRolAlumnoEnCurso) {
    const total = clasesPorAlumno.get(clave) ?? 0;
    if (total === 0) continue;
    const ausencias = ausenciasPorAlumno.get(clave) ?? 0;
    asistencias.push({
      RoleAttendanceId: idAsistencia.siguiente(),
      OrganizationPersonRoleId: idRol,
      NumberOfDaysInAttendance: total,
      NumberOfDaysAbsent: ausencias,
      AttendanceRate: Number((((total - ausencias) / total) * 100).toFixed(2)),
      RecordStartDateTime: inicio,
      RecordEndDateTime: null,
    });
  }

  // --- El JSON ---
  return {
    _Organizaciones: [
      {
        Organization: organizaciones,
        OrganizationIdentifier: identificadoresOrg,
        OrganizationRelationship: relacionesOrg,
        OrganizationEmail: emailsOrg,
        OrganizationTelephone: telefonosOrg,
        OrganizationLocation: ubicacionesOrg,
      },
    ],
    _Personas: [
      {
        Person: personas,
        PersonIdentifier: identificadoresPersona,
        PersonEmailAddress: emailsPersona,
        PersonTelephone: telefonosPersona,
        PersonAddress: direccionesPersona,
        PersonRelationship: relacionesPersona,
      },
    ],
    _ComunidadEducativa: [
      {
        OrganizationPersonRole: roles,
        RoleAttendanceEvent: eventos,
        RoleAttendance: asistencias,
        K12StudentEnrollment: matriculasEde,
      },
    ],
    _Cursos: [
      {
        Course: cursosEde,
        CourseSection: seccionesEde,
        CourseSectionSchedule: horariosEde,
        Location: locations,
        LocationAddress: direccionesLocation,
      },
    ],
    _Calendarios: [
      {
        OrganizationCalendar: calendarios,
        OrganizationCalendarSession: sesionesCalendario,
        OrganizationCalendarDay: diasCalendario,
      },
    ],
  };
}
