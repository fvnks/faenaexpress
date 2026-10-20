"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";

import { savePlan, type PlatformActionState } from "@/app/actions/platform";
import { SubmitButton } from "@/components/submit-button";
import { ORG_MODULES } from "@/lib/org-modules";
import { controlClass, labelClass, secondaryButtonClass } from "@/lib/ui";

export type PlanForForm = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  priceCLP: number;
  period: string;
  maxCompanies: number | null;
  maxUsers: number | null;
  maxDocsPerMonth: number | null;
  modules: string[];
  active: boolean;
};

// Formulario de un plan. Los límites en blanco significan «sin tope»: es la
// maqueta, donde nada bloquea a nadie hasta que haya un número real.
export function PlanForm({ plan }: { plan?: PlanForForm }) {
  const [state, action, pending] = useActionState<PlatformActionState, FormData>(
    savePlan,
    undefined,
  );
  const [open, setOpen] = useState(!plan);

  useEffect(() => {
    if (state?.ok) toast.success(plan ? "Plan actualizado" : "Plan creado");
  }, [state, plan]);

  if (plan && !open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={secondaryButtonClass + " py-1.5 text-sm"}
      >
        Editar
      </button>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      {plan ? <input type="hidden" name="planId" value={plan.id} /> : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor={`plan-code-${plan?.id ?? "nuevo"}`} className={labelClass}>
            Código
          </label>
          <input
            id={`plan-code-${plan?.id ?? "nuevo"}`}
            name="code"
            type="text"
            required
            defaultValue={plan?.code ?? ""}
            placeholder="pro"
            className={controlClass}
          />
        </div>
        <div>
          <label htmlFor={`plan-name-${plan?.id ?? "nuevo"}`} className={labelClass}>
            Nombre
          </label>
          <input
            id={`plan-name-${plan?.id ?? "nuevo"}`}
            name="name"
            type="text"
            required
            defaultValue={plan?.name ?? ""}
            placeholder="Pro"
            className={controlClass}
          />
        </div>
        <div>
          <label htmlFor={`plan-price-${plan?.id ?? "nuevo"}`} className={labelClass}>
            Precio (CLP)
          </label>
          <input
            id={`plan-price-${plan?.id ?? "nuevo"}`}
            name="priceCLP"
            type="number"
            min={0}
            step={1000}
            defaultValue={plan?.priceCLP ?? 0}
            className={controlClass}
          />
        </div>
        <div>
          <label htmlFor={`plan-period-${plan?.id ?? "nuevo"}`} className={labelClass}>
            Período
          </label>
          <select
            id={`plan-period-${plan?.id ?? "nuevo"}`}
            name="period"
            defaultValue={plan?.period ?? "MONTHLY"}
            className={controlClass}
          >
            <option value="MONTHLY">Mensual</option>
            <option value="YEARLY">Anual</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label htmlFor={`plan-desc-${plan?.id ?? "nuevo"}`} className={labelClass}>
            Descripción
          </label>
          <input
            id={`plan-desc-${plan?.id ?? "nuevo"}`}
            name="description"
            type="text"
            defaultValue={plan?.description ?? ""}
            placeholder="Para empresas que necesitan más de una empresa"
            className={controlClass}
          />
        </div>
      </div>

      <fieldset>
        <legend className={labelClass}>Límites</legend>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Déjalo vacío para «sin tope». En blanco, la maqueta no bloquea a nadie.
        </p>
        <div className="mt-2 grid gap-3 sm:grid-cols-3">
          <div>
            <label htmlFor={`plan-companies-${plan?.id ?? "nuevo"}`} className="text-sm">
              Empresas
            </label>
            <input
              id={`plan-companies-${plan?.id ?? "nuevo"}`}
              name="maxCompanies"
              type="number"
              min={1}
              defaultValue={plan?.maxCompanies ?? ""}
              placeholder="sin tope"
              className={controlClass}
            />
          </div>
          <div>
            <label htmlFor={`plan-users-${plan?.id ?? "nuevo"}`} className="text-sm">
              Usuarios
            </label>
            <input
              id={`plan-users-${plan?.id ?? "nuevo"}`}
              name="maxUsers"
              type="number"
              min={1}
              defaultValue={plan?.maxUsers ?? ""}
              placeholder="sin tope"
              className={controlClass}
            />
          </div>
          <div>
            <label htmlFor={`plan-docs-${plan?.id ?? "nuevo"}`} className="text-sm">
              Documentos por mes
            </label>
            <input
              id={`plan-docs-${plan?.id ?? "nuevo"}`}
              name="maxDocsPerMonth"
              type="number"
              min={1}
              defaultValue={plan?.maxDocsPerMonth ?? ""}
              placeholder="sin tope"
              className={controlClass}
            />
          </div>
        </div>
      </fieldset>

      <fieldset>
        <legend className={labelClass}>Módulos incluidos</legend>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Lo que el plan incluye. Un módulo que se venda suelto se activa a mano
          en la cuenta y el plan no lo pisa.
        </p>
        <ul className="mt-2 flex flex-col gap-1.5">
          {ORG_MODULES.map((m) => (
            <li key={m.code} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name={`modulo:${m.code}`}
                defaultChecked={plan?.modules.includes(m.code) ?? true}
                className="h-4 w-4"
                id={`plan-mod-${m.code}-${plan?.id ?? "nuevo"}`}
              />
              <label htmlFor={`plan-mod-${m.code}-${plan?.id ?? "nuevo"}`}>{m.name}</label>
            </li>
          ))}
        </ul>
      </fieldset>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="active"
          value="true"
          defaultChecked={plan?.active ?? true}
          className="h-4 w-4"
        />
        Plan activo (se puede contratar)
      </label>

      {state?.error ? <p className="text-sm text-danger">{state.error}</p> : null}

      <div className="flex items-center gap-2">
        <SubmitButton className={secondaryButtonClass} pendingLabel="Guardando...">
          {plan ? "Guardar plan" : "Crear plan"}
        </SubmitButton>
        {plan ? (
          <button
            type="button"
            onClick={() => setOpen(false)}
            className={secondaryButtonClass + " py-2"}
          >
            Cancelar
          </button>
        ) : null}
      </div>
      <span className="sr-only" aria-live="polite">
        {pending ? "Guardando" : ""}
      </span>
    </form>
  );
}
