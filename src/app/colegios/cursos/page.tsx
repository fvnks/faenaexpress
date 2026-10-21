import {
  AssignmentForm,
  CourseForm,
  RemoveAssignmentButton,
  SubjectForm,
} from "@/app/colegios/cursos/course-forms";
import { db } from "@/lib/db";
import { requireSchoolContext, schoolCanWrite } from "@/lib/school-auth";
import { schoolLevelLabel } from "@/lib/school-permissions";
import { cardClass } from "@/lib/ui";

// Los cursos del colegio y quién hace qué en ellos.
//
// El plan de cada curso (asignatura + docente) es lo que sostiene todo lo demás:
// sin asignación no hay clase, y sin clase no hay nota ni asistencia.
export default async function CursosPage() {
  const ctx = await requireSchoolContext("cursos");
  const schoolId = ctx.school.id;
  const puedeEditar = schoolCanWrite(ctx, "cursos");

  const [cursos, asignaturas, docentes] = await Promise.all([
    db.course.findMany({
      where: { schoolId, active: true },
      orderBy: [{ year: "desc" }, { name: "asc" }],
      include: {
        _count: { select: { enrollments: true } },
        assignments: {
          include: { subject: { select: { name: true } }, teacher: { select: { name: true } } },
        },
      },
    }),
    db.subject.findMany({
      where: { schoolId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    db.teacher.findMany({
      where: { schoolId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const matriculados = cursos.reduce((acc, c) => acc + c._count.enrollments, 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Cursos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Los cursos de {ctx.school.name} y quién hace qué en ellos.
        </p>
      </div>

      {puedeEditar ? (
        <section className={cardClass + " p-5"}>
          <div className="flex flex-wrap items-start gap-6">
            <CourseForm anio={new Date().getFullYear()} />
            <SubjectForm />
          </div>
        </section>
      ) : null}

      {cursos.length === 0 ? (
        <p className={cardClass + " px-4 py-6 text-sm text-muted-foreground"}>
          Todavía no hay cursos en este colegio.
        </p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {cursos.length} {cursos.length === 1 ? "curso" : "cursos"} · {matriculados} matrículas.
          </p>

          <ul className="grid gap-3 sm:grid-cols-2">
            {cursos.map((curso) => (
              <li key={curso.id} className={cardClass + " p-4"}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-medium">{curso.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {curso.year} · {schoolLevelLabel(curso.level)}
                  </p>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {curso._count.enrollments} alumnos
                </p>

                {curso.assignments.length > 0 ? (
                  <ul className="mt-2 flex flex-col gap-1">
                    {curso.assignments.map((a) => (
                      <li
                        key={a.id}
                        className="flex items-center justify-between gap-2 text-xs text-muted-foreground"
                      >
                        <span>
                          {a.subject.name} · {a.teacher.name}
                          {a.weeklyHours > 0 ? ` · ${a.weeklyHours} h/sem` : ""}
                        </span>
                        {puedeEditar ? (
                          <RemoveAssignmentButton
                            assignmentId={a.id}
                            nombre={a.subject.name}
                          />
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Sin asignaturas: este curso todavía no tiene docente.
                  </p>
                )}

                {puedeEditar ? (
                  <div className="mt-3">
                    <AssignmentForm
                      courseId={curso.id}
                      asignaturas={asignaturas.map((a) => ({ id: a.id, nombre: a.name }))}
                      docentes={docentes.map((d) => ({ id: d.id, nombre: d.name }))}
                    />
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
