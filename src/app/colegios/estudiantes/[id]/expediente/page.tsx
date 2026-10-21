import Link from "next/link";
import { notFound } from "next/navigation";

import { PrintButton } from "@/components/print-button";
import { db } from "@/lib/db";
import { requireSchoolContext } from "@/lib/school-auth";
import { attendanceSummary } from "@/lib/school-attendance";
import { courseReport } from "@/lib/school-grades";

const ETIQUETA_MATRICULA: Record<string, string> = {
  ACTIVE: "Cursando",
  TRASLADO: "Trasladado",
  RETIRADO: "Retirado",
};

const ETIQUETA_ALUMNO: Record<string, string> = {
  ACTIVE: "Cursando",
  TRANSFERRED: "Trasladado",
  WITHDRAWN: "Retirado",
  GRADUATED: "Egresado",
};

/**
 * Expediente del alumno, listo para imprimir.
 *
 * Es el documento que la secretaría entrega cuando lo piden: un solo lugar
 * con la matrícula, los apoderados, la asistencia, las notas y la situación de
 * promoción. Se imprime desde el navegador (PDF).
 */
export default async function ExpedientePage({
  params,
}: PageProps<"/colegios/estudiantes/[id]/expediente">) {
  const ctx = await requireSchoolContext("estudiantes");
  const { id } = await params;

  const student = await db.student.findFirst({
    where: { id, schoolId: ctx.school.id },
    include: {
      enrollments: {
        include: { course: { select: { id: true, name: true, year: true } } },
        orderBy: { enrolledAt: "desc" },
      },
      guardianships: {
        include: { guardian: { select: { name: true, rut: true, phone: true, email: true } } },
      },
    },
  });
  if (!student) notFound();

  const resumenes = await Promise.all(
    student.enrollments.map(async (e) => ({
      curso: e.course,
      resumen: await attendanceSummary(student.id, e.course.id),
    })),
  );

  const reportes = await Promise.all(
    student.enrollments
      .filter((e) => e.status === "ACTIVE")
      .map(async (e) => ({ curso: e.course, reporte: await courseReport(e.course.id) })),
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href={`/colegios/estudiantes/${student.id}`}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Ficha del alumno
          </Link>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">Expediente</h1>
        </div>
        <PrintButton label="Imprimir expediente" />
      </div>

      <article className="flex flex-col gap-6">
        <header>
          <p className="text-sm font-semibold">{ctx.school.name}</p>
          <h2 className="text-xl font-bold tracking-tight">
            {student.firstName} {student.lastName}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {student.rut ?? "sin RUT"}
            {student.birthDate ? ` · nacido el ${student.birthDate.toLocaleDateString("es-CL")}` : ""}
            {` · ${ETIQUETA_ALUMNO[student.status] ?? student.status}`}
          </p>
        </header>

        <section>
          <h3 className="font-semibold">Matrícula</h3>
          <ul className="mt-2 divide-y divide-border text-sm">
            {student.enrollments.map((m) => (
              <li key={m.id} className="flex items-baseline justify-between gap-3 py-1.5">
                <span>
                  {m.course.name} · {m.course.year}
                </span>
                <span className="text-xs text-muted-foreground">
                  {ETIQUETA_MATRICULA[m.status] ?? m.status}
                  {m.endedAt ? ` · hasta ${m.endedAt.toLocaleDateString("es-CL")}` : ""}
                  {m.statusReason ? ` · ${m.statusReason}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h3 className="font-semibold">Apoderados</h3>
          {student.guardianships.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">Sin apoderados registrados.</p>
          ) : (
            <ul className="mt-2 divide-y divide-border text-sm">
              {student.guardianships.map((g) => (
                <li key={g.id} className="flex items-baseline justify-between gap-3 py-1.5">
                  <span>
                    {g.guardian.name}
                    {g.guardian.rut ? ` · ${g.guardian.rut}` : ""}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {g.type === "TITULAR"
                      ? "Titular"
                      : g.type === "SUPLENTE"
                        ? "Suplente"
                        : g.type === "EMERGENCIA"
                          ? "Emergencia"
                          : g.type}
                    {g.guardian.phone ? ` · ${g.guardian.phone}` : ""}
                    {g.guardian.email ? ` · ${g.guardian.email}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h3 className="font-semibold">Asistencia</h3>
          <ul className="mt-2 divide-y divide-border text-sm">
            {resumenes.map(({ curso, resumen }) => (
              <li key={curso.id} className="flex items-baseline justify-between gap-3 py-1.5">
                <span>
                  {curso.name} · {curso.year}
                </span>
                <span className="tabular text-xs text-muted-foreground">
                  {resumen.sinClases
                    ? "sin clases registradas"
                    : `${resumen.asiste}/${resumen.total} · ${resumen.porcentaje.toFixed(1)}%`}
                </span>
              </li>
            ))}
          </ul>
        </section>

        {reportes.map(({ curso, reporte }) => {
          const alumno = reporte.alumnos.find((a) => a.studentId === student.id);
          if (!alumno) return null;
          return (
            <section key={curso.id}>
              <h3 className="font-semibold">Notas · {curso.name}</h3>
              <table className="mt-2 w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th scope="col" className="px-2 py-1.5 font-medium text-muted-foreground">
                      Asignatura
                    </th>
                    {reporte.periodos.map((p) => (
                      <th
                        key={p.id}
                        scope="col"
                        className="px-2 py-1.5 text-right font-medium text-muted-foreground"
                      >
                        {p.nombre}
                      </th>
                    ))}
                    <th scope="col" className="px-2 py-1.5 text-right font-medium text-muted-foreground">
                      Final
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {alumno.asignaturas.map((a) => (
                    <tr key={a.subjectId} className="border-b border-border/60">
                      <th scope="row" className="px-2 py-1.5 text-left font-normal">
                        {a.nombre}
                      </th>
                      {a.periodos.map((p) => (
                        <td key={p.periodoId} className="tabular px-2 py-1.5 text-right">
                          {p.nota === null ? "—" : p.nota.toFixed(1)}
                        </td>
                      ))}
                      <td className="tabular px-2 py-1.5 text-right font-medium">
                        {a.final === null ? "—" : a.final.toFixed(1)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-2 text-xs text-muted-foreground">
                Promedio final: {alumno.promedio?.toFixed(1) ?? "—"} · {alumno.situacion.fundamento}
              </p>
            </section>
          );
        })}

        <footer className="border-t border-border pt-4 text-xs text-muted-foreground">
          Expediente generado el {new Date().toLocaleDateString("es-CL")}. Las calificaciones siguen
          el Decreto 67/2018 del MINEDUC.
        </footer>
      </article>
    </div>
  );
}
