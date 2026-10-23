// Códigos de referencia del MINEDUC para el EDE.
//
// El MINEDUC no publica el diccionario completo: lo distributes cifrado dentro
// de la base de validación. Lo que sí es público son tres fuentes:
//
//   - El "NDS Reference v7.1" (la hoja "NDS Columns" del Excel que usa el
//     propio ETL del MINEDUC) define los grupos, tablas y columnas.
//   - El "Mapeo de datos Libro de clases digital (EDE)" (12 hojas) es la
//     plantilla que el MINEDUC entrega a los proveedores: trae los ids reales
//     de las tablas de referencia.
//   - `listValidationData.xlsx` (dentro del repositorio del ETL) trae las
//     listas de valores permitidos para la jerarquía del colegio.
//
// Los ids que aparecen acá son los que usan esas tres fuentes. Ojo: el
// diccionario publicado (`reference`) está desactualizado y le faltan las
// filas que el MINEDUC agrejó para Chile, así que un id que no aparece en
// ninguna de las tres fuentes no se usa: se deja el campo vacío y se avisa.

/** `RefOrganizationType`: qué es cada organización de la jerarquía. */
export const ORGANIZATION_TYPE = {
  /** 10 (K12School): el establecimiento. */
  school: 10,
  /** 21 (Course): el curso ("3°Básico A"). */
  course: 21,
  /** 22 (CourseSection): la asignatura dentro del curso. */
  courseSection: 22,
  /** 38 (Modalidad): modalidad de enseñanza. */
  modality: 38,
  /** 39 (Jornada): jornada escolar. */
  jornada: 39,
  /** 40 (Nivel): nivel educacional. */
  level: 40,
  /** 41 (Rama): rama de especialidad. */
  branch: 41,
  /** 42 (Sector): sector económico. */
  sector: 42,
  /** 43 (Especialidad): especialidad. */
  specialty: 43,
  /** 44 (TipoCurso): tipo de curso (simple o combinado). */
  courseType: 44,
  /** 45 (Enseñanza): código de enseñanza. */
  teachingCode: 45,
  /** 46 (Grado): grado de enseñanza. */
  grade: 46,
} as const;

/** `RefOrganizationIdentificationSystem`: de dónde sale el identificador. */
export const ORGANIZATION_IDENTIFICATION_SYSTEM = {
  /** 48 (RBD): Rol de Base de Datos del Ministerio de Educación. */
  rbd: 48,
  /** 49 (RUT): Rol Único Tributario. */
  rut: 49,
} as const;

/** `RefOrganizationIdentifierType`: para qué sirve el identificador. */
export const ORGANIZATION_IDENTIFIER_TYPE = {
  /** 17 (MINEDUC): sistema de identificación del Ministerio de Educación. */
  mineduc: 17,
} as const;

/** `RefOrganizationRelationship`: cómo se unen dos organizaciones. */
export const ORGANIZATION_RELATIONSHIP = {
  /** 3 (InternalOrganization): una organización dentro de otra. */
  internal: 3,
} as const;

/** `RefEmailType`: a qué dirección corresponde el correo. */
export const EMAIL_TYPE = {
  /** 3 (Organizational): el correo institucional del colegio. */
  organizational: 3,
  /** 1 (Home): correo personal. */
  home: 1,
  /** 2 (Work): correo del trabajo. */
  work: 2,
} as const;

/** `RefInstitutionTelephoneType`: a qué teléfono corresponde el número. */
export const INSTITUTION_TELEPHONE_TYPE = {
  /** 2 (Administrative): teléfono administrativo del colegio. */
  administrative: 2,
} as const;

/** `RefPersonTelephoneNumberType`: a qué teléfono corresponde el número. */
export const PERSON_TELEPHONE_TYPE = {
  /** 1 (Home): teléfono de la casa. */
  home: 1,
  /** 2 (Work): teléfono del trabajo. */
  work: 2,
  /** 3 (Mobile): teléfono móvil. */
  mobile: 3,
} as const;

/** `RefOrganizationLocationType`: qué ubicación representa la dirección. */
export const ORGANIZATION_LOCATION_TYPE = {
  /** 2 (Physical): la dirección donde está el establecimiento. */
  physical: 2,
} as const;

/** `RefPersonLocationType`: qué ubicación representa la dirección. */
export const PERSON_LOCATION_TYPE = {
  /** 1 (Mailing): la dirección de la persona. */
  mailing: 1,
} as const;

/** `RefPersonIdentificationSystem`: qué identificador es el de la fila. */
export const PERSON_IDENTIFICATION_SYSTEM = {
  /** 51 (RUN): Rol Único Nacional. */
  run: 51,
  /** 52 (IPE): Identificador Provisorio Escolar. */
  ipe: 52,
  /** 54 (listNumber): número de lista del alumno en el curso. */
  listNumber: 54,
  /** 55 (SchoolNumber): número correlativo de matrícula del alumno. */
  schoolNumber: 55,
} as const;

