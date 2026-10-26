import Link from "next/link";

import { Kpi04 } from "@/components/ui/studio-blocks";
import { db } from "@/lib/db";
import { schoolLevelLabel, canAccessSchool, type SchoolSection } from "@/lib/school-permissions";
import { requireSchoolContext } from "@/lib/school-auth";
import { cardClass } from "@/lib/ui";

type Paso = {
  href: string;
  seccion: SchoolSection;
  titulo: string;
  porQue: string;
  destino: string;
  listo: boolean;
};

// Panel del colegio: el estado real del establecimiento.
//
// Un colegio recién creado no tiene nada: sin cursos ni docentes no hay
// asistencia ni notas, y el panel era un tablero en cero sin ninguna salida.
// Por eso, mientras falten pasos, el panel los lista en orden y lleva a la
// pantalla donde se hacen.
export default async function ColegiosPage() {
  const ctx = await requireSchoolContext("panel");
  const schoolId = ctx.school.id;

  const [alumnos, cursos, docentes, apoderados, matriculas, asignaturas, cursosConPlan] =
    await Promise.all([
      db.student.count({ where: { schoolId, status: "ACTIVE" } }),
      db.course.count({ where: { schoolId, active: true } }),
      db.teacher.count({ where: { schoolId } }),
      db.guardian.count({ where: { schoolId } }),
      db.enrollment.count({ where: { course: { schoolId }, status: "ACTIVE" } }),
      db.subject.count({ where: { schoolId } }),
      db.course.count({ where: { schoolId, active: true, assignments: { some: {} } } }),
    ]);

  // Los pasos, en orden. El panel solo lista los que faltan: el checklist se
  // achica a medida que el colegio se arma y no vuelve a mostrar lo hecho.
  const catalogo: Paso[] = [
    {
      href: "/colegios/docentes",
      seccion: "docentes",
      titulo: "Registra a los docentes",
      porQue: "Sin docentes no hay clases ni notas: el plan del curso se arma con ellos.",
      destino: "Docentes",
      listo: docentes > 0,
    },
    {
      href: "/colegios/cursos",
      seccion: "cursos",
      titulo: "Crea las asignaturas del plan",
      porQue: "El plan de estudios es lo que después se reparte entre los cursos.",
      destino: "Cursos",
      listo: asignaturas > 0,
    },
    {
      href: "/colegios/cursos",
      seccion: "cursos",
      titulo: "Crea los cursos",
      porQue: "Cada curso agrupa a los alumnos de un nivel, con su año y su letra.",
      destino: "Cursos",
      listo: cursos > 0,
    },
    {
      href: "/colegios/cursos",
      seccion: "cursos",
      titulo: "Asigna el plan a cada curso",
      porQue: "Cada curso necesita sus asignaturas y el docente que las imparte.",
      destino: "Cursos",
      listo: cursos > 0 && cursosConPlan === cursos,
    },
    {
      href: "/colegios/estudiantes",
      seccion: "estudiantes",
      titulo: "Matricula a los alumnos",
      porQue: "Un alumno sin curso no tiene asistencia ni notas.",
      destino: "Alumnos",
      listo: matriculas > 0,
    },
  ];

  // Cada paso lleva a una sección: si el rol no entra, el paso no se ofrece.
  const pendientes = catalogo.filter(
    (paso) => !paso.listo && canAccessSchool(ctx.role, paso.seccion),
  );

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

      {pendientes.length > 0 ? (
        <section className={cardClass + " p-5"}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-semibold">Puesta en marcha</h2>
            <p className="text-xs text-muted-foreground">
              {pendientes.length === 1 ? "Falta un paso" : `Faltan ${pendientes.length} pasos`}
            </p>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Mientras falten, el colegio no puede tomar asistencia ni registrar notas.
          </p>
          <ul className="mt-4 divide-y divide-border">
            {pendientes.map((paso) => (
              <li
                key={paso.titulo}
                className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">{paso.titulo}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{paso.porQue}</p>
                </div>
                <Link
                  href={paso.href}
                  className="shrink-0 text-sm font-semibold text-primary underline underline-offset-2 hover:text-primary/80"
                >
                  {paso.destino}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <section className="rounded-card border border-success/50 bg-success-soft p-5">
          <h2 className="font-semibold text-success">Colegio listo</h2>
          <p className="mt-1 text-sm text-success/80">
            Todos los pasos de configuración están completos: el colegio ya puede tomar asistencia y
            registrar notas.
          </p>
        </section>
      )}

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {metricas.map((m) => (
          <li key={m.label}>
            <Kpi04 title={m.label} value={m.valor} format="number" />
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
