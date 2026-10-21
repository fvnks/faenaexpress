import Link from "next/link";

import {
  EnrollExistingForm,
  EnrollForm,
} from "@/app/colegios/estudiantes/enrollment-forms";
import { db } from "@/lib/db";
import { requireSchoolContext, schoolCanWrite } from "@/lib/school-auth";
import { cardClass } from "@/lib/ui";

const ETIQUETA_ESTADO: Record<string, string> = {
  ACTIVE: "Cursando",
  TRANSFERRED: "Trasladado",
  WITHDRAWN: "Retirado",
  GRADUATED: "Egresado",
};

const ETIQUETA_MATRICULA: Record<string, string> = {
  ACTIVE: "Cursando",
  TRASLADO: "Trasladado",
  RETIRADO: "Retirado",
};

// Listado de alumnos del colegio, con su matrícula y su estado.
export default async function EstudiantesPage() {
  const ctx = await requireSchoolContext("estudiantes");
  const schoolId = ctx.school.id;
  const puedeEditar = schoolCanWrite(ctx, "estudiantes");

  const [alumnos, cursos] = await Promise.all([
    db.student.findMany({
      where: { schoolId },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      include: {
        enrollments: {
          orderBy: [{ status: "asc" }, { enrolledAt: "desc" }],
          include: { course: { select: { id: true, name: true, year: true } } },
        },
      },
    }),
    db.course.findMany({
      where: { schoolId, active: true },
      orderBy: [{ year: "desc" }, { name: "asc" }],
      select: { id: true, name: true, year: true },
    }),
  ]);

  const cursando = alumnos.filter((a) => a.status === "ACTIVE").length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Alumnos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {cursando} cursando de {alumnos.length} en {ctx.school.name}.
        </p>
      </div>

      {puedeEditar ? (
        <section className={cardClass + " p-5"}>
          <div className="flex flex-wrap items-start gap-6">
            <EnrollForm
              cursos={cursos.map((c) => ({ id: c.id, nombre: `${c.name} · ${c.year}` }))}
            />
            <EnrollExistingForm
              alumnos={alumnos
                .filter((a) => a.status === "ACTIVE")
                .map((a) => ({
                  id: a.id,
                  nombre: `${a.firstName} ${a.lastName}`,
                }))}
              cursos={cursos.map((c) => ({ id: c.id, nombre: `${c.name} · ${c.year}` }))}
            />
          </div>
        </section>
      ) : null}

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
                <th className="px-4 py-2 font-medium">Curso</th>
                <th className="px-4 py-2 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {alumnos.map((alumno) => {
                const activa = alumno.enrollments.find((e) => e.status === "ACTIVE");
                const historial = alumno.enrollments.filter((e) => e.status !== "ACTIVE");
                return (
                  <tr key={alumno.id}>
                    <td className="px-4 py-2.5">
                      <Link
                        href={`/colegios/estudiantes/${alumno.id}`}
                        className="font-medium hover:text-primary hover:underline"
                      >
                        {alumno.firstName} {alumno.lastName}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">{alumno.rut ?? "—"}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {activa ? `${activa.course.name} · ${activa.course.year}` : "—"}
                      {historial.length > 0 ? (
                        <span className="block text-xs">
                          antes:{" "}
                          {historial
                            .map(
                              (e) =>
                                `${e.course.name} (${ETIQUETA_MATRICULA[e.status] ?? e.status})`,
                            )
                            .join(", ")}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {ETIQUETA_ESTADO[alumno.status] ?? alumno.status}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