/** `RefPersonRelationship`: de quién es apoderado quién. */
export const PERSON_RELATIONSHIP = {
  /** 31 (Apoderado): el apoderado del alumno. */
  apoderado: 31,
} as const;

/** `RefAttendanceEventType`: qué tipo de asistencia se está registrando. */
export const ATTENDANCE_EVENT_TYPE = {
  /** 1 (DailyAttendance): asistencia diaria del curso. */
  daily: 1,
  /** 2 (ClassSectionAttendance): asistencia por clase (registro de asignatura). */
  classSection: 2,
  /** 5 (Asistencia al establecimiento): asistencia al colegio. */
  school: 5,
} as const;

/** `RefAttendanceStatus`: cómo está el alumno en la clase. */
export const ATTENDANCE_STATUS = {
  /** 1 (Present): presente. */
  present: 1,
  /** 2 (ExcusedAbsence): ausencia justificada. */
  excusedAbsence: 2,
  /** 3 (UnexcusedAbsence): ausencia injustificada. */
  unexcusedAbsence: 3,
  /** 4 (Tardy): atraso. */
  tardy: 4,
  /** 5 (EarlyDeparture): salida anticipada. */
  earlyDeparture: 5,
} as const;

/** `RefAbsentAttendanceCategory`: por qué no estuvo. */
export const ABSENT_CATEGORY = {
  /** 2 (Absent - Family activity): permiso o actividad familiar. */
  familyActivity: 2,
  /** 3 (Absent - Family emergency or bereavement): duelo o urgencia familiar. */
  familyEmergency: 3,
  /** 4 (Absent - Illness, injury, health treatment): enfermedad o licencia. */
  illness: 4,
  /** 8 (Absent - Situation unknown): no se sabe. */
  unknown: 8,
} as const;

/** `RefPresentAttendanceCategory`: cómo estuvo presente. */
export const PRESENT_CATEGORY = {
  /** 2 (Present - In school, regular instructional program): en el colegio. */
  inSchool: 2,
} as const;

/**
 * `Role`: los roles que usa el MINEDUC.
 *
 * No vienen del diccionario publicado (que está desactualizado), sino de la
 * plantilla oficial del mapeo: 4 = profesor jefe, 5 = docente, 6 = estudiante,
 * 11 = personal administrativo, 15 = padre, madre o apoderado, 18 = persona que
 * retira al estudiante.
 */
export const ROLE = {
  /** 4: profesor jefe. */
  headTeacher: 4,
  /** 5: docente. */
  teacher: 5,
  /** 6: estudiante. */
  student: 6,
  /** 11: personal administrativo. */
  administrative: 11,
  /** 15: padre, madre o apoderado. */
  guardian: 15,
  /** 18: persona que retira al estudiante. */
  withdrawer: 18,
} as const;

/** `RefSex`: sexo de la persona. */
export const SEX = {
  /** 1 (Male): masculino. */
  male: 1,
  /** 2 (Female): femenino. */
  female: 2,
  /** 3 (NotSelected): sin seleccionar. */
  notSelected: 3,
} as const;

/** `RefEnrollmentStatus`: estado de la matrícula. */
export const ENROLLMENT_STATUS = {
  /** 2 (Currently enrolled): matriculado. */
  currentlyEnrolled: 2,
  /** 3 (Previously enrolled): matrícula cerrada. */
  previouslyEnrolled: 3,
} as const;

/** `RefCourseSectionDeliveryMode`: cómo se dicta la asignatura. */
export const DELIVERY_MODE = {
  /** 5 (Online): en línea. */
  online: 5,
  /** 7 (FaceToFace): presencial. */
  faceToFace: 7,
} as const;

/** `RefSingleSexClassStatus`: si el curso es de un solo sexo. */
export const SINGLE_SEX_STATUS = {
  /** 3 (NotSingleSex): curso mixto. */
  notSingleSex: 3,
} as const;

/**
 * `RefInstructionLanguage`: idioma de la instrucción.
 *
 * El 400 (spa) viene de la plantilla oficial del mapeo; el diccionario
 * publicado no trae la tabla.
 */
export const INSTRUCTION_LANGUAGE = {
  /** 400 (spa): español. */
  spanish: 400,
} as const;

/**
 * La jerarquía del colegio, con los valores que permite
 * `listValidationData.xlsx`. Son strings porque así los compara el validador
 * (`validaNivel`, `validaJornada`, `validaGrado`…).
 */
