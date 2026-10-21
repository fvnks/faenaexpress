import { db } from "@/lib/db";
import { requireSchoolContext, schoolCanWrite } from "@/lib/school-auth";
import { TeacherForm } from "@/app/colegios/docentes/teacher-form";
import { cardClass } from "@/lib/ui";

// Los docentes del colegio: quién imparte qué y a qué hora.
export default async function DocentesPage() {
  const ctx = await requireSchoolContext("docentes");
  const schoolId = ctx.school.id;
  const puedeEditar = schoolCanWrite(ctx, "docentes");

  const docentes = await db.teacher.findMany({
    where: { schoolId },
    orderBy: { name: "asc" },
    include: {
      assignments: {
        include: {
          subject: { select: { name: true } },
          course: { select: { name: true, year: true } },
        },
      },
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Docentes</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Los docentes de {ctx.school.name} y las asignaturas que imparten.
        </p>
      </div>

      {puedeEditar ? (
        <section className={cardClass + " p-5"}>
          <TeacherForm />
        </section>
      ) : null}

      {docentes.length === 0 ? (
        <section className={cardClass + " p-5"}>
          <p className="text-sm text-muted-foreground">
            Todavía no hay docentes. Sin docentes no hay clases ni notas: el plan del curso se
            arma con ellos.
          </p>
        </section>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {docentes.map((docente) => (
            <li key={docente.id} className={cardClass + " p-4"}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-medium">{docente.name}</p>
                <p className="text-xs text-muted-foreground">{docente.rut ?? "sin RUT"}</p>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {docente.email ?? ""}
                {docente.email && docente.phone ? " · " : ""}
                {docente.phone ?? ""}
              </p>
              {docente.assignments.length > 0 ? (
                <ul className="mt-2 flex flex-col gap-1">
                  {docente.assignments.map((a) => (
                    <li key={a.id} className="text-xs text-muted-foreground">
                      {a.subject.name} · {a.course.name} ({a.course.year})
                      {a.weeklyHours > 0 ? ` · ${a.weeklyHours} h/sem` : ""}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">
                  Sin asignaturas: hay que asignarlo a un curso en Cursos.
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
