import { db } from "@/lib/db";
import { schoolLevelLabel } from "@/lib/school-permissions";
import { requireSchoolContext } from "@/lib/school-auth";
import { cardClass } from "@/lib/ui";

// Panel del colegio: el estado real del establecimiento.
export default async function ColegiosPage() {
  const ctx = await requireSchoolContext("panel");
  const schoolId = ctx.school.id;

  const [alumnos, cursos, docentes, apoderados, matriculas] = await Promise.all([
    db.student.count({ where: { schoolId, status: "ACTIVE" } }),
    db.course.count({ where: { schoolId, active: true } }),
    db.teacher.count({ where: { schoolId } }),
    db.guardian.count({ where: { schoolId } }),
    db.enrollment.count({ where: { course: { schoolId }, status: "ACTIVE" } }),
  ]);

  const metricas = [
    { label: "Alumnos", valor: alumnos },
    { label: "Matrículas", valor: matriculas },
    { label: "Cursos", valor: cursos },
    { label: "Docentes", valor: docentes },
    { label: "Apoderados", valor: apoderados },
  ];

  const cursosListados = await db.course.findMany({
    where: { schoolId, active: true },
    orderBy: [{ year: "desc" }, { name: "asc" }],
    take: 12,
    include: { _count: { select: { enrollments: true } } },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{ctx.school.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {schoolLevelLabel(ctx.school.level)}
          {ctx.school.commune ? ` · ${ctx.school.commune}` : ""}
          {ctx.school.rut ? ` · RUT ${ctx.school.rut}` : ""}
        </p>
      </div>

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {metricas.map((m) => (
          <li key={m.label} className={cardClass + " px-4 py-3"}>
            <p className="text-xs text-muted-foreground">{m.label}</p>
            <p className="tabular mt-1 text-2xl font-semibold">{m.valor}</p>
          </li>
        ))}
      </ul>

      <section className={cardClass + " p-5"}>
        <h2 className="font-semibold">Cursos</h2>
        {cursosListados.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Todavía no hay cursos en este colegio.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {cursosListados.map((curso) => (
              <li key={curso.id} className="flex items-center justify-between gap-3 py-2.5">
                <span className="text-sm font-medium">{curso.name}</span>
                <span className="text-xs text-muted-foreground">
                  {curso._count.enrollments} alumnos · {curso.year}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
