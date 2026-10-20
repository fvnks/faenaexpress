import { db } from "@/lib/db";
import { requireSchoolContext } from "@/lib/school-auth";
import { schoolLevelLabel } from "@/lib/school-permissions";
import { cardClass } from "@/lib/ui";

// Los cursos del colegio y quién hace qué en ellos.
export default async function CursosPage() {
  const ctx = await requireSchoolContext("cursos");
  const schoolId = ctx.school.id;

  const cursos = await db.course.findMany({
    where: { schoolId, active: true },
    orderBy: [{ year: "desc" }, { name: "asc" }],
    include: {
      _count: { select: { enrollments: true } },
      assignments: {
        include: { subject: { select: { name: true } }, teacher: { select: { name: true } } },
      },
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Cursos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Los cursos de {ctx.school.name}, con los docentes de cada asignatura.
        </p>
      </div>

      {cursos.length === 0 ? (
        <p className={cardClass + " px-4 py-6 text-sm text-muted-foreground"}>
          Todavía no hay cursos en este colegio.
        </p>
      ) : (
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
                    <li key={a.id} className="text-xs text-muted-foreground">
                      {a.subject.name} · {a.teacher.name}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">
                  Sin asignaturas: este curso todavía no tiene docente.
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
