import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { apoderadoActual } from "@/lib/school-portal";
import { docentesDeAlumno } from "@/lib/school-teachers";

/** GET /apoderado/api/docentes?studentId=xxx — profesores que dan clases al alumno. */
export async function GET(req: Request) {
  const sesion = await apoderadoActual();
  if (!sesion) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const studentId = searchParams.get("studentId");
  if (!studentId) return NextResponse.json({ error: "Falta studentId" }, { status: 400 });

  // Verifica que el alumno sea de esta familia
  const apoderado = sesion.guardian;
  const vinculo = await db.guardianship.findFirst({
    where: { guardianId: apoderado.id, studentId },
    select: { id: true },
  });
  if (!vinculo) return NextResponse.json({ error: "Ese alumno no es de tu familia" }, { status: 403 });

  const docentes = await docentesDeAlumno(studentId);
  return NextResponse.json(docentes);
}
