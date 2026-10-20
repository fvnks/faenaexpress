import Link from "next/link";

import { db } from "@/lib/db";
import { requireSchoolContext } from "@/lib/school-auth";
import { cardClass } from "@/lib/ui";

// Listado de alumnos del colegio, con su asistencia en el curso actual.
export default async function EstudiantesPage() {
  const ctx = await requireSchoolContext("estudiantes");
  const schoolId = ctx.school.id;

  const alumnos = await db.student.findMany({
    where: { schoolId },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    include: {
      enrollments: {
        where: { status: "ACTIVE" },
        include: { course: { select: { id: true, name: true } } },
      },
    },
    take: 100,
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Alumnos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {alumnos.length} matriculados en {ctx.school.name}.
        </p>
      </div>

      <section className={cardClass + " overflow-hidden"}>
        {alumnos.length === 0 ? (
          <p className="px-5 py-6 text-sm text-muted-foreground">
            Todavía no hay alumnos en este colegio.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Alumno</th>
                <th className="px-4 py-2 font-medium">RUT</th>
                <th className="px-4 py-2 font-medium">Cursos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {alumnos.map((alumno) => (
                <tr key={alumno.id}>
                  <td className="px-4 py-2.5">
                    <Link
                      href={`/colegios/estudiantes/${alumno.id}`}
                      className="font-medium hover:text-primary hover:underline"
                    >
                      {alumno.firstName} {alumno.lastName}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {alumno.rut ?? "—"}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {alumno.enrollments.map((e) => e.course.name).join(" · ") || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