export const JERARQUIA = {
  /** Modalidades de enseñanza. */
  modalidades: {
    regular: "Regular",
    especial: "Especial",
    adulto: "Adulto",
  },
  /** Jornadas escolares. */
  jornadas: {
    manana: "Mañana",
    tarde: "Tarde",
    ambas: "Mañana y Tarde",
    vespertina: "Vespertina/Nocturna",
  },
  /** Niveles educacionales. */
  niveles: {
    PARVULARIA: "01:Educación Parvularia",
    PREBASICA: "01:Educación Parvularia",
    BASICA: "02:Enseñanza Básica Niños",
    MEDIA: "05:Enseñanza Media Humanístico Científica Jóvenes",
    TECNICO: "07:Enseñanza Media Técnico Profesional y Artística (Jóvenes)",
  },
  /** Rama, sector y especialidad: el MINEDUC usa "sin información" cuando
   *  el establecimiento no declara una especialidad. */
  rama: "000:Sin Información",
  sector: "000:Sin Información",
  especialidad: "000:Sin Información",
  /** Tipo de curso: simple (una asignatura por bloque) es lo habitual. */
  tipoCurso: "01:Simple",
  /** Códigos de enseñanza (`codigoEnseList`). */
  codigoEnse: {
    PARVULARIA: "010:Educación Parvularia",
    PREBASICA: "010:Educación Parvularia",
    BASICA: "110:Enseñanza Básica",
    MEDIA: "310:Enseñanza Media H-C niños y jóvenes",
    TECNICO: "410:Enseñanza Media T-P Comercial Niños y Jóvenes",
  },
  /** Grados de enseñanza (`gradoList`), por número de grado. */
  grados: {
    PARVULARIA: "010.04:Primer Nivel de Transición (Pre-kinder)",
    PREBASICA: "010.05:Segundo Nivel de Transición (Kinder)",
  },
  /** Cuando no se puede determinar el grado. */
  gradoDesconocido: "000:Sin Información",
} as const;

/** Los grados de 1° a 8° básico, con el código que usa el MINEDUC. */
export const GRADOS_BASICA = [
  "110.01:1º Básico",
  "110.02:2º Básico",
  "110.03:3º Básico",
  "110.04:4º Básico",
  "110.05:5º Básico",
  "110.06:6º Básico",
  "110.07:7º Básico",
  "110.08:8º Básico",
] as const;

/**
 * Los días de la semana, como los escribe el validador.
 *
 * El validador compara `ClassMeetingDays LIKE '%'||diaSemana||'%'`, con los
 * nombres tal cual salen de su `CASE`: "Miércoles" con tilde y "Sabado" sin
 * ella.
 */
export const DIAS_SEMANA = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sabado",
] as const;

// ---------------------------------------------------------------------------
// Códigos de CALIFICACIONES (Assessment / Evaluation)
// ---------------------------------------------------------------------------
//
// Basados en el NDS Reference v7.1 y la plantilla oficial del MINEDUC.
// El MINEDUC usa estas tablas: RoleAssessment, AssessmentScore,
// AssessmentReportingPeriod, AssessmentSubScore.

/** `RefAssessmentType`: tipo de evaluación. */
export const ASSESSMENT_TYPE = {
  /** 1 (Diagnostic): evaluación diagnóstica. */
  diagnostic: 1,
  /** 2 (Formative): evaluación formativa / de proceso. */
  formative: 2,
  /** 3 (Summative): evaluación sumativa / de resultado. */
  summative: 3,
  /** 4 (Benchmark): evaluación de referencia / comparativa. */
  benchmark: 4,
  /** 5 (Other): otro tipo. */
  other: 5,
} as const;

/** `RefAssessmentReportingMethod`: cómo se reporta la calificación. */
export const ASSESSMENT_REPORTING_METHOD = {
  /** 1 (Numeric): nota numérica (1.0–7.0 en Chile). */
  numeric: 1,
  /** 2 (Letter): nota con letras (A, B, C...). */
  letter: 2,
  /** 3 (Pass/Fail): aprobado/reprobado. */
  passFail: 3,
  /** 4 (Other): otro método. */
  other: 4,
} as const;

/** `RefScoreMetricType`: métrica de la nota. */
export const SCORE_METRIC_TYPE = {
  /** 1 (Points): puntos (0–100 o similar). */
  points: 1,
  /** 2 (Percent): porcentaje (0–100%). */
  percent: 2,
  /** 3 (ScaleScore): escala (1.0–7.0 con un decimal, Art. 8 Decreto 67). */
  scaleScore: 3,
  /** 4 (RawScore): puntaje bruto. */
  rawScore: 4,
} as const;

/** Mapea `EvaluationType` de Prisma a `ASSESSMENT_TYPE` del MINEDUC. */
export function assessmentTypeDe(evalType: string): number {
  switch (evalType) {
    case "DIAGNOSTICA":
      return ASSESSMENT_TYPE.diagnostic;
    case "PRUEBA":
    case "EXAMEN":
      return ASSESSMENT_TYPE.summative;
    case "TRABAJO":
    case "EXPOSICION":
      return ASSESSMENT_TYPE.formative;
    default:
      return ASSESSMENT_TYPE.other;
  }
}

/** En Chile la nota se reporta en escala 1.0–7.0 (Art. 8 D.67). */
export const CHILE_REPORTING_METHOD = ASSESSMENT_REPORTING_METHOD.numeric;
export const CHILE_SCORE_METRIC = SCORE_METRIC_TYPE.scaleScore;
