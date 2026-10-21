// Acceso a datos del flujo del Art. 11: los casos que requieren análisis y su
// deliberación guardada.
//
// La parte pura (las reglas de qué falta y cuándo aplica la excepción) está en
// `school-promotion.ts`; acá se cruza con la base.

import { db } from "@/lib/db";
import { courseReport, type ParteAlumno } from "@/lib/school-grades";

export type CasoArt11 = {
  studentId: string;
  nombre: string;
  rut: string | null;
  promedio: number | null;
  asistencia: number | null;
  cumpleAsistencia: boolean;
  fundamento: string;
  reprobadas: string[];
  /** Autorización de excepción por asistencia (Art. 10.2). */
  excepcionAplica: boolean;
  resolucion: {
    id: string;
    utpReport: string | null;
    utpReportedAt: string | null;
    hearingHeldAt: string | null;
    hearingNotes: string | null;
    outcome: "PENDING" | "PROMOTED" | "NOT_PROMOTED";
    decision: string | null;
    decidedAt: string | null;
    attendanceException: boolean;
    attendanceExceptionReason: string | null;
    resolved: boolean;
  } | null;
};

/**
 * Los casos de un curso que el Art. 11 obliga a analizar, con lo que ya se
 * deliberó (si hay algo).
 *
 * Solo salen los alumnos que el Art. 10 deja marcados "requiere análisis": los
 * que promueven por la regla no necesitan esta deliberación.
 */
export async function casosArt11(courseId: string, year?: number): Promise<CasoArt11[]> {
  const reporte = await courseReport(courseId);
  const marcados = reporte.alumnos.filter((a) => a.situacion.estado === "REQUIERE_ANALISIS");
  if (marcados.length === 0) return [];

  const curso = await db.course.findUnique({
    where: { id: courseId },
    select: { year: true, schoolId: true },
  });
  const anio = year ?? curso?.year ?? new Date().getFullYear();

  const resoluciones = await db.promotionResolution.findMany({
    where: {
      studentId: { in: marcados.map((a) => a.studentId) },
      year: anio,
    },
  });
  const porAlumno = new Map(resoluciones.map((r) => [r.studentId, r]));

  return marcados.map((alumno: ParteAlumno) => {    const r = porAlumno.get(alumno.studentId);
    return {
      studentId: alumno.studentId,
      nombre: alumno.nombre,
      rut: alumno.rut,
      promedio: alumno.promedio,
      asistencia: alumno.asistencia,
      cumpleAsistencia: alumno.cumpleAsistencia,
      fundamento: alumno.situacion.fundamento,
      reprobadas: alumno.situacion.reprobadas,
      excepcionAplica: !alumno.cumpleAsistencia && alumno.asistencia !== null,
      resolucion: r
        ? {
            id: r.id,
            utpReport: r.utpReport,
            utpReportedAt: r.utpReportedAt ? r.utpReportedAt.toISOString() : null,
            hearingHeldAt: r.hearingHeldAt ? r.hearingHeldAt.toISOString() : null,
            hearingNotes: r.hearingNotes,
            outcome: r.outcome as "PENDING" | "PROMOTED" | "NOT_PROMOTED",
            decision: r.decision,
            decidedAt: r.decidedAt ? r.decidedAt.toISOString() : null,
            attendanceException: r.attendanceException,
            attendanceExceptionReason: r.attendanceExceptionReason,
            resolved: r.outcome !== "PENDING",
          }
        : null,
    };
  });
}
