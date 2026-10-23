// Obtiene los profesores que dan clases en los cursos de un alumno.
import { db } from "@/lib/db";

export type DocenteCurso = {
  id: string;
  nombre: string;
  asignatura: string;
  curso: string;
};

/** Profesores de un alumno (a través de sus matrículas activas). */
export async function docentesDeAlumno(studentId: string): Promise<DocenteCurso[]> {
  const matriculas = await db.enrollment.findMany({
    where: { studentId, status: "ACTIVE" },
    include: {
      course: {
        select: { id: true, name: true, year: true },
        include: {
          assignments: {
            include: { teacher: { select: { id: true, name: true } }, subject: { select: { id: true, name: true } } },
          },
        },
      },
    },
  });

  const vistos = new Set<string>();
  const resultado: DocenteCurso[] = [];

  for (const m of matriculas) {
    for (const a of m.course.assignments) {
      const clave = `${a.teacher.id}|${a.subject.id}`;
      if (vistos.has(clave)) continue;
      vistos.add(clave);
      resultado.push({
        id: a.teacher.id,
        nombre: a.teacher.name,
        asignatura: a.subject.name,
        curso: `${m.course.name} · ${m.course.year}`,
      });
    }
  }

  return resultado;
}

/** Profesores que imparten clases en un curso. */
export async function docentesDeCurso(courseId: string): Promise<DocenteCurso[]> {
  const curso = await db.course.findUnique({
    where: { id: courseId },
    select: { name: true, year: true, assignments: { include: { teacher: { select: { id: true, name: true } }, subject: { select: { id: true, name: true } } } } },
  });
  if (!curso) return [];

  return curso.assignments.map((a) => ({
    id: a.teacher.id,
    nombre: a.teacher.name,
    asignatura: a.subject.name,
    curso: `${curso.name} · ${curso.year}`,
  }));
}
