import { requireSchoolContext } from "@/lib/school-auth";
import { db } from "@/lib/db";
import { attendanceSummary } from "@/lib/school-attendance";
import { courseReport } from "@/lib/school-grades";

/**
 * Portabilidad de los datos de un alumno (art. 12 de la Ley 21.719).
 *
 * El titular (o su apoderado) tiene derecho a obtener sus datos en un
 * formato portable. Acá se junta todo lo que el colegio tiene del alumno en
 * un JSON, para entregarlo o para que lo baje la familia.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireSchoolContext("estudiantes");
  const { id } = await params;

  const student = await db.student.findFirst({
    where: { id, schoolId: ctx.school.id },
    include: {
      enrollments: {
        include: { course: { select: { name: true, year: true } } },
        orderBy: { enrolledAt: "asc" },
      },
      guardianships: {
        include: { guardian: { select: { name: true, rut: true, email: true, phone: true } } },
      },
      documents: {
        select: { title: true, type: true, description: true, fileName: true, createdAt: true },
      },
      consents: {
        select: {
          purpose: true,
          status: true,
          grantedAt: true,
          grantedBy: true,
          method: true,
          revokedAt: true,
          revokedReason: true,
        },
        orderBy: { purpose: "asc" },
      },
      absences: {
        select: { type: true, reason: true, startDate: true, endDate: true },
        orderBy: { startDate: "desc" },
      },
      attendances: {
        select: {
          status: true,
          minutesLate: true,
          justificationType: true,
          justificationNote: true,
          recordedAt: true,
          session: { select: { date: true, subject: { select: { name: true } } } },
        },
        orderBy: { recordedAt: "desc" },
      },
    },
  });
  if (!student) {
    return new Response("No encontrado", { status: 404 });
  }

  // Las notas y el promedio, con el mismo cálculo que el acta.
  const notas = [];
  for (const e of student.enrollments) {
    if (e.status !== "ACTIVE") continue;
    const reporte = await courseReport(e.courseId);
    const alumno = reporte.alumnos.find((a) => a.studentId === student.id);
    if (!alumno) continue;
    notas.push({
      curso: `${e.course.name} · ${e.course.year}`,
      asignaturas: alumno.asignaturas.map((a) => ({
        asignatura: a.nombre,
        incideEnPromedio: a.incide,
        periodos: a.periodos.map((p) => ({ periodo: p.nombre, nota: p.nota })),
        notaFinal: a.final,
        reprobada: a.reprobada,
      })),
      promedio: alumno.promedio,
      asistencia: alumno.asistencia,
      cumple85: alumno.cumpleAsistencia,
      situacion: alumno.situacion,
    });
  }

  const asistenciaPorCurso = [];
  for (const e of student.enrollments) {
    const resumen = await attendanceSummary(student.id, e.courseId);
    asistenciaPorCurso.push({
      curso: `${e.course.name} · ${e.course.year}`,
      clases: resumen.total,
      asiste: resumen.asiste,
      inasistencias: resumen.falta,
      eximidas: resumen.eximidas,
      porcentaje: resumen.porcentaje,
      cumple85: resumen.cumple,
    });
  }

  const datos = {
    generado: new Date().toISOString(),
    colegio: {
      nombre: ctx.school.name,
      rut: ctx.school.rut,
      commune: ctx.school.commune,
    },
    alumno: {
      nombre: `${student.firstName} ${student.lastName}`,
      rut: student.rut,
      fechaNacimiento: student.birthDate,
      genero: student.gender,
      direccion: student.address,
      comuna: student.commune,
      correo: student.email,
      telefono: student.phone,
      estado: student.status,
    },
    matriculas: student.enrollments.map((e) => ({
      curso: `${e.course.name} · ${e.course.year}`,
      estado: e.status,
      motivo: e.statusReason,
      matriculado: e.enrolledAt,
      terminado: e.endedAt,
    })),
    apoderados: student.guardianships.map((g) => ({
      nombre: g.guardian.name,
      rut: g.guardian.rut,
      correo: g.guardian.email,
      telefono: g.guardian.phone,
      tipo: g.type,
    })),
    asistencia: asistenciaPorCurso,
    notas,
    permisos: student.absences.map((a) => ({
      tipo: a.type,
      motivo: a.reason,
      desde: a.startDate,
      hasta: a.endDate,
    })),
    registrosAsistencia: student.attendances.map((a) => ({
      fecha: a.session.date,
      asignatura: a.session.subject.name,
      estado: a.status,
      minutosAtraso: a.minutesLate,
      justificativo: a.justificationType,
      observacion: a.justificationNote,
      registrado: a.recordedAt,
    })),
    consentimientos: student.consents,
    documentos: student.documents,
  };

  const nombre = `datos-${student.firstName}-${student.lastName}`
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-");

  return new Response(JSON.stringify(datos, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nombre}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
