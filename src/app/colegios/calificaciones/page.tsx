import Link from "next/link";

import { EvaluationForm } from "@/app/colegios/calificaciones/evaluation-form";
import { GradeSheet } from "@/app/colegios/calificaciones/grade-sheet";
import { PeriodForm } from "@/app/colegios/calificaciones/period-form";
import { db } from "@/lib/db";
import { requireSchoolContext, schoolCanWrite } from "@/lib/school-auth";
import { courseReport, courseSubjects, listPeriods } from "@/lib/school-grades";
import { cardClass } from "@/lib/ui";

const TIPOS_EVALUACION = [
  { value: "PRUEBA", label: "Prueba" },
  { value: "TRABAJO", label: "Trabajo" },
  { value: "EXPOSICION", label: "Exposición" },
  { value: "EXAMEN", label: "Examen" },
  { value: "DIAGNOSTICA", label: "Diagnóstica" },
  { value: "OTRO", label: "Otro" },
] as const;

// Calificaciones: evaluaciones, notas y promedio. Es la pantalla del docente.
export default async function CalificacionesPage({
  searchParams,
}: PageProps<"/colegios/calificaciones">) {
  const ctx = await requireSchoolContext("calificaciones");
  const params = await searchParams;
  const puedeEditar = schoolCanWrite(ctx, "calificaciones");

  const cursos = await db.course.findMany({
    where: { schoolId: ctx.school.id, active: true },
    orderBy: [{ year: "desc" }, { name: "asc" }],
    select: { id: true, name: true, year: true },
  });

  const cursoId =
    typeof params.curso === "string" && cursos.some((c) => c.id === params.curso)
      ? params.curso
      : (cursos[0]?.id ?? null);

  const periodos = await listPeriods(ctx.school.id);
  const periodoId =
    typeof params.periodo === "string" && periodos.some((p) => p.id === params.periodo)
      ? params.periodo
      : (periodos[0]?.id ?? null);

  const asignaturas = cursoId ? await courseSubjects(cursoId) : [];
  const asignaturaId =
    typeof params.asignatura === "string" && asignaturas.some((a) => a.subject.id === params.asignatura)
      ? params.asignatura
      : (asignaturas[0]?.subject.id ?? null);

  const evaluaciones = cursoId
    ? await db.evaluation.findMany({
        where: {
          schoolId: ctx.school.id,
          courseId: cursoId,
          ...(periodoId ? { periodId: periodoId } : {}),
          ...(asignaturaId ? { subjectId: asignaturaId } : {}),
        },
        orderBy: [{ date: "asc" }, { name: "asc" }],
        include: {
          period: { select: { id: true, name: true } },
          grades: { select: { id: true } },
        },
      })
    : [];

  const evaluacionId =
    typeof params.evaluacion === "string" && evaluaciones.some((e) => e.id === params.evaluacion)
      ? params.evaluacion
      : null;

  const periodoActual = periodos.find((p) => p.id === periodoId) ?? null;
  const asignaturaActual = asignaturas.find((a) => a.subject.id === asignaturaId)?.subject ?? null;

  // Los alumnos del curso con su nota en la evaluación elegida, y el contexto
  // para calcular el promedio en vivo (las otras evaluaciones ya guardadas).
  let alumnos: { id: string; nombre: string; nota: string; estado: string }[] = [];
  let contexto: { id: string; nombre: string; weight: number; notas: Record<string, number> }[] = [];
  const matriculados = cursoId
    ? await db.enrollment.findMany({
        where: { courseId: cursoId, status: "ACTIVE" },
        include: { student: { select: { id: true, firstName: true, lastName: true } } },
        orderBy: { student: { lastName: "asc" } },
      })
    : [];

  if (evaluacionId && cursoId) {
    const todas = await db.evaluation.findMany({
      where: {
        schoolId: ctx.school.id,
        courseId: cursoId,
        ...(asignaturaId ? { subjectId: asignaturaId } : {}),
        ...(periodoId ? { periodId: periodoId } : {}),
      },
      select: {
        id: true,
        name: true,
        weight: true,
        grades: { select: { studentId: true, value: true, status: true } },
      },
    });

    const notaDe = new Map<string, { valor: number | null; estado: string }>();
    for (const ev of todas) {
      for (const g of ev.grades) notaDe.set(`${g.studentId}|${ev.id}`, { valor: g.value, estado: g.status });
    }

    alumnos = matriculados.map((m) => {
      const g = notaDe.get(`${m.student.id}|${evaluacionId}`);
      return {
        id: m.student.id,
        nombre: `${m.student.firstName} ${m.student.lastName}`,
        nota: g?.valor != null ? String(g.valor) : "",
        estado: g?.estado ?? "PENDIENTE",
      };
    });

    contexto = todas
      .filter((ev) => ev.id !== evaluacionId)
      .map((ev) => {
        const notas: Record<string, number> = {};
        for (const g of ev.grades) {
          if (g.status === "GRADED" && g.value !== null) notas[g.studentId] = g.value;
        }
        return { id: ev.id, nombre: ev.name, weight: ev.weight, notas };
      });
  }

  // El resumen del curso: promedios y situación de promoción de cada alumno.
  const reporte = cursoId ? await courseReport(cursoId) : null;

  const enlace = (params: Record<string, string | null>) => {
    const query = new URLSearchParams();
    for (const [clave, valor] of Object.entries({
      curso: cursoId,
      periodo: periodoId,
      asignatura: asignaturaId,
      evaluacion: null,
      ...params,
    })) {
      if (valor) query.set(clave, valor);
    }
    return `/colegios/calificaciones?${query.toString()}`;
  };

  if (!cursoId) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Calificaciones</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Las notas de los alumnos y el promedio de cada asignatura.
          </p>
        </div>
        <section className={cardClass + " p-5"}>
          <p className="text-sm text-muted-foreground">
            Todavía no hay cursos en este colegio. Las calificaciones se registran por curso.
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Calificaciones</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Evaluaciones, notas y promedio por asignatura. Escala de 1.0 a 7.0; la nota mínima de
          aprobación es 4.0.
        </p>
      </div>

      <nav aria-label="Cursos" className="flex flex-wrap gap-2">
        {cursos.map((c) => (
          <Link
            key={c.id}
            href={enlace({ curso: c.id, evaluacion: null })}
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
          <h2 className="font-semibold">Períodos de evaluación</h2>
          {puedeEditar ? <PeriodForm puedeEditar={puedeEditar} /> : null}
        </div>

        {periodos.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Este colegio todavía no tiene períodos de evaluación. El primero es el que ordena las
            notas del año.
          </p>
        ) : (
          <ul className="mt-3 flex flex-wrap gap-2">
            {periodos.map((p) => (
              <li key={p.id}>
                <Link
                  href={enlace({ periodo: p.id, evaluacion: null })}
                  className={
                    "rounded-control border border-border px-3 py-1.5 text-sm hover:bg-background " +
                    (p.id === periodoId ? "border-primary text-primary" : "")
                  }
                >
                  {p.name}
                  <span className="ml-1.5 text-xs text-muted-foreground">
                    {p.weight > 0 ? `${p.weight}%` : p.type === "TRIMESTRE" ? "trimestre" : "semestre"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={cardClass + " p-5"}>
        <h2 className="font-semibold">Asignaturas</h2>
        {asignaturas.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Este curso no tiene asignaturas asignadas. Un docente tiene que tener una asignación
            para poder calificar.
          </p>
        ) : (
          <ul className="mt-3 flex flex-wrap gap-2">
            {asignaturas.map((ta) => (
              <li key={ta.subject.id}>
                <Link
                  href={enlace({ asignatura: ta.subject.id, evaluacion: null })}
                  className={
                    "rounded-control border border-border px-3 py-1.5 text-sm hover:bg-background " +
                    (ta.subject.id === asignaturaId ? "border-primary text-primary" : "")
                  }
                >
                  {ta.subject.name}
                  {!ta.subject.countsForPromotion ? (
                    <span className="ml-1.5 text-xs text-muted-foreground">no incide</span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {asignaturaId && periodoId ? (
        <section className={cardClass + " p-5"}>
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <div>
              <h2 className="font-semibold">
                {asignaturaActual?.name ?? "Asignatura"}
                {periodoActual ? ` · ${periodoActual.name}` : ""}
              </h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {evaluaciones.length === 0
                  ? "Todavía no hay evaluaciones en este período."
                  : `${evaluaciones.length} ${evaluaciones.length === 1 ? "evaluación" : "evaluaciones"}.`}
              </p>
            </div>
            {puedeEditar ? (
              <EvaluationForm
                cursoId={cursoId}
                asignaturaId={asignaturaId}
                periodoId={periodoId}
                tipos={TIPOS_EVALUACION}
              />
            ) : null}
          </div>

          {evaluaciones.length === 0 ? null : (
            <ul className="mt-4 divide-y divide-border">
              {evaluaciones.map((ev) => (
                <li key={ev.id} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="min-w-0 flex-1 text-sm">
                    <span className="font-medium">{ev.name}</span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {ev.date.toLocaleDateString("es-CL")}
                      {ev.weight > 0 ? ` · peso ${ev.weight}%` : ""}
                      {ev.isFinal ? " · final" : ""}
                    </span>
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">
                      {ev.grades.length} de {matriculados.length} con nota
                    </span>
                    <Link
                      href={enlace({ evaluacion: ev.id })}
                      className={
                        "rounded-control border border-border px-3 py-1.5 text-sm hover:bg-background " +
                        (ev.id === evaluacionId ? "border-primary text-primary" : "")
                      }
                    >
                      {ev.id === evaluacionId ? "Abierta" : "Abrir"}
                    </Link>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {evaluacionId ? (
        <section className={cardClass + " p-5"}>
          <h2 className="font-semibold">Notas de la evaluación</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            El promedio se calcula mientras escribes, con la misma matemática que usa el acta de
            promoción.
          </p>
          <div className="mt-4">
            <GradeSheet
              evaluationId={evaluacionId}
              alumnos={alumnos}
              contexto={contexto}
              weight={evaluaciones.find((e) => e.id === evaluacionId)?.weight ?? 0}
              puedeEditar={puedeEditar}
            />
          </div>
        </section>
      ) : null}

      {reporte && reporte.alumnos.length > 0 ? (
        <section className={cardClass + " p-5"}>
          <h2 className="font-semibold">Promedio del curso</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Promedio final anual de cada alumno, con las asignaturas reprobadas y su asistencia. La
            situación de promoción va en el acta.
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th scope="col" className="px-2 py-2 font-medium text-muted-foreground">
                    Alumno
                  </th>
                  {reporte.asignaturas.map((a) => (
                    <th
                      key={a.id}
                      scope="col"
                      className="px-2 py-2 text-right font-medium text-muted-foreground"
                    >
                      {a.nombre}
                    </th>
                  ))}
                  <th
                    scope="col"
                    className="px-2 py-2 text-right font-medium text-muted-foreground"
                  >
                    Promedio
                  </th>
                  <th scope="col" className="px-2 py-2 text-right font-medium text-muted-foreground">
                    Asistencia
                  </th>
                </tr>
              </thead>
              <tbody>
                {reporte.alumnos.map((alumno) => (
                  <tr key={alumno.studentId} className="border-b border-border/60">
                    <th scope="row" className="px-2 py-2 text-left font-normal">
                      {alumno.nombre}
                    </th>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            En rojo, las asignaturas reprobadas (nota final menor a 4.0). La asistencia es la del
            año escolar completo, la que exige el 85% del Art. 10.2.
          </p>
        </section>
      ) : null}
    </div>
  );
}
