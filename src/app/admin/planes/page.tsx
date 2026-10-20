import { PlanForm } from "@/app/admin/planes/plan-form";
import { formatCLP } from "@/lib/money";
import { requirePlatformStaff } from "@/lib/platform";
import { listPlans } from "@/lib/plans";
import { cardClass } from "@/lib/ui";

// Catálogo de planes: lo que vendes. Se edita acá mismo; el cliente solo ve el
// plan que tiene contratado.
export default async function AdminPlansPage() {
  await requirePlatformStaff("SUPPORT");
  const plans = await listPlans();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Planes</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          El catálogo: los planes que se pueden contratar. Los límites en blanco
          significan «sin tope».
        </p>
      </div>

      {plans.length === 0 ? (
        <section className={cardClass + " p-5"}>
          <h2 className="font-semibold">Crear el primer plan</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Sin planes, todas las cuentas están sin suscripción y no hay ningún
            límite que aplicar.
          </p>
          <div className="mt-4">
            <PlanForm />
          </div>
        </section>
      ) : (
        plans.map((plan) => (
          <section key={plan.id} className={cardClass + " p-5"}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold">
                  {plan.name}{" "}
                  <span className="text-sm font-normal text-muted-foreground">
                    ({plan.code})
                  </span>
                  {!plan.active ? (
                    <span className="ml-2 rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
                      inactivo
                    </span>
                  ) : null}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {plan.description ?? "Sin descripción."}
                </p>
                <p className="tabular mt-1 text-sm">
                  {formatCLP(plan.priceCLP)} / {plan.period === "YEARLY" ? "año" : "mes"}
                </p>
              </div>
              <PlanForm plan={plan} />
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-xs text-muted-foreground">Empresas</dt>
                <dd className="tabular">{plan.maxCompanies ?? "sin tope"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Usuarios</dt>
                <dd className="tabular">{plan.maxUsers ?? "sin tope"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Documentos/mes</dt>
                <dd className="tabular">{plan.maxDocsPerMonth ?? "sin tope"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Cuentas con este plan</dt>
                <dd className="tabular">{plan._count.subscriptions}</dd>
              </div>
            </dl>

            {plan.modules.length > 0 ? (
              <p className="mt-3 text-xs text-muted-foreground">
                Módulos incluidos: {plan.modules.join(", ")}
              </p>
            ) : (
              <p className="mt-3 text-xs text-muted-foreground">
                Sin módulos extra: solo el núcleo del producto.
              </p>
            )}
          </section>
        ))
      )}
    </div>
  );
}
