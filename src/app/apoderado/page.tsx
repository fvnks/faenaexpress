import { portalLogout } from "@/app/actions/portal";
import { PortalForm } from "@/app/apoderado/portal-form";
import { SolicitarReunion } from "@/app/apoderado/SolicitarReunion";
import {
  PortalAppointments,
  PortalCirculars,
  PortalJustifications,
} from "@/app/apoderado/portal-communication";
import { db } from "@/lib/db";
import { attendanceSummary } from "@/lib/school-attendance";
import {
  circularesParaApoderado,
  inasistenciasPorJustificar,
} from "@/lib/school-communication";
import { courseReport } from "@/lib/school-grades";
import { apoderadoActual } from "@/lib/school-portal";
import { cardClass } from "@/lib/ui";

/**
 * Portal del apoderado.
 *
 * Vive FUERA de `/colegios` a propósito: ese layout exige una membresía del
 * colegio y el apoderado no es personal de nadie. Es el segundo tipo de usuario
 * del producto, con su propia sesión y su propia cookie.
 *
 * Lo que se muestra es el mismo cálculo que ve el colegio: la asistencia y el
 * 85% (Decreto 67) y las notas con la situación de promoción. No hay dos
 * versiones de la verdad.
 */
export default async function PortalPage() {
  const sesion = await apoderadoActual();

  if (!sesion) {
    return (
      <div className="min-h-dvh">
        <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-10">
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Portal del apoderado
            </p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight">Entra a ver a tus hijos</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Usa el código que te dio el colegio para ver la asistencia y las notas.
            </p>
          </div>
          <PortalForm />
          <p className="mt-6 text-xs text-muted-foreground">
            ¿No tienes el código? Pídelo en la secretaría del colegio. Si tu colegio te dio un
            enlace propio, ábrelo: ahí el código se pide para ese colegio.
          </p>
        </main>
      </div>
    );
  }

  const apoderado = sesion.guardian;

  const hijos = await db.student.findMany({
    where: { guardianships: { some: { guardianId: apoderado.id } } },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    include: {
      enrollments: {
        where: { status: "ACTIVE" },
        include: { course: { select: { id: true, name: true, year: true, schoolId: true } } },
      },
    },
  });

  const colegio = await db.school.findUnique({
    where: { id: hijos[0]?.enrollments[0]?.course.schoolId ?? "" },
    select: { name: true, commune: true },
  });

  // Lo que la familia tiene pendiente de mirar o de responder.
  const [circulares, inasistencias, citas] = await Promise.all([
    circularesParaApoderado(apoderado.id),
    inasistenciasPorJustificar(apoderado.schoolId, apoderado.id),
    db.appointment.findMany({
      where: {
        schoolId: apoderado.schoolId,
        OR: [
          { guardianId: apoderado.id },
          { student: { guardianships: { some: { guardianId: apoderado.id } } } },
        ],
      },
      orderBy: { scheduledAt: "desc" },
      take: 20,
    }),
  ]);

  return (
    <div className="min-h-dvh">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div>
            <p className="text-sm font-bold tracking-tight text-muted-foreground">Yellow ERP</p>
            <p className="text-sm font-medium">{colegio?.name ?? "Portal del apoderado"}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">{apoderado.name}</span>
            <form action={portalLogout}>
              <button
                type="submit"
                className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
              >
                Salir
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6">
        <section className={cardClass + " p-5"}>
          <h2 className="font-semibold">Comunicados</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Lo que el colegio comunica a las familias. Al marcar una como leída, el colegio lo
            sabe.
          </p>
          <div className="mt-4">
            <PortalCirculars circulares={circulares} />
          </div>
        </section>

        <section className={cardClass + " p-5"}>
          <h2 className="font-semibold">Justificar inasistencias</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Si un hijo faltó y tiene justificativo, envíalo por acá. Lo revisa la secretaría del
            colegio: el registro no cambia hasta que ellos lo acepten.
          </p>
          <div className="mt-4">
            <PortalJustifications inasistencias={inasistencias} />
          </div>
        </section>

        <section className={cardClass + " p-5"}>
          <h2 className="font-semibold">Citaciones</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Entrevistas y reuniones con el colegio.
          </p>
          <div className="mt-4">
            <PortalAppointments citas={citas} />
          </div>
        </section>

        <section className={cardClass + " p-5"}>
          <SolicitarReunion
            hijos={hijos.map((h) => ({ id: h.id, nombre: `${h.firstName} ${h.lastName}` }))}
            citas={citas}
          />
        </section>

        {hijos.length === 0 ? (
          <section className={cardClass + " p-5"}>
            <p className="text-sm text-muted-foreground">
              Este código no tiene alumnos asociados todavía. Si crees que es un error, habla con la
              secretaría del colegio.
            </p>
          </section>
        ) : (
          hijos.map(async (hijo) => {
            const matriculas = hijo.enrollments;
            const reportes = await Promise.all(
              matriculas.map(async (m) => ({
                curso: m.course,
                reporte: await courseReport(m.course.id),
              })),
            );
            const asistencias = await Promise.all(
              matriculas.map(async (m) => ({
                curso: m.course,
                resumen: await attendanceSummary(hijo.id, m.course.id),
              })),
            );

            const ultimos = await db.attendanceRecord.findMany({
              where: { studentId: hijo.id },
              orderBy: { recordedAt: "desc" },
              take: 8,
              include: { session: { include: { subject: { select: { name: true } } } } },
            });

            return (
              <div key={hijo.id} className="flex flex-col gap-4">
                <section className={cardClass + " p-5"}>
                  <h1 className="text-xl font-bold tracking-tight">
                    {hijo.firstName} {hijo.lastName}
                  </h1>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {matriculas.map((m) => `${m.course.name} · ${m.course.year}`).join(" · ") ||
                      "sin curso asignado"}
                  </p>
                </section>

                {asistencias.map(({ curso, resumen }) => (
                  <section key={curso.id} className={cardClass + " p-5"}>
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h2 className="font-semibold">Asistencia · {curso.name}</h2>
                      {resumen.sinClases ? (
                        <p className="text-sm font-semibold text-muted-foreground">
                          sin clases registradas
                        </p>
                      ) : (
                        <p
                          className={
                            "tabular text-sm font-semibold " +
                            (resumen.cumple ? "text-success" : "text-accent")
                          }
                        >
                          {resumen.porcentaje.toFixed(1)}%{" "}
                          {resumen.cumple ? "· cumple el 85%" : "· bajo el 85%"}
                        </p>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {resumen.sinClases
                        ? "El colegio todavía no registra clases de este curso."
                        : `${resumen.asiste} de ${resumen.total} clases · ${resumen.falta} inasistencias sin justificar` +
                          (resumen.eximidas > 0 ? ` · ${resumen.eximidas} justificadas` : "")}
                    </p>

                    {ultimos.length > 0 ? (
                      <ul className="mt-3 divide-y divide-border text-sm">
                        {ultimos.map((r) => (
                          <li key={r.id} className="flex items-center justify-between gap-3 py-1.5">
                            <span>
                              {r.session.date.toLocaleDateString("es-CL")} · {r.session.subject.name}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {r.status === "PRESENT"
                                ? "Presente"
                                : r.status === "ABSENT"
                                  ? "Ausente"
                                  : r.status === "LATE"
                                    ? `Atraso${r.minutesLate > 0 ? ` ${r.minutesLate} min` : ""}`
                                    : r.status === "JUSTIFIED"
                                      ? "Justificada"
                                      : r.status === "EXCUSED"
                                        ? "Eximido"
                                        : r.status}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </section>
                ))}

                {reportes.map(({ curso, reporte }) => {
                  const alumno = reporte.alumnos.find((a) => a.studentId === hijo.id);
                  if (!alumno) return null;
                  return (
                    <section key={curso.id} className={cardClass + " p-5"}>
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <h2 className="font-semibold">Notas · {curso.name}</h2>
                        <p className="text-sm">
                          <span className="tabular font-semibold">
                            promedio {alumno.promedio?.toFixed(1) ?? "—"}
                          </span>
                          <span
                            className={
                              "ml-3 font-medium " +
                              (alumno.situacion.estado === "PROMOVIDO"
                                ? "text-success"
                                : "text-accent")
                            }
                          >
                            {alumno.situacion.estado === "PROMOVIDO"
                              ? "Promovido"
                              : "En análisis"}
                          </span>
                        </p>
                      </div>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {alumno.situacion.fundamento}
                      </p>

                      <div className="mt-4 overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-border text-left">
                              <th
                                scope="col"
                                className="px-2 py-2 font-medium text-muted-foreground"
                              >
                                Asignatura
                              </th>
                              {reporte.periodos.map((p) => (
                                <th
                                  key={p.id}
                                  scope="col"
                                  className="px-2 py-2 text-right font-medium text-muted-foreground"
                                >
                                  {p.nombre}
                                </th>
                              ))}
                              <th
                                scope="col"
                                className="px-2 py-2 text-right font-medium text-muted-foreground"
                              >
                                Final
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {alumno.asignaturas.map((a) => (
                              <tr key={a.subjectId} className="border-b border-border/60">
                                <th scope="row" className="px-2 py-2 text-left font-normal">
                                  {a.nombre}
                                </th>
                                {a.periodos.map((p) => (
                                  <td key={p.periodoId} className="tabular px-2 py-2 text-right">
                                    {p.nota === null ? (
                                      <span className="text-muted-foreground">—</span>
                                    ) : (
                                      p.nota.toFixed(1)
                                    )}
                                  </td>
                                ))}
                                <td className="tabular px-2 py-2 text-right font-medium">
                                  {a.final === null ? "—" : a.final.toFixed(1)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </section>
                  );
                })}
              </div>
            );
          })
        )}

        <p className="text-xs text-muted-foreground">
          La información se entrega tal como la registra el colegio. Las calificaciones siguen el
          Decreto 67/2018 del MINEDUC.
        </p>
      </main>
    </div>
  );
}
