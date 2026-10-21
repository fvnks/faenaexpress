import Link from "next/link";

import {
  ApprovePlanButton,
  CompletePlanActivityButton,
  PlanActivityForm,
  PlanForm,
} from "@/app/colegios/convivencia/plan/plan-forms";
import { requireSchoolContext, schoolCanWrite } from "@/lib/school-auth";
import { planDeConvivencia } from "@/lib/school-convivencia";
import { cardClass } from "@/lib/ui";

/**
 * El Plan de Gestión de la Convivencia Escolar.
 *
 * La Ley 21.809 lo vuelve obligatorio: tiene que existir, aprobarse, entregarse
 * copia a las familias (con constancia) y revisarse con la comunidad cada 4
 * años. El sistema guarda el plan, sus acciones y las dos fechas que la ley
 * importa: la de revisión y la de entrega.
 */
export default async function PlanPage({
  searchParams,
}: PageProps<"/colegios/convivencia/plan">) {
  const ctx = await requireSchoolContext("convivencia");
  const params = await searchParams;
  const puedeEditar = schoolCanWrite(ctx, "convivencia");

  const anio = Number(params.anio ?? new Date().getFullYear());
  const plan = await planDeConvivencia(ctx.school.id, anio);
  const objetivos = plan
    ? ((plan.objectives as { texto?: string } | null)?.texto ?? "")
    : "";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/colegios/convivencia"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Convivencia
        </Link>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">
          Plan de Gestión de la Convivencia
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {anio} · obligatorio por la Ley 21.809, con revisión participativa cada 4 años y copia
          entregada a las familias.
        </p>
      </div>

      {!plan ? (
        <section className={cardClass + " p-5"}>
          <p className="text-sm text-muted-foreground">
            Este colegio todavía no tiene plan de gestión para {anio}.
          </p>
          {puedeEditar ? (
            <div className="mt-3">
              <PlanForm year={anio} />
            </div>
          ) : null}
        </section>
      ) : (
        <>
          <section className={cardClass + " p-5"}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-semibold">Objetivos</h2>
              <span className="text-xs text-muted-foreground">
                {plan.status === "VIGENTE" ? "Vigente" : plan.status === "APROBADO" ? "Aprobado" : "Borrador"}
              </span>
            </div>
            <p className="mt-2 whitespace-pre-line text-sm">{objetivos}</p>

            <div className="mt-4 flex flex-wrap gap-6 text-sm">
              <p>
                <span className="text-muted-foreground">Revisión participativa: </span>
                {plan.reviewDueAt
                  ? plan.reviewDueAt.toLocaleDateString("es-CL")
                  : "sin fecha"}
                {plan.revisionVencida ? (
                  <span className="ml-1 font-semibold text-accent">· vencida</span>
                ) : null}
              </p>
              <p>
                <span className="text-muted-foreground">Entregado a las familias: </span>
                {plan.deliveredAt ? plan.deliveredAt.toLocaleDateString("es-CL") : "sin constancia"}
              </p>
            </div>

            {puedeEditar ? (
              <div className="mt-4 flex flex-col gap-3">
                <PlanForm
                  planId={plan.id}
                  year={plan.year}
                  objectives={objetivos}
                />
                {plan.status !== "VIGENTE" ? (
                  <ApprovePlanButton planId={plan.id} />
                ) : null}
              </div>
            ) : null}
          </section>

          <section className={cardClass + " p-5"}>
            <h2 className="font-semibold">Acciones del plan</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Las áreas son las que la ley menciona: participación, igualdad, resolución pacífica,
              mediación, cuidados y responsabilidades digitales, desarrollo socioemocional y salud
              mental.
            </p>

            {plan.areas.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                Todavía no hay acciones en el plan.
              </p>
            ) : (
              <ul className="mt-4 divide-y divide-border">
                {plan.areas.map((a) => (
                  <li key={a.id} className="flex flex-wrap items-start justify-between gap-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{a.name}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {a.area}
                        {a.responsible ? ` · ${a.responsible}` : ""}
                        {a.dueAt ? ` · vence ${a.dueAt.toLocaleDateString("es-CL")}` : ""}
                      </p>
                    </div>
                    <span className="flex items-center gap-3 text-xs">
                      {a.doneAt ? (
                        <span className="text-success">Hecha</span>
                      ) : a.vencida ? (
                        <span className="font-semibold text-accent">Vencida</span>
                      ) : null}
                      {!a.doneAt && puedeEditar ? (
                        <CompletePlanActivityButton activityId={a.id} planId={plan.id} />
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {puedeEditar ? (
              <div className="mt-4">
                <PlanActivityForm planId={plan.id} />
              </div>
            ) : null}
          </section>
        </>
      )}
    </div>
  );
}
