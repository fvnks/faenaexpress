import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { apoderadoActual } from "@/lib/school-portal";

// GET /apoderado/api/docentes?studentId=xxx
// Devuelve los profesores que dan clases a un alumno del colegio.
export async function GET(req: Request) {
  const sesion = await apoderadoActual();
  if (!sesion) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const studentId = searchParams.get("studentId");
  if (!studentId) {
    return NextResponse.json({ error: "Falta studentId" }, { status: 400 });
  }

  // Verifica que el alumno pertenezca a esta familia
  const vinculo = await db.guardianship.findFirst({
    where: { guardianId: sesion.guardian.id, studentId },
    select: { id: true },
  });
  if (!vinculo) {
    return NextResponse.json({ error: "Alumno no encontrado" }, { status: 404 });
  }

  // Encuentra los cursos activos del alumno
  const matriculas = await db.enrollment.findMany({
    where: { studentId, status: "ACTIVE" },
    select: { courseId: true },
  });

  const courseIds = matriculas.map((m) => m.courseId);
  if (courseIds.length === 0) {
    return NextResponse.json([]);
  }

  // Encuentra las asignaciones de profesores para esos cursos
  const asignaciones = await db.teachingAssignment.findMany({
    where: { courseId: { in: courseIds } },
    include: {
      teacher: { select: { id: true, name: true } },
      subject: { select: { id: true, name: true } },
      course: { select: { id: true, name: true, year: true } },
    },
    distinct: ["teacherId"],
  });

  const profesores = asignaciones.map((a) => ({
    id: a.teacher.id,
    name: a.teacher.name,
    subject: a.subject.name,
    course: `${a.course.name} ${a.course.year}`,
  }));

  return NextResponse.json(profesores);
}