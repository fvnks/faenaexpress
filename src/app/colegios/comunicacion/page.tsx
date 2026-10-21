import {
  AppointmentForm,
  CircularForm,
  DeleteCircularButton,
  ResolveJustificationButton,
} from "@/app/colegios/comunicacion/communication-forms";
import { db } from "@/lib/db";
import { requireSchoolContext, schoolCanWrite } from "@/lib/school-auth";
import { bandejaPendientes, circularesConAcuses } from "@/lib/school-communication";
import { cardClass } from "@/lib/ui";

/**
 * Comunicación: circulares, bandeja de pendientes y citaciones.
 *
 * Es el lado del colegio de la C4. Lo que se publica acá es lo que la familia
 * ve en el portal, y lo que queda acá es lo que la secretaría tiene que
 * responder: las justificaciones que propuso una familia y las citaciones que
 * están sin confirmar.
 */
export default async function ComunicacionPage() {
  const ctx = await requireSchoolContext("comunicacion");
  const schoolId = ctx.school.id;
  const puedeEditar = schoolCanWrite(ctx, "comunicacion");

  const [circulares, bandeja, cursos, familias, alumnos] = await Promise.all([
    circularesConAcuses(schoolId),
    bandejaPendientes(schoolId),
    db.course.findMany({
      where: { schoolId, active: true },
      orderBy: [{ year: "desc" }, { name: "asc" }],
      select: { id: true, name: true, year: true },
    }),
    db.guardian.findMany({
      where: { schoolId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    db.student.findMany({
      where: { schoolId },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: { id: true, firstName: true, lastName: true },
    }),
  ]);

  const pendientesTotal =
    bandeja.justificaciones.length + bandeja.citas.length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Comunicación</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Las circulares que llegan al portal de las familias, y lo que te esperan a vos.
        </p>
      </div>

      {puedeEditar ? (
        <section className={cardClass + " p-5"}>
          <div className="flex flex-wrap items-start gap-6">
            <CircularForm
              cursos={cursos.map((c) => ({ id: c.id, nombre: `${c.name} · ${c.year}` }))}
              familias={familias.map((g) => ({ id: g.id, nombre: g.name }))}
            />
            <AppointmentForm
              alumnos={alumnos.map((a) => ({
                id: a.id,
                nombre: `${a.firstName} ${a.lastName}`,
              }))}
              familias={familias.map((g) => ({ id: g.id, nombre: g.name }))}
            />
          </div>
        </section>
      ) : null}

      <section className={cardClass + " p-5"}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-semibold">Tu bandeja</h2>
          <p className="text-sm text-muted-foreground">
            {pendientesTotal === 0
              ? "Nada pendiente."
              : `${pendientesTotal} ${pendientesTotal === 1 ? "cosa" : "cosas"} esperando respuesta.`}
          </p>
        </div>

        {pendientesTotal === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Cuando una familia proponga justificar una inasistencia, o cuando tenga que confirmar
            una citación, aparece acá.
          </p>
        ) : (
          <div className="mt-4 flex flex-col gap-6">
            {bandeja.justificaciones.length > 0 ? (
              <div>
                <h3 className="text-sm font-medium">
                  Justificaciones de inasistencia ({bandeja.justificaciones.length})
                </h3>
                <ul className="mt-2 divide-y divide-border">
                  {bandeja.justificaciones.map((j) => (
                    <li key={j.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">
                          {j.student.firstName} {j.student.lastName} ·{" "}
                          {j.session.subject.name}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {j.session.date.toLocaleDateString("es-CL")} · motivo: {j.reason}
                          {j.note ? ` · ${j.note}` : ""}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Lo propuso {j.guardian.name} el{" "}
                          {j.requestedAt.toLocaleDateString("es-CL")}
                        </p>
                      </div>
                      {puedeEditar ? <ResolveJustificationButton requestId={j.id} /> : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {bandeja.citas.length > 0 ? (
              <div>
                <h3 className="text-sm font-medium">
                  Citaciones por confirmar ({bandeja.citas.length})
                </h3>
                <ul className="mt-2 divide-y divide-border">
                  {bandeja.citas.map((c) => (
                    <li key={c.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{c.title}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {c.student.firstName} {c.student.lastName} ·{" "}
                          {c.scheduledAt.toLocaleString("es-CL", {
                            day: "2-digit",
                            month: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                          {c.guardian ? ` · ${c.guardian.name}` : ""}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        )}
      </section>

      <section className={cardClass + " p-5"}>
        <h2 className="font-semibold">Circulares</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Cada circular lleva el acuse de lectura de las familias. Lo que no se leyó es lo que
          hay que ir a buscar por otro lado.
        </p>

        {circulares.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Todavía no se publicó ninguna circular.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {circulares.map((c) => (
              <li key={c.id} className="py-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-medium">{c.title}</p>
                  <span className="text-xs text-muted-foreground">
                    {c.publishedAt.toLocaleDateString("es-CL")} ·{" "}
                    {c.audience === "COLEGIO"
                      ? "todo el colegio"
                      : c.audience === "CURSO"
                        ? `curso ${c.curso ?? ""}`
                        : `familia ${c.familia ?? ""}`}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{c.body}</p>
                <div className="mt-2 flex flex-wrap items-center gap-4">
                  <span className="text-xs">
                    <span className="font-semibold text-success">{c.leidas}</span> leída
                    {c.destinatarios - c.leidas > 0 ? (
                      <>
                        {" · "}
                        <span className="font-semibold text-accent">
                          {c.destinatarios - c.leidas}
                        </span>{" "}
                        sin leer
                      </>
                    ) : null}
                  </span>
                  {c.pendientes.length > 0 ? (
                    <details className="text-xs">
                      <summary className="cursor-pointer text-muted-foreground underline underline-offset-2">
                        Quién no lo leyó
                      </summary>
                      <ul className="mt-1 list-disc pl-4 text-muted-foreground">
                        {c.pendientes.map((g) => (
                          <li key={g.id}>{g.name}</li>
                        ))}
                      </ul>
                    </details>
                  ) : null}
                  {puedeEditar ? <DeleteCircularButton circularId={c.id} /> : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
