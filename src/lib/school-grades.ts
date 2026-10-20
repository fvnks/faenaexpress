// Calificaciones y promoción (Decreto 67/2018 del MINEDUC).
//
// Este archivo es la única fuente del cálculo: lo llaman las pantallas, el acta
// de promoción y cualquier export. La regla vive acá y no repartida en la UI,
// porque una nota que no se puede auditar no sirve para nada (y el colegio
// tiene que poder mostrar de dónde sale un promedio).
//
// Lo que dice el decreto (textos del 20-10-2026):
//
//   Art. 8  La calificación final anual se expresa en una escala numérica de
//           1.0 a 7.0, hasta con un decimal, y la calificación mínima de
//           aprobación es un 4.0.
//   Art. 7  Las calificaciones de Religión, Consejo de Curso y Orientación no
//           inciden en el promedio final anual ni en la promoción.
//   Art. 9  La cantidad de calificaciones y las ponderaciones son las que
//           coherentes con la planificación del docente, acordadas con el jefe
//           técnico-pedagógico.
//   Art. 10 Se promoven quienes (a) aprobaron todas las asignaturas, o
//           (b) reprobaron una y el promedio final anual es 4.5 o más, o
//           (c) reprobaron dos y el promedio final anual es 5.0 o más. Y además
//           quien tenga 85% o más de asistencia en el calendario escolar anual.
//   Art. 11 Quien no cumple lo anterior debe undergo un análisis deliberativo
//           con informe del jefe técnico-pedagógico: la decisión es del
//           establecimiento, no del sistema.
//
// O sea: el sistema calcula la regla y MARCA los casos que requieren análisis.
// No decide la repitencia: esa decisión es de la dirección y la UTP.

import { db } from "@/lib/db";
import { attendanceByStudents } from "@/lib/school-attendance";
import {
  ASISTENCIA_MINIMA,
  NOTA_APROBACION,
  PROMEDIO_CON_DOS_REPROBADAS,
  PROMEDIO_CON_UNA_REPROBADA,
  promedioPonderado,
} from "@/lib/school-grading-math";

export {
  ASISTENCIA_MINIMA,
  NOTA_APROBACION,
  PROMEDIO_CON_DOS_REPROBADAS,
  PROMEDIO_CON_UNA_REPROBADA,
};

export type NotaEvaluacion = {
  evaluacionId: string;
  nombre: string;
  fecha: Date;
  /** Ponderación de la evaluación dentro de la asignatura (%). */
  weight: number;
  nota: number | null;
  estado: "PENDIENTE" | "GRADED" | "EXENTO";
};

export type NotaAsignatura = {
  subjectId: string;
  nombre: string;
  /** Si la asignatura incide en el promedio final (Art. 7). */
  incide: boolean;
  /** Nota de cada período (ponderada por el peso del período). */
  periodos: { periodoId: string; nombre: string; nota: number | null }[];
  /** Nota final anual de la asignatura. */
  final: number | null;
  /** Reproba: la nota final es menor a 4.0 (Art. 8). */
  reprobada: boolean;
  /** Cuántas evaluaciones se Hana aplicado y cuántas están pendientes. */
  aplicadas: number;
  pendientes: number;
};

export type SituacionPromocion = {
  estado: "PROMOVIDO" | "REQUIERE_ANALISIS";
  /** Por qué, en palabras: es lo que va al acta. */
  fundamento: string;
  /** La regla que se aplicó (o la que faltó). */
  regla: string;
  /** Asignaturas reprobadas. */
  reprobadas: string[];
  /** Promedio final anual (null si no hay notas). */
  promedio: number | null;
  /** Porcentaje de asistencia anual (null si no hay clases dictadas). */
  asistencia: number | null;
  /** Cumple el 85% de asistencia. */
  cumpleAsistencia: boolean;
};

export type ParteAlumno = {
  studentId: string;
  nombre: string;
  rut: string | null;
  /** Identificador provisorio escolar, si el alumno no tiene RUT (Art. 20). */
  identificadorProvisorio: string | null;
  asignaturas: NotaAsignatura[];
  /** Promedio final anual (Art. 10). */
  promedio: number | null;
  /** Porcentaje de asistencia anual. */
  asistencia: number | null;
  cumpleAsistencia: boolean;
  situacion: SituacionPromocion;
};

