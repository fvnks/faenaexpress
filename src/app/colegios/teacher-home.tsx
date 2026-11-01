import Link from "next/link";

import { db } from "@/lib/db";
import { formatDate, todayISO } from "@/lib/money";
import { asignacionesDeDocente, docenteDeUsuario } from "@/lib/school-team";
import { cardClass } from "@/lib/ui";

/**
 * La home del docente: "Mi jornada".
 *
 * Una sola pregunta al abrir la app: ¿qué tengo que hacer hoy? La pantalla
 * no es un tablero de métricas del colegio (eso es del director), es la
 * agenda de quien tiene clases.
 *
 * Todo lo que muestra es **derivado**: se calcula al abrir la página, no se
 * guarda. Un pendiente guardado hay que mantenerlo y se desincroniza solo; uno
 * derivado nunca miente.
 */
export async function TeacherHome({
  userId,
  schoolId,
  nombre,
}: {
  userId: string;
  schoolId: string;
  nombre: string;
}) {
  const docente = await docenteDeUsuario(userId, schoolId);

  // Sin ficha de docente no hay alcance: la pantalla dice eso en vez de
  // mostrar una agenda vacía sin explicación.
  if (!docente) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mi jornada</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {nombre} · todavía no tienes una ficha de docente en este colegio.
          </p>
        </div>
        <section className={cardClass + " p-5"}>
          <h2 className="font-semibold">Te falta la ficha de docente</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            La ficha dice qué cursos impartes y qué notas te tocan. Pídele a la secretaría que te
            vincule la ficha en Docentes: hasta entonces no hay clases ni notas que registrar.
          </p>
        </section>
      </div>
    );
  }

  const asignaciones = await asignacionesDeDocente(userId, schoolId);

  // Las fechas de calendario del colegio se guardan al mediodía UTC: el mismo
  // criterio con el que se escriben, para que "hoy" no se corra de día.
  const hoy = new Date(`${todayISO()}T12:00:00.000Z`);
  const desde = new Date(hoy.getTime() - 14 * 24 * 60 * 60 * 1000);

  const [sesionesHoy, sinFirmar, periodoActual] = await Promise.all([
    db.classSession.findMany({
      where: { teacherId: docente.id, date: hoy },
      orderBy: { period: "asc" },
      include: {
        course: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true } },
        signature: { select: { id: true } },
        _count: { select: { attendances: true } },
      },
    }),
    db.classSession.findMany({
      where: {
        teacherId: docente.id,
        recordedById: userId,
        date: { gte: desde, lte: hoy },
        signature: { is: null },
      },
      orderBy: { date: "desc" },
      include: {
        course: { select: { id: true, name: true } },
        subject: { select: { name: true } },
      },
    }),
    db.gradingPeriod.findFirst({
      where: { schoolId, startDate: { lte: hoy }, endDate: { gte: hoy } },
      orderBy: { order: "desc" },
      select: { id: true, name: true },
    }),
  ]);

  // Cuántos alumnos tiene cada curso: para saber si la asistencia está
  // completa o si todavía falta alguien.
  const cursosDeHoy = [...new Set(sesionesHoy.map((s) => s.course.id))];
  const matriculas = cursosDeHoy.length
    ? await db.enrollment.findMany({
        where: { courseId: { in: cursosDeHoy }, status: "ACTIVE" },
        select: { courseId: true },
      })
    : [];
  const alumnosPorCurso = new Map<string, number>();
  for (const m of matriculas) {
    alumnosPorCurso.set(m.courseId, (alumnosPorCurso.get(m.courseId) ?? 0) + 1);
  }

  // Las evaluaciones del período que todavía tienen notas sin poner.
  const pares = asignaciones.map((a) => ({ courseId: a.courseId, subjectId: a.subjectId }));
  const notasPendientes =
    periodoActual && pares.length
      ? await db.evaluation.findMany({
          where: {
            schoolId,
            periodId: periodoActual.id,
            OR: pares,
            grades: { some: { status: "PENDIENTE" } },
          },
          orderBy: { date: "desc" },
          take: 8,
          include: {
            course: { select: { id: true, name: true } },
            subject: { select: { id: true, name: true } },
            grades: { select: { status: true } },
          },
        })
      : [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mi jornada</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {nombre} · {docente.name}
        </p>
      </div>

      <section className={cardClass + " p-5"}>
        <h2 className="font-semibold">Hoy</h2>
        {sesionesHoy.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Hoy no tienes clases registradas. Cuando registres una clase, aparece acá con su
            asistencia.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {sesionesHoy.map((s) => {
              const esperados = alumnosPorCurso.get(s.course.id) ?? 0;
              const completa = s._count.attendances >= esperados && esperados > 0;
              return (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {s.course.name} · {s.subject.name}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Período {s.period}
                      {s.startTime ? ` · ${s.startTime}` : ""} · asistencia {s._count.attendances}
                      {esperados > 0 ? ` de ${esperados}` : ""}
                    </p>
                  </div>
                  <span className="flex items-center gap-3">
                    <span
                      className={
                        "rounded-full px-2.5 py-1 text-xs font-medium " +
                        (s.signature
                          ? "bg-success-soft text-success"
                          : completa
                            ? "bg-accent-soft text-accent"
                            : "bg-background text-muted-foreground")
                      }
                    >
                      {s.signature ? "Firmada" : completa ? "Sin firmar" : "Asistencia incompleta"}
                    </span>
                    {s.signature || completa ? (
                      <Link
                        href={`/colegios/asistencia?curso=${s.course.id}&clase=${s.id}`}
                        className={
                          completa
                            ? "rounded-control border border-primary px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10"
                            : "text-sm font-semibold text-primary underline underline-offset-2 hover:text-primary/80"
                        }
                      >
                        {completa ? "Firmar" : "Abrir"}
                      </Link>
                    ) : (
                      <Link
                        href={`/colegios/asistencia?curso=${s.course.id}&clase=${s.id}`}
                        className="text-sm font-semibold text-primary underline underline-offset-2 hover:text-primary/80"
                      >
                        Completar
                      </Link>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className={cardClass + " p-5"}>
        <h2 className="font-semibold">Lo que quedó pendiente</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {sinFirmar.length > 0
            ? "Clases tuyas sin firmar. La firma es del libro de clases y la hace quien registró."
            : "No tienes clases sin firmar."}
        </p>

        {sinFirmar.length > 0 ? (
          <ul className="mt-3 divide-y divide-border">
            {sinFirmar.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                <span className="text-sm">
                  {formatDate(s.date)} · {s.course.name} · {s.subject.name}
                </span>
                <Link
                  href={`/colegios/asistencia?curso=${s.course.id}&clase=${s.id}`}
                  className="text-sm font-semibold text-primary underline underline-offset-2 hover:text-primary/80"
                >
                  Firmar
                </Link>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="mt-4 border-t border-border pt-4">
          <p className="text-sm font-medium">
            {notasPendientes.length > 0
              ? `Notas sin poner en ${periodoActual?.name ?? "el período"}`
              : "No tienes notas pendientes en el período."}
          </p>
          {notasPendientes.length > 0 ? (
            <ul className="mt-2 divide-y divide-border">
              {notasPendientes.map((e) => {
                const faltantes = e.grades.filter((g) => g.status === "PENDIENTE").length;
                return (
                  <li key={e.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                    <span className="text-sm">
                      {e.name} · {e.course.name} · {e.subject.name}
                      <span className="ml-2 text-xs text-muted-foreground">
                        faltan {faltantes}
                      </span>
                    </span>
                    <Link
                      href={`/colegios/calificaciones?curso=${e.course.id}&asignatura=${e.subject.id}&evaluacion=${e.id}`}
                      className="text-sm font-semibold text-primary underline underline-offset-2 hover:text-primary/80"
                    >
                      Poner notas
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
      </section>

      <section className={cardClass + " p-5"}>
        <h2 className="font-semibold">Mis cursos y asignaturas</h2>
        {asignaciones.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Todavía no tienes asignaturas. La dirección las reparte en Cursos.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {asignaciones.map((a) => (
              <li key={`${a.courseId}-${a.subjectId}`} className="flex items-center justify-between gap-3 py-2.5">
                <span className="text-sm">
                  {a.subjectName}
                  <span className="ml-2 text-xs text-muted-foreground">
                    {a.courseName} · {a.courseYear}
                  </span>
                </span>
                <Link
                  href={`/colegios/calificaciones?curso=${a.courseId}&asignatura=${a.subjectId}`}
                  className="text-sm font-semibold text-primary underline underline-offset-2 hover:text-primary/80"
                >
                  Calificar
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
