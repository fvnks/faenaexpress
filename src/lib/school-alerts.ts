// Detección y gestión de alertas de inasistencia (C4).
//
// La Ley 21.809 y el reglamento obligan al colegio a hacer seguimiento de
// los alumnos que acumulan inasistencias sin justificar. Este módulo detecta
// esos casos y crea alertas para que la secretaría/dirección actúe.

import { db } from "@/lib/db";
import { attendanceByStudents } from "@/lib/school-attendance";

export type AlertaInasistencia = {
  studentId: string;
  studentName: string;
  courseId: string;
  courseName: string;
  inasistenciasSinJustificar: number;
  porcentajeAsistencia: number;
  ultimaFalta: Date | null;
};

const UMBRAL_POR_DEFECTO = 5; // 5 inasistencias sin justificar dispara la alerta

/**
 * Detecta alumnos que superan el umbral de inasistencias sin justificar.
 * Retorna la lista de alertas que deberían crearse.
 */
export async function detectarAlertasInasistencia(
  schoolId: string,
  umbral: number = UMBRAL_POR_DEFECTO,
): Promise<AlertaInasistencia[]> {
  // Obtiene todos los alumnos activos con sus matrículas
  const matriculas = await db.enrollment.findMany({
    where: { course: { schoolId }, status: "ACTIVE" },
    include: {
      student: { select: { id: true, firstName: true, lastName: true } },
      course: { select: { id: true, name: true, year: true } },
    },
  });

  if (matriculas.length === 0) return [];

  const studentIds = matriculas.map((m) => m.student.id);
  const courseIds = matriculas.map((m) => m.course.id);

  // Calcula asistencia de todos los alumnos de golpe
  const resumenes = await attendanceByStudents(schoolId, studentIds);

  const alertas: AlertaInasistencia[] = [];

  for (const m of matriculas) {
    const resumen = resumenes.get(m.student.id);
    if (!resumen) continue;

    // `falta` = inasistencias sin justificar (ABSENT)
    if (resumen.falta >= umbral) {
      // Busca la última falta para contexto
      const ultimaFalta = await db.attendanceRecord.findFirst({
        where: {
          studentId: m.student.id,
          session: { courseId: m.course.id },
          status: "ABSENT",
        },
        orderBy: { recordedAt: "desc" },
        select: { recordedAt: true, session: { select: { date: true } } },
      });

      alertas.push({
        studentId: m.student.id,
        studentName: `${m.student.firstName} ${m.student.lastName}`,
        courseId: m.course.id,
        courseName: `${m.course.name} · ${m.course.year}`,
        inasistenciasSinJustificar: resumen.falta,
        porcentajeAsistencia: Number(resumen.porcentaje.toFixed(1)),
        ultimaFalta: ultimaFalta?.session?.date ?? null,
      });
    }
  }

  return alertas;
}

/**
 * Formato legible del umbral para la UI.
 */
export function descripcionUmbral(umbral: number): string {
  return `Alumnos con ${umbral} o más inasistencias sin justificar`;
}