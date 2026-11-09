// Datos para el panel del colegio: asistencia, notas, firmas y convivencia.
//
// Todas las funciones son puras de lectura y sirven para poblar el panel del
// colegio (solo dirección, UTP y admin; el docente ve TeacherHome).
//
// Ninguna usa toLocaleString/toLocaleDateString: eso provoca el error de
// hidratación #441 en Server Components. Las fechas se formatean con
// FormattedDate en el cliente o con formatDate de money.ts.

import { db } from "@/lib/db";
import { formatDate } from "@/lib/money";
import { resumenConvivencia } from "@/lib/school-convivencia";
import { estadoDeFirmas } from "@/lib/school-signatures";

/** Resumen general de asistencia del colegio (últimos 30 días). */
export type ResumenAsistenciaColegio = {
  /** Total de clases registradas en el período. */
  totalClases: number;
  /** Alumnos matriculados activos. */
  totalAlumnos: number;
  /** Porcentaje de asistencia efectiva (0-100). */
  porcentajeAsistencia: number;
  /** Número de inasistencias sin justificar. */
  inasistencias: number;
  /** Número de clases firmadas. */
  clasesFirmadas: number;
  /** Número de clases sin firmar. */
  clasesSinFirmar: number;
};

/** Datos de una clase para el gráfico de asistencia diaria. */
export type AsistenciaDia = {
  fecha: string; // YYYY-MM-DD
  clases: number;
  alumnosRegistrados: number;
  alumnosEsperados: number;
  porcentaje: number;
};

/** Datos de notas por curso para el gráfico de rendimiento. */
export type RendimientoCurso = {
  courseId: string;
  curso: string;
  promedio: number | null;
  aprobados: number;
  reprobados: number;
  sinNota: number;
  total: number;
};

/** Datos de notas por asignatura para el gráfico de barras. */
export type RendimientoAsignatura = {
  subjectId: string;
  asignatura: string;
  promedio: number | null;
  count: number;
};

/** Resumen de convivencia extendido para el panel. */
export type ResumenConvivenciaPanel = {
  abiertos: number;
  vencidos: number;
  urgentes: number;
  proximos: number;
};

/**
 * Resumen general de asistencia del colegio en los últimos 30 días.
 */
export async function resumenAsistenciaColegio(
  schoolId: string,
): Promise<ResumenAsistenciaColegio> {
  const hoy = new Date();
  const hace30Dias = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate() - 29));

  const [clases, firmas, matriculas] = await Promise.all([
    db.classSession.findMany({
      where: {
        schoolId,
        date: { gte: hace30Dias, lte: hoy },
      },
      select: { id: true, courseId: true, date: true },
    }),
    estadoDeFirmas(schoolId),
    db.enrollment.count({
      where: { course: { schoolId }, status: "ACTIVE" },
    }),
  ]);

  const sessionIds = clases.map((c) => c.id);
  let inasistencias = 0;
  let alumnosRegistrados = 0;
  let alumnosEsperados = 0;

  if (sessionIds.length > 0) {
    const registros = await db.attendanceRecord.findMany({
      where: { sessionId: { in: sessionIds } },
      select: { status: true, studentId: true },
    });

    // Contar inasistencias y registros directos
    for (const r of registros) {
      if (r.status === "ABSENT") inasistencias += 1;
      alumnosRegistrados += 1;
    }

    // Esperados = matrículas del curso de cada clase
    const cursosIds = [...new Set(clases.map((c) => c.courseId))];
    for (const cid of cursosIds) {
      const count = await db.enrollment.count({
        where: { courseId: cid, status: "ACTIVE" },
      });
      const clasesDelCurso = clases.filter((c) => c.courseId === cid).length;
      alumnosEsperados += count * clasesDelCurso;
    }
  }

  const porcentaje = alumnosEsperados > 0 ? Math.round(((alumnosRegistrados - inasistencias) / alumnosEsperados) * 100) : 0;

  return {
    totalClases: clases.length,
    totalAlumnos: matriculas,
    porcentajeAsistencia: porcentaje,
    inasistencias,
    clasesFirmadas: firmas.firmadas,
    clasesSinFirmar: firmas.pendientes,
  };
}

/**
 * Asistencia diaria de los últimos 14 días para el gráfico de evolución.
 */
export async function asistenciaDiaria(schoolId: string): Promise<AsistenciaDia[]> {
  const hoy = new Date();
  const hace14Dias = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate() - 13));

  const clases = await db.classSession.findMany({
    where: {
      schoolId,
      date: { gte: hace14Dias, lte: hoy },
    },
    orderBy: { date: "asc" },
    select: { id: true, courseId: true, date: true },
  });

  if (clases.length === 0) return [];

  const sessionIds = clases.map((c) => c.id);
  const registros = await db.attendanceRecord.findMany({
    where: { sessionId: { in: sessionIds } },
    select: { status: true, studentId: true, sessionId: true },
  });

  const porDia = new Map<string, { clases: number; registrados: Set<string>; esperados: Set<string> }>();
  for (const c of clases) {
    const clave = c.date.toISOString().slice(0, 10);
    if (!porDia.has(clave)) {
      porDia.set(clave, { clases: 0, registrados: new Set(), esperados: new Set() });
    }
    const d = porDia.get(clave)!;
    d.clases += 1;
  }

  // Agrupar registros por sesión
  const registrosPorSesion = new Map<string, { registrados: number; absent: number }>();
  for (const r of registros) {
    const existente = registrosPorSesion.get(r.sessionId) ?? { registrados: 0, absent: 0 };
    existente.registrados += 1;
    if (r.status === "ABSENT") existente.absent += 1;
    registrosPorSesion.set(r.sessionId, existente);
  }

  // Esperados por curso (matrículas activas)
  const cursosIds = [...new Set(clases.map((c) => c.courseId))];
  const esperadosPorCurso = new Map<string, number>();
  for (const cid of cursosIds) {
    const count = await db.enrollment.count({ where: { courseId: cid, status: "ACTIVE" } });
    esperadosPorCurso.set(cid, count);
  }

  const resultado: AsistenciaDia[] = [];
  for (const [fecha, d] of porDia.entries()) {
    let registrados = 0;
    let esperados = 0;
    for (const c of clases) {
      if (c.date.toISOString().slice(0, 10) !== fecha) continue;
      const rec = registrosPorSesion.get(c.id);
      registrados += rec?.registrados ?? 0;
      esperados += esperadosPorCurso.get(c.courseId) ?? 0;
    }
    const porcentaje = esperados > 0 ? Math.round((registrados / esperados) * 100) : 0;
    resultado.push({ fecha, clases: d.clases, alumnosRegistrados: registrados, alumnosEsperados: esperados, porcentaje });
  }

  return resultado.sort((a, b) => a.fecha.localeCompare(b.fecha));
}

