import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { requireSchoolContext } from "@/lib/school-auth";
import { puedeCalificarEnAsignatura } from "@/lib/school-team";
import { GradeSheetMobile } from "@/app/colegios/calificaciones/movil/grade-sheet-mobile";

/**
 * Hoja de notas móvil: vista simplificada para calificar desde el celular.
 *
 * Una fila por alumno con input numérico (1.0 a 7.0), "pegar desde Excel" y
 * un solo botón de guardar. El corte de alcance está en el servidor (reusa
 * `saveGrades`): un docente no puede calificar una asignatura que no sea suya
 * aunque escriba la URL a mano.
 */
export default async function CalificacionesMovilPage({
  searchParams,
}: PageProps<"/colegios/calificaciones/movil">) {
  const ctx = await requireSchoolContext("calificaciones");
  const params = await searchParams;
  const evaluationId = typeof params.evaluacionId === "string" ? params.evaluacionId : null;

  if (!evaluationId) redirect("/colegios/calificaciones");

  const evaluacion = await db.evaluation.findFirst({
    where: { id: evaluationId, schoolId: ctx.school.id },
    select: {
      id: true,
      name: true,
      courseId: true,
      subjectId: true,
      weight: true,
    },
  });
  if (!evaluacion) redirect("/colegios/calificaciones");

  const esDocente = ctx.role === "TEACHER";
  if (esDocente && !(await puedeCalificarEnAsignatura(ctx, evaluacion.courseId, evaluacion.subjectId))) {
    redirect("/colegios/calificaciones");
  }

  const matriculados = await db.enrollment.findMany({
    where: { courseId: evaluacion.courseId, status: "ACTIVE" },
    include: {
      student: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
    orderBy: { student: { lastName: "asc" } },
  });

  // Notas actuales de esta evaluación (si las hay).
  const notasExistentes = await db.grade.findMany({
    where: { evaluationId },
    select: { studentId: true, value: true, status: true },
  });
  const notasPorAlumno = new Map(notasExistentes.map((n) => [n.studentId, n]));

  const alumnos = matriculados.map((m) => ({
    id: m.student.id,
    nombre: `${m.student.firstName} ${m.student.lastName}`,
    valor: notasPorAlumno.get(m.student.id)?.value ?? null,
    estado: notasPorAlumno.get(m.student.id)?.status ?? "PENDIENTE",
  }));

  return (
    <div>
      {/* Renderizado delegado al client component */}
      <GradeSheetMobile
        evaluationId={evaluacion.id}
        evaluationName={evaluacion.name}
        weight={evaluacion.weight}
        alumnos={alumnos}
      />
    </div>
  );
}