export type ParteCurso = {
  courseId: string;
  nombreCurso: string;
  /** Las asignaturas del plan de estudios del curso (columnas del acta). */
  asignaturas: { id: string; nombre: string; incide: boolean }[];
  periodos: { id: string; nombre: string; weight: number; order: number }[];
  alumnos: ParteAlumno[];
};

/**
 * Promedio ponderado de una lista de (nota, peso).
 *
 * Si ninguna tiene peso, todas pesan lo mismo (el caso normal cuando el
 * docente no pondera). Si alguna lo tiene, manda el peso: las que quedaron en
 * cero no cuentan, porque una ponderación a medias es un error de la
 * planificación y tiene que verse.
 */

/** Los períodos de evaluación del colegio, en orden. */
export async function listPeriods(schoolId: string) {
  return db.gradingPeriod.findMany({
    where: { schoolId },
    orderBy: [{ order: "asc" }, { startDate: "asc" }],
  });
}

/** Las asignaturas que se imparten en un curso. */
export async function courseSubjects(courseId: string) {
  return db.teachingAssignment.findMany({
    where: { courseId },
    include: { subject: { select: { id: true, name: true, countsForPromotion: true } } },
    orderBy: { subject: { name: "asc" } },
  });
}

/** Las evaluaciones de un curso, con la nota de cada alumno. */
export async function listEvaluations(
  schoolId: string,
  courseId: string,
  opts: { periodoId?: string; subjectId?: string } = {},
) {
  return db.evaluation.findMany({
    where: {
      schoolId,
      courseId,
      ...(opts.periodoId ? { periodId: opts.periodoId } : {}),
      ...(opts.subjectId ? { subjectId: opts.subjectId } : {}),
    },
    orderBy: [{ date: "asc" }, { name: "asc" }],
    include: {
      subject: { select: { id: true, name: true } },
      period: { select: { id: true, name: true, order: true } },
      grades: {
        select: { studentId: true, value: true, status: true },
      },
    },
  });
}

/**
 * El parte de notas del curso: por alumno, sus notas por asignatura y su
 * situación de promoción.
 *
 * Es el cálculo que respalda el acta de promoción (Art. 20) y el parte de
 * notas que ve el apoderado.
 */