/**
 * Rendimiento académico por curso: promedio, aprobados, reprobados.
 */
export async function rendimientoPorCurso(schoolId: string): Promise<RendimientoCurso[]> {
  const cursos = await db.course.findMany({
    where: { schoolId, active: true },
    orderBy: [{ year: "desc" }, { name: "asc" }],
    select: { id: true, name: true, year: true },
  });

  const resultado: RendimientoCurso[] = [];
  for (const curso of cursos) {
    const reporte = await courseReport(curso.id);
    let sumaPromedios = 0;
    let countPromedios = 0;
    let aprobados = 0;
    let reprobados = 0;
    let sinNota = 0;

    for (const alumno of reporte.alumnos) {
      if (alumno.promedio === null) {
        sinNota += 1;
        continue;
      }
      sumaPromedios += alumno.promedio;
      countPromedios += 1;
      if (alumno.promedio >= 4.0) aprobados += 1;
      else reprobados += 1;
    }

    resultado.push({
      courseId: curso.id,
      curso: `${curso.name} · ${curso.year}`,
      promedio: countPromedios > 0 ? Math.round((sumaPromedios / countPromedios) * 10) / 10 : null,
      aprobados,
      reprobados,
      sinNota,
      total: reporte.alumnos.length,
    });
  }

  return resultado.sort((a, b) => (b.promedio ?? 0) - (a.promedio ?? 0));
}

/**
 * Rendimiento por asignatura (agregado de todo el colegio).
 */
export async function rendimientoPorAsignatura(schoolId: string): Promise<RendimientoAsignatura[]> {
  const evaluaciones = await db.evaluation.findMany({
    where: { schoolId },
    select: {
      id: true,
      subjectId: true,
      grades: { select: { value: true, status: true } },
      subject: { select: { id: true, name: true } },
    },
  });

  const porAsignatura = new Map<string, { nombre: string; notas: number[]; count: number }>();
  for (const ev of evaluaciones) {
    const clave = ev.subjectId;
    if (!porAsignatura.has(clave)) {
      porAsignatura.set(clave, { nombre: ev.subject.name, notas: [], count: 0 });
    }
    const entry = porAsignatura.get(clave)!;
    for (const g of ev.grades) {
      if (g.status === "GRADED" && g.value !== null) {
        entry.notas.push(g.value);
        entry.count += 1;
      }
    }
  }

  const resultado: RendimientoAsignatura[] = [];
  for (const [, entry] of porAsignatura.entries()) {
    const promedio = entry.notas.length > 0
      ? Math.round((entry.notas.reduce((a, b) => a + b, 0) / entry.notas.length) * 10) / 10
      : null;
    resultado.push({ subjectId: "", asignatura: entry.nombre, promedio, count: entry.count });
  }

  return resultado.sort((a, b) => (b.promedio ?? 0) - (a.promedio ?? 0));
}

/**
 * Resumen de convivencia extendido (incluye próximos a vencer).
 */
export async function resumenConvivenciaPanel(schoolId: string): Promise<ResumenConvivenciaPanel> {
  const base = await resumenConvivencia(schoolId);
  const casos = await db.conductCase.findMany({
    where: { schoolId, status: { in: ["ABIERTO", "EN_INVESTIGACION", "MEDIACION"] } },
    select: { investigationDueAt: true },
  });

  const hoy = new Date();
  let proximos = 0;
  for (const caso of casos) {
    const dias = Math.ceil((caso.investigationDueAt.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
    if (dias >= 0 && dias <= 30) proximos += 1;
  }

  return { ...base, proximos };
}

/**
 * Últimas clases firmadas para mostrar en el panel.
 */
export async function ultimasClasesFirmadas(schoolId: string, take = 5) {
  const firmas = await db.schoolSignature.findMany({
    where: { schoolId },
    orderBy: { verifiedAt: "desc" },
    take,
    select: {
      id: true,
      verifiedAt: true,
      signerName: true,
      session: {
        select: {
          id: true,
          course: { select: { name: true } },
          subject: { select: { name: true } },
        },
      },
    },
  });

  return firmas.map((f) => ({
    id: f.id,
    fecha: f.verifiedAt,
    fechaFormateada: formatDate(f.verifiedAt),
    firmante: f.signerName,
    curso: f.session.course.name,
    asignatura: f.session.subject.name,
  }));
}
