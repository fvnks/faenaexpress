import { redirect } from "next/navigation";

import { requireSchoolContext } from "@/lib/school-auth";
import { puedeRegistrarEnClase } from "@/lib/school-team";
import { classSheet, enrolledStudents } from "@/lib/school-attendance";
import { AttendanceMobile } from "@/app/colegios/asistencia/attendance-mobile";

/**
 * Asistencia móvil: vista simplificada para marcar asistencia desde el celular.
 *
 * Botones grandes por alumno, "marcar todos presentes/ausentes" y un solo
 * botón de guardar. El corte de alcance está en el servidor (reusa
 * `saveAttendance`): un docente no puede marcar la clase de otro aunque
 * escriba la URL a mano.
 */
export default async function AsistenciaMovilPage({
  searchParams,
}: PageProps<"/colegios/asistencia/movil">) {
  const ctx = await requireSchoolContext("asistencia");
  const params = await searchParams;
  const sessionId = typeof params.sessionId === "string" ? params.sessionId : null;

  if (!sessionId) redirect("/colegios/asistencia");

  const sesion = await classSheet(sessionId);
  if (!sesion || sesion.schoolId !== ctx.school.id) redirect("/colegios/asistencia");

  const esDocente = ctx.role === "TEACHER";
  if (esDocente && !(await puedeRegistrarEnClase(ctx, sesion.courseId, sesion.subjectId))) {
    redirect("/colegios/asistencia");
  }

  const matriculados = await enrolledStudents(sesion.courseId);

  // Estado inicial: si ya hay un registro de asistencia para ese alumno en
  // esta clase, se muestra preseleccionado.
  const asistenciaPorAlumno = new Map(
    (sesion.attendances ?? []).map((a) => [a.studentId, a.status]),
  );

  const alumnos = matriculados.map((m) => ({
    id: m.student.id,
    nombre: `${m.student.firstName} ${m.student.lastName}`,
    estadoInicial: asistenciaPorAlumno.get(m.student.id) ?? "PRESENT",
  }));

  return (
    <AttendanceMobile
      sessionId={sesion.id}
      courseName={sesion.course.name}
      subjectName={sesion.subject.name}
      date={sesion.date}
      alumnos={alumnos}
    />
  );
}
