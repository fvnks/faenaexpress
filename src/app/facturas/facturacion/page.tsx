import Link from "next/link";

import { Alert } from "@/components/alert";
import { requireOrgManager } from "@/lib/auth";
import { db } from "@/lib/db";
import { subscriptionStatusLabel } from "@/lib/labels";
import { formatCLP } from "@/lib/money";
import { organizationModuleStates } from "@/lib/org-module-state";
import { subscriptionFor, usageFor } from "@/lib/plans";
import { cardClass } from "@/lib/ui";

// La pantalla de facturación del cliente: qué plan tiene, cuánto lleva usado y
// qué límites tiene. La UI queda completa desde el día uno, aunque la maqueta
// no tenga topes: así, cuando haya precio, no hay que inventar nada.
export default async function FacturacionPage() {
  const org = await requireOrgManager();
  const [subscription, usage, states, empresas] = await Promise.all([
    subscriptionFor(org.organization.id),
    usageFor(org.organization.id),
    organizationModuleStates(org.organization.id),
    db.company.count({ where: { organizationId: org.organization.id } }),
  ]);

  const plan = subscription?.plan ?? null;
  const modulosExtra = states.filter((s) => !s.module.core);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Plan y facturación</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tu plan, lo que incluye y cuánto llevas usado este mes.
        </p>
      </div>

      {!subscription ? (
        <p className={cardClass + " px-4 py-6 text-sm text-muted-foreground"}>
          Tu cuenta todavía no tiene un plan asignado. Escríbenos y lo dejamos andando.
        </p>
      ) : (
        <>
          {subscription.status !== "ACTIVE" ? (
            <Alert
              variant={subscription.status === "TRIAL" ? "info" : "warning"}
              title={
                subscription.status === "TRIAL"
                  ? "Tu cuenta está en período de prueba"
                  : subscription.status === "PAST_DUE"
                    ? "Hay un pago pendiente"
                    : "Tu plan está cancelado"
              }
            >
              Tus datos se conservan siempre. Si necesitas algo, escríbenos y lo vemos.
            </Alert>
          ) : null}

          <section className={cardClass + " p-5"}>
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">{plan?.name}</h2>
                <p className="text-sm text-muted-foreground">
                  {plan?.description ?? "Sin descripción."}
                </p>
              </div>
              <div className="text-right">
                <p className="tabular text-lg font-semibold">
                  {plan ? formatCLP(plan.priceCLP) : "—"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {plan?.period === "YEARLY" ? "por año" : "por mes"}
                </p>
              </div>
            </div>

            <p className="mt-2 text-sm text-muted-foreground">
              Estado: {subscriptionStatusLabel(subscription.status)}
              {subscription.trialEndsAt
                ? ` · la prueba termina el ${subscription.trialEndsAt.toLocaleDateString("es-CL")}`
                : ""}
            </p>
          </section>

          <section className={cardClass + " p-5"}>
            <h2 className="font-semibold">Uso de este mes</h2>
            <dl className="mt-3 grid gap-4 sm:grid-cols-3">
              <div>
                <dt className="text-xs text-muted-foreground">Documentos</dt>
                <dd className="tabular text-lg font-semibold">
                  {usage.documentsCreated}
                  {plan?.maxDocsPerMonth ? (
                    <span className="text-sm font-normal text-muted-foreground">
                      {" "}
                      de {plan.maxDocsPerMonth}
                    </span>
                  ) : (
                    <span className="text-sm font-normal text-muted-foreground"> sin tope</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Usuarios</dt>
                <dd className="tabular text-lg font-semibold">
                  {usage.activeUsers}
                  {plan?.maxUsers ? (
                    <span className="text-sm font-normal text-muted-foreground">
                      {" "}
                      de {plan.maxUsers}
                    </span>
                  ) : (
                    <span className="text-sm font-normal text-muted-foreground"> sin tope</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Empresas</dt>
                <dd className="tabular text-lg font-semibold">
                  {empresas}
                  {plan?.maxCompanies ? (
                    <span className="text-sm font-normal text-muted-foreground">
                      {" "}
                      de {plan.maxCompanies}
                    </span>
                  ) : (
                    <span className="text-sm font-normal text-muted-foreground"> sin tope</span>
                  )}
                </dd>
              </div>
            </dl>
            <p className="mt-3 text-xs text-muted-foreground">
              El uso se reinicia el primer día de cada mes.
            </p>
          </section>

          <section className={cardClass + " p-5"}>
            <h2 className="font-semibold">Módulos incluidos</h2>
            <ul className="mt-3 divide-y divide-border">
              {modulosExtra.map((s) => (
                <li key={s.module.code} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                  <div>
                    <p className="text-sm font-medium">{s.module.name}</p>
                    <p className="text-xs text-muted-foreground">{s.module.description}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {s.source === "plan" ? "incluido en el plan" : s.source === "manual" ? "activado para tu cuenta" : "activo"}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <p className="text-sm text-muted-foreground">
            ¿Necesitas otro plan o más límites?{" "}
            <Link href="/facturas/organizacion" className="text-primary underline underline-offset-2">
              Escríbenos por acá
            </Link>
            .
          </p>
        </>
      )}
    </div>
  );
}
