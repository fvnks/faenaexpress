import Link from "next/link";
import { notFound } from "next/navigation";

import {
  AddActionForm,
  CloseCaseForm,
  CompleteActionButton,
} from "@/app/colegios/convivencia/convivencia-forms";
import { db } from "@/lib/db";
import { requireSchoolContext, schoolCanWrite } from "@/lib/school-auth";
import { casosConEstado } from "@/lib/school-convivencia";
import { TIPOS_ACCION } from "@/lib/school-convivencia-rules";
import { cardClass } from "@/lib/ui";

/** El caso de convivencia y su seguimiento etapa por etapa. */
export default async function CasoPage({
  params,
}: PageProps<"/colegios/convivencia/casos/[id]">) {
  const ctx = await requireSchoolContext("convivencia");
  const { id } = await params;
  const puedeGestionar = schoolCanWrite(ctx, "convivencia");

  const casos = await casosConEstado(ctx.school.id);
  const caso = casos.find((c) => c.id === id);
  if (!caso) notFound();

  const acciones = await db.conductAction.findMany({
    where: { caseId: id },
    orderBy: [{ doneAt: "asc" }, { dueAt: "asc" }, { createdAt: "asc" }],
  });

  const hoy = new Date();
  const cerrado = caso.status === "CERRADO" || caso.status === "RESUELTO";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/colegios/convivencia"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Convivencia
        </Link>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">{caso.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {caso.tipo} · {caso.estado} ·{" "}
          {caso.severity === "GRAVE" ? "grave" : caso.severity === "MEDIA" ? "media" : "leve"}
        </p>
      </div>

      <section className={cardClass + " p-5"}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-semibold">El caso</h2>
          <p className="text-sm">
            {caso.urgencia === "vencido" ? (
              <span className="font-semibold text-danger">
                La investigación venció hace {Math.abs(caso.diasRestantes)} días
              </span>
            ) : cerrado ? (
              <span className="text-muted-foreground">Investigación terminada</span>
            ) : (
              <span className="text-muted-foreground">
                Quedan {caso.diasRestantes} días para investigar (la ley da 60)
              </span>
            )}
          </p>
        </div>

        <p className="mt-3 text-sm">{caso.description}</p>

        {caso.alumnos.length > 0 ? (
          <ul className="mt-4 flex flex-wrap gap-2">
            {caso.alumnos.map((a) => (
              <li
                key={a.id}
                className="rounded-control border border-border px-2.5 py-1 text-xs"
              >
                {a.nombre}
                <span className="ml-1 text-muted-foreground">
                  {a.rol === "DENUNCIADO"
                    ? "denunciado"
                    : a.rol === "DENUNCIANTE"
                      ? "denunciante"
                      : a.rol === "TESTIGO"
                        ? "testigo"
                        : "afectado"}
                </span>
              </li>
            ))}
          </ul>
        ) : null}

        <p className="mt-4 text-xs text-muted-foreground">
          Reportado el {caso.reportedAt.toLocaleDateString("es-CL")}.
        </p>
      </section>

      <section className={cardClass + " p-5"}>
        <h2 className="font-semibold">Etapas</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Cada etapa con su plazo y su resultado. Las que se atrasaron son las que el colegio tiene
          que recuperar.
        </p>

        {acciones.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Todavía no hay etapas.</p>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {acciones.map((a) => {
              const vencida = a.dueAt && a.dueAt < hoy && !a.doneAt;
              return (
                <li key={a.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      {a.title}
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        {TIPOS_ACCION[a.type] ?? a.type}
                      </span>
                    </p>
                    {a.notes ? (
                      <p className="mt-0.5 text-xs text-muted-foreground">{a.notes}</p>
                    ) : null}
                    {a.outcome ? (
                      <p className="mt-0.5 text-xs">Resultado: {a.outcome}</p>
                    ) : null}
                    {a.responsible ? (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        A cargo de {a.responsible}
                      </p>
                    ) : null}
                  </div>
                  <span className="flex items-center gap-3 text-xs">
                    {a.doneAt ? (
                      <span className="text-success">
                        Hecha el {a.doneAt.toLocaleDateString("es-CL")}
                      </span>
                    ) : vencida ? (
                      <span className="font-semibold text-danger">Vencida</span>
                    ) : a.dueAt ? (
                      <span className="text-muted-foreground">
                        Vence {a.dueAt.toLocaleDateString("es-CL")}
                      </span>
                    ) : null}
                    {!a.doneAt && puedeGestionar ? (
                      <CompleteActionButton actionId={a.id} caseId={caso.id} />
                    ) : null}
                  </span>
                </li>
              );
            })}
          </ul>
        )}

        {!cerrado && puedeGestionar ? (
          <div className="mt-4">
            <AddActionForm caseId={caso.id} />
          </div>
        ) : null}
      </section>

      {caso.resolution ? (
        <section className={cardClass + " p-5"}>
          <h2 className="font-semibold">Cómo se resolvió</h2>
          <p className="mt-2 text-sm">{caso.resolution}</p>
          {caso.commissionReport ? (
            <>
              <h3 className="mt-4 text-sm font-medium">Informe de la comisión</h3>
              <p className="mt-1 text-sm text-muted-foreground">{caso.commissionReport}</p>
            </>
          ) : null}
        </section>
      ) : null}

      {!cerrado && puedeGestionar ? (
        <section className={cardClass + " p-5"}>
          <h2 className="font-semibold">Cerrar el caso</h2>
          <div className="mt-3">
            <CloseCaseForm caseId={caso.id} />
          </div>
        </section>
      ) : null}
    </div>
  );
}
