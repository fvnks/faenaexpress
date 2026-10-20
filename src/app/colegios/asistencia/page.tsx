import Link from "next/link";
import { redirect } from "next/navigation";

import { AttendanceSheet } from "@/app/colegios/asistencia/attendance-sheet";
import { db } from "@/lib/db";
import { requireSchoolContext, schoolCanWrite } from "@/lib/school-auth";
import { classSheet, enrolledStudents, listSessions } from "@/lib/school-attendance";
import { cardClass } from "@/lib/ui";

// El registro diario: la pantalla del docente. Elige la clase y marca.
export default async function AsistenciaPage({
  searchParams,
}: PageProps<"/colegios/asistencia">) {
  const ctx = await requireSchoolContext("asistencia");
  const params = await searchParams;
  const sessionId = typeof params.clase === "string" ? params.clase : null;

  const courses = await db.course.findMany({
    where: { schoolId: ctx.school.id, active: true },
    orderBy: [{ year: "desc" }, { name: "asc" }],
    select: { id: true, name: true, year: true },
  });

  const courseId = typeof params.curso === "string" ? params.curso : courses[0]?.id ?? null;

  const sesiones = courseId ? await listSessions(courseId) : [];

  if (!sessionId) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Asistencia</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            El registro diario del libro de clases. Cada clase guardada queda con quién la registró y
            cuándo.
          </p>
        </div>

        <section className={cardClass + " p-5"}>
          <h2 className="font-semibold">Clases registradas</h2>
          {courses.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Todavía no hay cursos en este colegio.
            </p>
          ) : (
            <>
              <ul className="mt-3 flex flex-wrap gap-2">
                {courses.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/colegios/asistencia?curso=${c.id}`}
                      className={
                        "rounded-control border border-border px-3 py-1.5 text-sm hover:bg-background " +
                        (c.id === courseId ? "border-primary text-primary" : "")
                      }
                    >
                      {c.name} · {c.year}
                    </Link>
                  </li>
                ))}
              </ul>

              {sesiones.length === 0 ? (
                <p className="mt-4 text-sm text-muted-foreground">
                  Este curso todavía no tiene clases registradas.
                </p>
              ) : (
                <ul className="mt-4 divide-y divide-border">
                  {sesiones.map((s) => (
                    <li key={s.id} className="flex items-center justify-between gap-3 py-2.5">
                      <span className="text-sm">
                        {s.date.toLocaleDateString("es-CL")} · {s.subject.name} · {s.teacher.name}
                      </span>
                      <span className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground">
                          {s._count.attendances} marcados
                        </span>
                        <Link
                          href={`/colegios/asistencia?curso=${courseId}&clase=${s.id}`}
                          className="rounded-control border border-border px-3 py-1.5 text-sm hover:bg-background"
                        >
                          Abrir
                        </Link>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </section>
      </div>
    );
  }

  const sesion = await classSheet(sessionId);
  if (!sesion || sesion.schoolId !== ctx.school.id) redirect("/colegios/asistencia");

  const matriculados = await enrolledStudents(sesion.courseId);
  const porAlumno = new Map(sesion.attendances.map((a) => [a.studentId, a]));

  const alumnos = matriculados.map((m) => {
    const registro = porAlumno.get(m.student.id);
    return {
      id: m.student.id,
      nombre: `${m.student.firstName} ${m.student.lastName}`,
      estado: registro?.status ?? "PRESENT",
      nota: registro?.justificationNote ?? "",
    };
  });

  const puedeEditar = schoolCanWrite(ctx, "asistencia");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/colegios/asistencia" className="text-sm text-muted-foreground hover:text-foreground">
          ← Asistencia
        </Link>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">
          {sesion.course.name} · {sesion.subject.name}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {sesion.date.toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long" })} ·{" "}
          {sesion.teacher.name}
          {sesion.startTime ? ` · ${sesion.startTime}` : ""}
        </p>
      </div>

      {sesion.contents || sesion.activities || sesion.objectives ? (
        <section className={cardClass + " p-5"}>
          <h2 className="font-semibold">Registro de la clase</h2>
          <dl className="mt-3 space-y-3 text-sm">
            {sesion.contents ? (
              <div>
                <dt className="text-xs text-muted-foreground">Contenidos</dt>
                <dd className="mt-0.5">{sesion.contents}</dd>
              </div>
            ) : null}
            {sesion.activities ? (
              <div>
                <dt className="text-xs text-muted-foreground">Actividades</dt>
                <dd className="mt-0.5">{sesion.activities}</dd>
              </div>
            ) : null}
            {sesion.objectives ? (
              <div>
                <dt className="text-xs text-muted-foreground">Objetivos de aprendizaje</dt>
                <dd className="mt-0.5">{sesion.objectives}</dd>
              </div>
            ) : null}
          </dl>
        </section>
      ) : null}

      <section className={cardClass + " p-5"}>
        <h2 className="font-semibold">Asistencia del día</h2>
        <div className="mt-4">
          <AttendanceSheet
            sessionId={sesion.id}
            alumnos={alumnos}
            puedeEditar={puedeEditar}
          />
        </div>
      </section>
    </div>
  );
}
