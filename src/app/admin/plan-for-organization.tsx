"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import { changeOrganizationPlan, type PlatformActionState } from "@/app/actions/platform";
import { SubmitButton } from "@/components/submit-button";
import { controlClass, labelClass, secondaryButtonClass } from "@/lib/ui";

// El plan de una cuenta. Cambiarlo libera el mismo día: el corte se
// recalcula al instante, sin esperar a nada.
export function PlanForOrganizationForm({
  organizationId,
  plans,
  currentPlanId,
  currentStatus,
}: {
  organizationId: string;
  plans: { id: string; name: string; priceCLP: number }[];
  currentPlanId: string | null;
  currentStatus: string | null;
}) {
  const [state, action, pending] = useActionState<PlatformActionState, FormData>(
    changeOrganizationPlan,
    undefined,
  );

  useEffect(() => {
    if (state?.ok) toast.success("Plan actualizado");
  }, [state]);

  if (plans.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No hay planes en el catálogo. Crea uno en Planes para poder asignarlo.
      </p>
    );
  }

  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="organizationId" value={organizationId} />
      <div className="min-w-48">
        <label htmlFor="org-plan" className={labelClass}>
          Plan
        </label>
        <select
          id="org-plan"
          name="planId"
          defaultValue={currentPlanId ?? plans[0].id}
          className={controlClass}
        >
          {plans.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
      <div className="min-w-40">
        <label htmlFor="org-plan-status" className={labelClass}>
          Estado
        </label>
        <select
          id="org-plan-status"
          name="status"
          defaultValue={currentStatus ?? "ACTIVE"}
          className={controlClass}
        >
          <option value="ACTIVE">Al día</option>
          <option value="TRIAL">En prueba</option>
          <option value="PAST_DUE">Pago pendiente</option>
          <option value="CANCELED">Cancelado</option>
        </select>
      </div>
      <SubmitButton className={secondaryButtonClass} pendingLabel="Guardando...">
        Aplicar plan
      </SubmitButton>
      {state?.error ? <p className="w-full text-sm text-danger">{state.error}</p> : null}
      <span className="sr-only" aria-live="polite">
        {pending ? "Guardando" : ""}
      </span>
    </form>
  );
}
