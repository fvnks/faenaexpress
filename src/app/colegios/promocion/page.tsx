import Link from "next/link";

import { PrintButton } from "@/components/print-button";
import { db } from "@/lib/db";
import { requireSchoolContext } from "@/lib/school-auth";
import { courseReport } from "@/lib/school-grades";
import { cardClass } from "@/lib/ui";

/**
 * Acta de Registro de Calificaciones y Promoción Escolar (Art. 20 del Decreto
 * 67/2018).
 *
 * El decreto dice qué debe llevar:
 *   "consignarán en cada curso: la nómina completa de los alumnos,
 *    matriculados y retirados durante el año, señalando el número de la cédula
 *    nacional de identidad o el número del identificador provisorio escolar, las
 *    calificaciones finales de las asignaturas o módulos del plan de estudios y
 *    el promedio final anual, el porcentaje de asistencia de cada alumno y la
 *    situación final correspondiente."
 *
 * El acta que se genera aquí es el documento de trabajo del colegio: la que
 * termina en el SIGE se emite con el sistema del MINEDUC, y solo la firma el
 * director.
 */
export default async function PromocionPage({
  searchParams,
}: PageProps<"/colegios/promocion">) {
  const ctx = await requireSchoolContext("promocion");
  const params = await searchParams;

  const cursos = await db.course.findMany({
    where: { schoolId: ctx.school.id, active: true },
    orderBy: [{ year: "desc" }, { name: "asc" }],
    select: { id: true, name: true, year: true },
  });

  const cursoId =
    typeof params.curso === "string" && cursos.some((c) => c.id === params.curso)
      ? params.curso
      : (cursos[0]?.id ?? null);

  const reporte = cursoId ? await courseReport(cursoId) : null;

  if (!cursoId || !reporte) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Acta de promoción</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            La situación final de promoción de cada curso, con el fundamento de cada caso.
          </p>
        </div>
        <section className={cardClass + " p-5"}>
          <p className="text-sm text-muted-foreground">Todavía no hay cursos en este colegio.</p>
        </section>
      </div>
    );
  }

  const promovidos = reporte.alumnos.filter((a) => a.situacion.estado === "PROMOVIDO").length;
  const enAnalisis = reporte.alumnos.length - promovidos;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Acta de promoción</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Situación final de promoción del curso, con el fundamento de cada caso según el Decreto
          67/2018.
        </p>
      </div>

      <nav aria-label="Cursos" className="flex flex-wrap gap-2">
        {cursos.map((c) => (
          <Link
            key={c.id}
            href={`/colegios/promocion?curso=${c.id}`}
            className={
              "rounded-control border border-border px-3 py-1.5 text-sm hover:bg-background " +
              (c.id === cursoId ? "border-primary text-primary" : "")
            }
          >
            {c.name} · {c.year}
          </Link>
        ))}
      </nav>

      <section className={cardClass + " p-5"}>
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="font-semibold">{reporte.nombreCurso}</h2>
          <div className="flex gap-4 text-sm">
            <span>
              <span className="tabular font-semibold text-success">{promovidos}</span>{" "}
              <span className="text-muted-foreground">promovidos</span>
            </span>
            <span>
              <span className="tabular font-semibold text-accent">{enAnalisis}</span>{" "}
              <span className="text-muted-foreground">requieren análisis</span>
            </span>
          </div>
        </div>

        {reporte.alumnos.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Este curso no tiene alumnos matriculados.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th scope="col" className="px-2 py-2 font-medium text-muted-foreground">
                    Alumno
                  </th>
                  <th scope="col" className="px-2 py-2 font-medium text-muted-foreground">
                    Identificador
                  </th>
                  {reporte.asignaturas.map((a) => (
                    <th
                      key={a.id}
                      scope="col"
                      className="px-2 py-2 text-right font-medium text-muted-foreground"
                    >
                      {a.nombre}
                      {!a.incide ? (
                        <span className="ml-1 text-xs font-normal">(no incide)</span>
                      ) : null}
                    </th>
                  ))}
                  <th scope="col" className="px-2 py-2 text-right font-medium text-muted-foreground">
                    Promedio
                  </th>
                  <th scope="col" className="px-2 py-2 text-right font-medium text-muted-foreground">
                    Asistencia
                  </th>
                  <th scope="col" className="px-2 py-2 font-medium text-muted-foreground">
                    Situación final
                  </th>
                </tr>
              </thead>
              <tbody>
                {reporte.alumnos.map((alumno) => (
                  <tr key={alumno.studentId} className="border-b border-border/60 align-top">
                    <th scope="row" className="px-2 py-2 text-left font-normal">
                      {alumno.nombre}
                    </th>
                    <td className="tabular px-2 py-2 text-muted-foreground">
                      {alumno.rut ?? alumno.identificadorProvisorio ?? "—"}
                    </td>
                    {reporte.asignaturas.map((a) => {
                      const nota = alumno.asignaturas.find((x) => x.subjectId === a.id);
                      return (
                        <td key={a.id} className="tabular px-2 py-2 text-right">
                          {nota?.final === null || nota?.final === undefined ? (
                            <span className="text-muted-foreground">—</span>
                          ) : (
                            <span className={nota.reprobada ? "font-semibold text-danger" : ""}>
                              {nota.final.toFixed(1)}
                            </span>
                          )}
                        </td>
                      );
                    })}
                    <td className="tabular px-2 py-2 text-right font-medium">
                      {alumno.promedio === null ? "—" : alumno.promedio.toFixed(1)}
                    </td>
                    <td className="tabular px-2 py-2 text-right">
                      {alumno.asistencia === null ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <span className={alumno.cumpleAsistencia ? "" : "font-semibold text-accent"}>
                          {alumno.asistencia.toFixed(1)}%
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-2">
                      <span
                        className={
                          alumno.situacion.estado === "PROMOVIDO"
                            ? "font-medium text-success"
                            : "font-medium text-accent"
                        }
                      >
                        {alumno.situacion.estado === "PROMOVIDO"
                          ? "Promovido"
                          : "Requiere análisis"}
                      </span>
                      <span className="mt-0.5 block max-w-md text-xs text-muted-foreground">
                        {alumno.situacion.fundamento}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-4">
          <p className="max-w-2xl text-xs text-muted-foreground">
            El acta que se entrega al MINEDUC se emite con el sistema oficial (SIGE) y solo la firma
            el director del establecimiento (Art. 20). Esta pantalla es el trabajo previo: deja
            constancia de por qué cada alumno quedó como quedó.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            {enAnalisis > 0 ? (
              <Link
                href={`/colegios/promocion/art11?curso=${cursoId}`}
                className="rounded-control border border-primary bg-transparent px-3 py-1.5 text-sm font-semibold text-primary"
              >
                Resolver los casos del Art. 11 ({enAnalisis})
              </Link>
            ) : null}
            <PrintButton label="Imprimir acta" />
          </div>
        </div>
      </section>

      {reporte.alumnos.some((a) => a.situacion.estado === "REQUIERE_ANALISIS") ? (
        <section className={cardClass + " p-5"}>
          <h2 className="font-semibold">Casos que requieren análisis</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            No cumplen la regla del Art. 10. El Art. 11 obliga al establecimiento a analizarlos de
            forma deliberativa, con informe del jefe técnico-pedagógico y la visión del estudiante y
            su apoderado: esa decisión no es del sistema.
          </p>
          <ul className="mt-4 divide-y divide-border">
            {reporte.alumnos
              .filter((a) => a.situacion.estado === "REQUIERE_ANALISIS")
              .map((alumno) => (
                <li key={alumno.studentId} className="py-3">
                  <p className="text-sm font-medium">{alumno.nombre}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {alumno.situacion.fundamento}
                  </p>
                  {alumno.situacion.reprobadas.length > 0 ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Asignaturas reprobadas: {alumno.situacion.reprobadas.join(", ")}
                    </p>
                  ) : null}
                </li>
              ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