export async function courseReport(courseId: string): Promise<ParteCurso> {
  const course = await db.course.findUnique({
    where: { id: courseId },
    select: { id: true, name: true, schoolId: true, year: true },
  });
  if (!course) {
    return { courseId, nombreCurso: "", asignaturas: [], periodos: [], alumnos: [] };
  }

  const [periodos, asignaturas, matriculaciones, evaluaciones] = await Promise.all([
    db.gradingPeriod.findMany({
      where: { schoolId: course.schoolId },
      orderBy: [{ order: "asc" }, { startDate: "asc" }],
    }),
    courseSubjects(courseId),
    db.enrollment.findMany({
      where: { courseId },
      include: {
        student: {
          select: { id: true, firstName: true, lastName: true, rut: true, status: true },
        },
      },
      orderBy: { student: { lastName: "asc" } },
    }),
    db.evaluation.findMany({
      where: { courseId },
      select: {
        id: true,
        name: true,
        date: true,
        weight: true,
        subjectId: true,
        periodId: true,
        grades: { select: { studentId: true, value: true, status: true } },
      },
    }),
  ]);

  const evaluacionesPorClave = new Map<string, typeof evaluaciones>();
  const evaluacionesPorAsignatura = new Map<string, typeof evaluaciones>();
  for (const ev of evaluaciones) {
    const clave = `${ev.subjectId}|${ev.periodId}`;
    const lista = evaluacionesPorClave.get(clave) ?? [];
    lista.push(ev);
    evaluacionesPorClave.set(clave, lista);

    const porAsignatura = evaluacionesPorAsignatura.get(ev.subjectId) ?? [];
    porAsignatura.push(ev);
    evaluacionesPorAsignatura.set(ev.subjectId, porAsignatura);
  }

  // La nota cruda de cada evaluación: null si el alumno no tiene nota (o está
  // exento). El estado se guarda aparte para distinguir «no registrado» de
  // «registrado como exento».
  const notas = new Map<string, { value: number | null; status: string }>();
  for (const ev of evaluaciones) {
    for (const g of ev.grades) {
      notas.set(`${g.studentId}|${ev.id}`, { value: g.value, status: g.status });
    }
  }
  const notaDe = (alumnoId: string, evId: string): number | null => {
    const g = notas.get(`${alumnoId}|${evId}`);
    if (!g || g.status !== "GRADED") return null;
    return g.value;
  };
  const tieneRegistro = (alumnoId: string, evId: string): boolean =>
    notas.has(`${alumnoId}|${evId}`);

  const alumnosIds = matriculaciones.map((m) => m.student.id);
  const asistencias = await attendanceByStudents(courseId, alumnosIds);

  const alumnos: ParteAlumno[] = matriculaciones.map((m) => {
    const alumno = m.student;
    const asignaturasAlumno: NotaAsignatura[] = asignaturas.map((ta) => {
      const asignatura = ta.subject;
      const notasPeriodo = periodos.map((p) => {
        const evs = evaluacionesPorClave.get(`${asignatura.id}|${p.id}`) ?? [];
        const items = evs
          .map((ev) => ({ nota: notaDe(alumno.id, ev.id), peso: ev.weight }))
          .filter((i): i is { nota: number; peso: number } => i.nota !== null && i.nota !== undefined);
        return {
          periodoId: p.id,
          nombre: p.name,
          nota: promedioPonderado(items),
        };
      });

      // Nota final anual: los períodos con nota, ponderados por el peso del
      // período (60/40 en régimen semestral, 70/30/10 en trimestral).
      const items = notasPeriodo
        .filter((n) => n.nota !== null)
        .map((n) => ({
          nota: n.nota as number,
          peso: periodos.find((p) => p.id === n.periodoId)?.weight ?? 0,
        }));
      const final = promedioPonderado(items);

      const evs = evaluacionesPorAsignatura.get(asignatura.id) ?? [];
      const aplicadas = evs.filter((ev) => tieneRegistro(alumno.id, ev.id)).length;
      const pendientes = evs.length - aplicadas;

      return {
        subjectId: asignatura.id,
        nombre: asignatura.name,
        incide: asignatura.countsForPromotion,
        periodos: notasPeriodo,
        final,
        reprobada: final !== null && final < NOTA_APROBACION,
        aplicadas,
        pendientes,
      };
    });

    const promedio = promedioFinalAnual(asignaturasAlumno);
    const resumen = asistencias.get(alumno.id);
    const asistencia = resumen && !resumen.sinClases ? resumen.porcentaje : null;
    const cumpleAsistencia = resumen ? resumen.cumple : true;
    const situacion = situaciónPromocion({
      asignaturas: asignaturasAlumno,
      promedio,
      asistencia,
      cumpleAsistencia,
    });

    return {
      studentId: alumno.id,
      nombre: `${alumno.firstName} ${alumno.lastName}`,
      rut: alumno.rut,
      identificadorProvisorio: alumno.rut ? null : `IP-${alumno.id.slice(-6).toUpperCase()}`,
      asignaturas: asignaturasAlumno,
      promedio,
      asistencia,
      cumpleAsistencia,
      situacion,
    };
  });

  return {
    courseId,
    nombreCurso: course.name,
    asignaturas: asignaturas.map((ta) => ({
      id: ta.subject.id,
      nombre: ta.subject.name,
      incide: ta.subject.countsForPromotion,
    })),
    periodos: periodos.map((p) => ({ id: p.id, nombre: p.name, weight: p.weight, order: p.order })),
    alumnos,
  };
}

/**
 * Promedio final anual del alumno: el promedio de las notas finales de las
 * asignaturas que inciden (Art. 7: Religión, Consejo de Curso y Orientación
 * quedan fuera).
 */
