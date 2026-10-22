import Link from "next/link";
import { redirect } from "next/navigation";

import { AttendanceSheet } from "@/app/colegios/asistencia/attendance-sheet";
import { ClassForm } from "@/app/colegios/asistencia/class-form";
import { SessionSignature } from "@/app/colegios/asistencia/sign-session";
import { FaltaEsto } from "@/app/colegios/falta-esto";
import { db } from "@/lib/db";
import { requireSchoolContext, schoolCanWrite } from "@/lib/school-auth";
import { firmaDeSesion } from "@/lib/school-signatures";
import { puedeFirmarSesion } from "@/lib/school-sign-rules";
import { classSheet, enrolledStudents, listSessions } from "@/lib/school-attendance";
import { todayISO } from "@/lib/money";
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
    // Para registrar una clase hacen falta las asignaturas que se imparten y
    // los docentes: son el plan del curso.
    const [asignaturas, docentes] = await Promise.all([
      db.subject.findMany({
        where: { schoolId: ctx.school.id, assignments: { some: {} } },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
      db.teacher.findMany({
        where: { schoolId: ctx.school.id },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
    ]);

    const puedeRegistrar = schoolCanWrite(ctx, "asistencia");

    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Asistencia</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            El registro diario del libro de clases. Cada clase guardada queda con quién la registró y
            cuándo.
          </p>
        </div>

        {puedeRegistrar ? (
          <section className={cardClass + " p-5"}>
            <ClassForm
              cursos={courses.map((c) => ({ id: c.id, nombre: `${c.name} · ${c.year}` }))}
              asignaturas={asignaturas.map((a) => ({ id: a.id, nombre: a.name }))}
              docentes={docentes.map((d) => ({ id: d.id, nombre: d.name }))}
              hoy={todayISO()}
            />
          </section>
        ) : null}

        <section className={cardClass + " p-5"}>
          <h2 className="font-semibold">Clases registradas</h2>
          {courses.length === 0 ? (
            <div className="mt-3">
              <FaltaEsto href="/colegios/cursos" accion="Ir a Cursos">
                Todavía no hay cursos en este colegio.
              </FaltaEsto>
            </div>
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

  // La firma es del libro, no de la asistencia: escribe quien puede escribir el
  // libro, y dentro de eso, quien registró (o la dirección/UTP en pendientes).
  const autorizadoFirma = puedeFirmarSesion(ctx.role, ctx.user.id, sesion.recordedById);
  const puedeAnularFirma = schoolCanWrite(ctx, "libro") && (ctx.role === "DIRECTOR" || ctx.role === "UTP");
  const firma = await firmaDeSesion(sesion.id, sesion.attendances.length);

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

      <section className={cardClass + " p-5"}>
        <h2 className="font-semibold">Firma del libro de clases</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          La firma reemplaza la rúbrica de puño y letra: el MINEDUC la valida contra el RUN de
          quien firma.
        </p>
        <div className="mt-4">
          <SessionSignature
            sessionId={sesion.id}
            rut={ctx.user.rut ?? ""}
            firma={firma ? { ...firma, verificadoEn: firma.verificadoEn.toISOString() } : null}
            puedeFirmar={autorizadoFirma.ok && schoolCanWrite(ctx, "libro")}
            puedeAnular={puedeAnularFirma && firma !== null}
          />
        </div>
      </section>
    </div>
  );
}
