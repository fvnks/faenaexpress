import Link from "next/link";

import {
  AttendanceExceptionForm,
  DecisionForm,
  HearingForm,
  UtpReportForm,
} from "@/app/colegios/promocion/art11/promotion-forms";
import { db } from "@/lib/db";
import { requireSchoolContext, schoolCanWrite } from "@/lib/school-auth";
import { casosArt11 } from "@/lib/school-promotion-store";
import { casoEstado, faltantesDeliberacion, outcomeLabel } from "@/lib/school-promotion";
import { cardClass } from "@/lib/ui";

/**
 * El flujo de excepciones del Art. 11 del Decreto 67/2018.
 *
 * Acá se resuelven los casos que el Art. 10 dejó marcados "requiere análisis":
 * el informe del jefe técnico-pedagógico, la audiencia al estudiante y su
 * apoderado, y la decisión de la dirección con la UTP. El sistema no decide:
 * registra quién decidió y con qué fundamento.
 *
 * La excepción al 85% de asistencia (Art. 10.2) también vive acá, porque es la
 * otra forma en que un caso marcado puede terminar promovido.
 */
export default async function Art11Page({ searchParams }: PageProps<"/colegios/promocion/art11">) {
  const ctx = await requireSchoolContext("art11");
  const params = await searchParams;
  const puedeResolver = schoolCanWrite(ctx, "art11");

  const cursos = await db.course.findMany({
    where: { schoolId: ctx.school.id, active: true },
    orderBy: [{ year: "desc" }, { name: "asc" }],
    select: { id: true, name: true, year: true },
  });

  const cursoId =
    typeof params.curso === "string" && cursos.some((c) => c.id === params.curso)
      ? params.curso
      : (cursos[0]?.id ?? null);
  const cursoActual = cursos.find((c) => c.id === cursoId) ?? null;

  const casos = cursoId ? await casosArt11(cursoId, cursoActual?.year) : [];
  const alumnoId = typeof params.alumno === "string" ? params.alumno : null;
  const caso = casos.find((c) => c.studentId === alumnoId) ?? casos[0] ?? null;

  const pendientes = casos.filter((c) => !c.resolucion?.resolved).length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/colegios/promocion"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Acta de promoción
        </Link>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Casos del Art. 11</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Los alumnos que no cumplen la regla de promoción del Art. 10. La norma no los declara
          repitentes: obliga al establecimiento a analizarlos de forma deliberativa, con informe del
          jefe técnico-pedagógico y la visión del estudiante y su apoderado. La decisión es de la
          dirección con la UTP.
        </p>
      </div>

      <nav aria-label="Cursos" className="flex flex-wrap gap-2">
        {cursos.map((c) => (
          <Link
            key={c.id}
            href={`/colegios/promocion/art11?curso=${c.id}`}
            className={
              "rounded-control border border-border px-3 py-1.5 text-sm hover:bg-background " +
              (c.id === cursoId ? "border-primary text-primary" : "")
            }
          >
            {c.name} · {c.year}
          </Link>
        ))}
      </nav>

      {casos.length === 0 ? (
        <section className={cardClass + " p-5"}>
          <p className="text-sm text-muted-foreground">
            Este curso no tiene casos que requieran análisis del Art. 11.
          </p>
        </section>
      ) : (
        <>
          <section className={cardClass + " p-5"}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-semibold">{cursoActual ? cursoActual.name : "Casos"}</h2>
              <p className="text-sm text-muted-foreground">
                {casos.length} {casos.length === 1 ? "caso" : "casos"} ·{" "}
                {pendientes === 0 ? "todos resueltos" : `${pendientes} por resolver`}
              </p>
            </div>

            <ul className="mt-3 divide-y divide-border">
              {casos.map((c) => {
                const estado = c.resolucion ? casoEstado(c.resolucion) : "PENDIENTE";
                return (
                  <li key={c.studentId}>
                    <Link
                      href={`/colegios/promocion/art11?curso=${cursoId}&alumno=${c.studentId}`}
                      className={
                        "flex items-center justify-between gap-3 py-2.5 hover:text-primary " +
                        (caso?.studentId === c.studentId ? "text-primary" : "")
                      }
                    >
                      <span className="min-w-0 text-sm font-medium">{c.nombre}</span>
                      <span className="flex shrink-0 items-center gap-3 text-xs">
                        <span className="text-muted-foreground">{c.fundamento}</span>
                        <span
                          className={
                            estado === "RESUELTO"
                              ? "font-semibold text-success"
                              : "font-semibold text-accent"
                          }
                        >
                          {c.resolucion?.resolved
                            ? outcomeLabel(c.resolucion.outcome)
                            : "Pendiente"}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>

          {caso ? (
            <section className={cardClass + " p-5"}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <h2 className="font-semibold">{caso.nombre}</h2>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {caso.rut ? `RUT ${caso.rut} · ` : ""}
                    promedio {caso.promedio === null ? "—" : caso.promedio.toFixed(1)} · asistencia{" "}
                    {caso.asistencia === null ? "—" : `${caso.asistencia.toFixed(1)}%`}
                  </p>
                </div>
                {caso.resolucion?.resolved ? (
                  <span className="rounded-control border border-success/40 px-2.5 py-1 text-xs font-semibold text-success">
                    {outcomeLabel(caso.resolucion.outcome)}
                  </span>
                ) : (
                  <span className="rounded-control border border-accent/40 px-2.5 py-1 text-xs font-semibold text-accent">
                    Pendiente
                  </span>
                )}
              </div>

              <p className="mt-3 text-sm text-muted-foreground">{caso.fundamento}</p>
              {caso.reprobadas.length > 0 ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Asignaturas reprobadas: {caso.reprobadas.join(", ")}
                </p>
              ) : null}

              {caso.resolucion && !caso.resolucion.resolved && puedeResolver ? (
                <p className="mt-4 rounded-control border border-border bg-background px-3 py-2 text-xs text-muted-foreground">
                  Falta: {faltantesDeliberacion(caso.resolucion).join(" ")}
                </p>
              ) : null}

              <div className="mt-5 flex flex-col gap-6">
                <div>
                  <h3 className="text-sm font-semibold">1. Informe del jefe técnico-pedagógico</h3>
                  {caso.resolucion?.utpReport ? (
                    <div className="mt-2">
                      <p className="whitespace-pre-line text-sm">{caso.resolucion.utpReport}</p>
                      {caso.resolucion.utpReportedAt ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Informado el{" "}
                          {new Date(caso.resolucion.utpReportedAt).toLocaleDateString("es-CL")}
                        </p>
                      ) : null}
                      {puedeResolver ? (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-xs text-muted-foreground underline underline-offset-2">
                            Corregir el informe
                          </summary>
                          <div className="mt-2">
                            <UtpReportForm
                              caso={{
                                studentId: caso.studentId,
                                nombre: caso.nombre,
                                year: cursoActual?.year ?? new Date().getFullYear(),
                                excepcionAplica: caso.excepcionAplica,
                              }}
                              valorInicial={caso.resolucion.utpReport}
                            />
                          </div>
                        </details>
                      ) : null}
                    </div>
                  ) : puedeResolver ? (
                    <div className="mt-2">
                      <UtpReportForm
                        caso={{
                          studentId: caso.studentId,
                          nombre: caso.nombre,
                          year: cursoActual?.year ?? new Date().getFullYear(),
                          excepcionAplica: caso.excepcionAplica,
                        }}
                        valorInicial=""
                      />
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-muted-foreground">Todavía no se informó.</p>
                  )}
                </div>

                <div className="border-t border-border pt-5">
                  <h3 className="text-sm font-semibold">
                    2. Audiencia al estudiante y su apoderado
                  </h3>
                  {caso.resolucion?.hearingHeldAt ? (
                    <div className="mt-2">
                      <p className="text-sm">
                        Se realizó el{" "}
                        {new Date(caso.resolucion.hearingHeldAt).toLocaleDateString("es-CL")}
                        {caso.resolucion.hearingNotes ? `: ${caso.resolucion.hearingNotes}` : "."}
                      </p>
                      {puedeResolver ? (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-xs text-muted-foreground underline underline-offset-2">
                            Corregir la audiencia
                          </summary>
                          <div className="mt-2">
                            <HearingForm
                              caso={{
                                studentId: caso.studentId,
                                nombre: caso.nombre,
                                year: cursoActual?.year ?? new Date().getFullYear(),
                                excepcionAplica: caso.excepcionAplica,
                              }}
                              fechaInicial={new Date(caso.resolucion.hearingHeldAt)
                                .toISOString()
                                .slice(0, 10)}
                              notasIniciales={caso.resolucion.hearingNotes ?? ""}
                            />
                          </div>
                        </details>
                      ) : null}
                    </div>
                  ) : puedeResolver ? (
                    <div className="mt-2">
                      <HearingForm
                        caso={{
                          studentId: caso.studentId,
                          nombre: caso.nombre,
                          year: cursoActual?.year ?? new Date().getFullYear(),
                          excepcionAplica: caso.excepcionAplica,
                        }}
                        fechaInicial=""
                        notasIniciales=""
                      />
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-muted-foreground">Todavía no se realizó.</p>
                  )}
                </div>

                <div className="border-t border-border pt-5">
                  <h3 className="text-sm font-semibold">3. Decisión de la dirección con la UTP</h3>
                  {caso.resolucion?.decision ? (
                    <div className="mt-2">
                      <p className="whitespace-pre-line text-sm">{caso.resolucion.decision}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {outcomeLabel(caso.resolucion.outcome)}
                        {caso.resolucion.decidedAt
                          ? ` · resuelto el ${new Date(caso.resolucion.decidedAt).toLocaleDateString("es-CL")}`
                          : "."}
                      </p>
                      {caso.resolucion.attendanceException ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Con excepción de asistencia autorizada:{" "}
                          {caso.resolucion.attendanceExceptionReason}
                        </p>
                      ) : null}
                      {puedeResolver ? (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-xs text-muted-foreground underline underline-offset-2">
                            Corregir la decisión
                          </summary>
                          <div className="mt-2">
                            <DecisionForm
                              caso={{
                                studentId: caso.studentId,
                                nombre: caso.nombre,
                                year: cursoActual?.year ?? new Date().getFullYear(),
                                excepcionAplica: caso.excepcionAplica,
                              }}
                              decisionInicial={caso.resolucion.decision}
                              outcomeInicial={caso.resolucion.outcome}
                              excepcionActual={caso.resolucion.attendanceException}
                              razonExcepcion={caso.resolucion.attendanceExceptionReason ?? ""}
                            />
                          </div>
                        </details>
                      ) : null}
                    </div>
                  ) : puedeResolver ? (
                    <div className="mt-2">
                      <DecisionForm
                        caso={{
                          studentId: caso.studentId,
                          nombre: caso.nombre,
                          year: cursoActual?.year ?? new Date().getFullYear(),
                          excepcionAplica: caso.excepcionAplica,
                        }}
                        decisionInicial=""
                        outcomeInicial=""
                        excepcionActual={false}
                        razonExcepcion=""
                      />
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-muted-foreground">Todavía no se resolvió.</p>
                  )}
                </div>

                {caso.excepcionAplica ? (
                  <div className="border-t border-border pt-5">
                    <h3 className="text-sm font-semibold">
                      Excepción al 85% de asistencia (Art. 10.2)
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      La dirección y la UTP pueden autorizar la promoción cuando la asistencia es
                      menor al mínimo, con fundamento. Es aparte de la decisión.
                    </p>
                    {puedeResolver ? (
                      <div className="mt-2">
                        <AttendanceExceptionForm
                          caso={{
                            studentId: caso.studentId,
                            nombre: caso.nombre,
                            year: cursoActual?.year ?? new Date().getFullYear(),
                            excepcionAplica: caso.excepcionAplica,
                          }}
                          excepcionActual={caso.resolucion?.attendanceException ?? false}
                          razonActual={caso.resolucion?.attendanceExceptionReason ?? ""}
                        />
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