export function promedioFinalAnual(asignaturas: NotaAsignatura[]): number | null {
  const items = asignaturas
    .filter((a) => a.incide && a.final !== null)
    .map((a) => ({ nota: a.final as number, peso: 0 }));
  return promedioPonderado(items);
}

/**
 * La situación de promoción según el Art. 10.
 *
 * Quien no cumple la regla NO queda como repitente: queda marcado para el
 * análisis deliberativo del Art. 11, que es una decisión del establecimiento.
 */
export function situaciónPromocion(input: {
  asignaturas: NotaAsignatura[];
  promedio: number | null;
  asistencia: number | null;
  cumpleAsistencia: boolean;
}): SituacionPromocion {
  const { asignaturas, promedio, asistencia, cumpleAsistencia } = input;

  const reprobadas = asignaturas
    .filter((a) => a.incide && a.reprobada)
    .map((a) => a.nombre);

  const base = {
    reprobadas,
    promedio,
    asistencia,
    cumpleAsistencia,
  };

  // Sin notas no hay regla que aplicar: el caso va a análisis.
  if (promedio === null) {
    return {
      ...base,
      estado: "REQUIERE_ANALISIS",
      regla: "Sin calificaciones registradas",
      fundamento:
        "No hay notas registradas: no se puede aplicar la regla de promoción (Art. 10). Requiere análisis (Art. 11).",
    };
  }

  if (!cumpleAsistencia) {
    return {
      ...base,
      estado: "REQUIERE_ANALISIS",
      regla: `Asistencia menor a ${ASISTENCIA_MINIMA}%`,
      fundamento: `La asistencia es de ${asistencia?.toFixed(1)}%, menor al ${ASISTENCIA_MINIMA}% exigido (Art. 10.2). Requiere análisis (Art. 11); la dirección y la UTP pueden autorizar la promoción.`,
    };
  }

  if (reprobadas.length === 0) {
    return {
      ...base,
      estado: "PROMOVIDO",
      regla: "Aprobó todas las asignaturas",
      fundamento: `Aprobó todas las asignaturas (promedio ${promedio.toFixed(1)}). Se promueve por el Art. 10.1.a.`,
    };
  }

  if (reprobadas.length === 1 && promedio >= PROMEDIO_CON_UNA_REPROBADA) {
    return {
      ...base,
      estado: "PROMOVIDO",
      regla: `Una asignatura reprobada y promedio ${PROMEDIO_CON_UNA_REPROBADA} o más`,
      fundamento: `Reprobó ${reprobadas.join(", ")} y obtuvo un promedio final de ${promedio.toFixed(1)} (mínimo ${PROMEDIO_CON_UNA_REPROBADA}). Se promueve por el Art. 10.1.b.`,
    };
  }

  if (reprobadas.length === 2 && promedio >= PROMEDIO_CON_DOS_REPROBADAS) {
    return {
      ...base,
      estado: "PROMOVIDO",
      regla: `Dos asignaturas reprobadas y promedio ${PROMEDIO_CON_DOS_REPROBADAS} o más`,
      fundamento: `Reprobó ${reprobadas.join(" y ")} y obtuvo un promedio final de ${promedio.toFixed(1)} (mínimo ${PROMEDIO_CON_DOS_REPROBADAS}). Se promueve por el Art. 10.1.c.`,
    };
  }

  const detalle =
    reprobadas.length > 2
      ? `Reprobó ${reprobadas.length} asignaturas`
      : reprobadas.length === 1
        ? `Reprobó ${reprobadas[0]} y su promedio fue de ${promedio.toFixed(1)}`
        : `Reprobó ${reprobadas.join(" y ")} y su promedio fue de ${promedio.toFixed(1)}`;

  return {
    ...base,
    estado: "REQUIERE_ANALISIS",
    regla: "No cumple la regla del Art. 10",
    fundamento: `${detalle}. No cumple la regla de promoción del Art. 10: requiere el análisis deliberativo con informe del jefe técnico-pedagógico (Art. 11).`,
  };
}
