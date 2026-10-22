"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";

import {
  addPlanActivity,
  approvePlan,
  completePlanActivity,
  savePlan,
  type ConvivenciaFormState,
} from "@/app/actions/school-convivencia";
import { SubmitButton } from "@/components/submit-button";
import { controlClass, fieldClass, labelClass } from "@/lib/ui";
import { AREAS_PLAN } from "@/lib/school-convivencia-rules";

/** Los objetivos del plan. */
export function PlanForm({
  planId,
  year,
  objectives,
}: {
  planId?: string;
  year: number;
  objectives?: string;
}) {
  const [state, action] = useActionState<ConvivenciaFormState, FormData>(
    savePlan,
    undefined,
  );
  const panel = useRef<HTMLDetailsElement>(null);
  const form = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state?.ok) return;
    toast.success("Plan guardado");
    if (panel.current) panel.current.open = false;
    form.current?.reset();
  }, [state]);

  return (
    <details ref={panel} className="w-full max-w-2xl">
      <summary className="cursor-pointer text-sm font-semibold text-primary">
        {planId ? "Editar los objetivos" : "Crear el plan del año"}
      </summary>

      <form ref={form} action={action} className="mt-3 flex flex-col gap-3">
        {planId ? <input type="hidden" name="planId" value={planId} /> : null}

        <div className={fieldClass}>
          <label htmlFor="planYear" className={labelClass}>
            Año
          </label>
          <input
            id="planYear"
            name="year"
            type="number"
            min={2000}
            max={2100}
            defaultValue={year}
            className={controlClass + " tabular"}
          />
        </div>

        <div className={fieldClass}>
          <label htmlFor="planObjectives" className={labelClass}>
            Objetivos
          </label>
          <textarea
            id="planObjectives"
            name="objectives"
            rows={5}
            required
            defaultValue={objectives ?? ""}
            className={controlClass}
          />
        </div>

        {state?.error ? <p className="text-sm text-danger">{state.error}</p> : null}

        <SubmitButton
          className="self-start rounded-control border border-primary bg-transparent px-3 py-1.5 text-sm font-semibold text-primary"
          pendingLabel="Guardando..."
        >
          Guardar
        </SubmitButton>
      </form>
    </details>
  );
}

/** Agrega una acción al plan. */
export function PlanActivityForm({ planId }: { planId: string }) {
  const [state, action] = useActionState<ConvivenciaFormState, FormData>(
    addPlanActivity,
    undefined,
  );
  const panel = useRef<HTMLDetailsElement>(null);
  const form = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state?.ok) return;
    toast.success("Acción agregada");
    if (panel.current) panel.current.open = false;
    form.current?.reset();
  }, [state]);

  return (
    <details ref={panel} className="w-full max-w-2xl">
      <summary className="cursor-pointer text-sm font-semibold text-primary">
        Agregar una acción
      </summary>

      <form ref={form} action={action} className="mt-3 flex flex-col gap-3">
        <input type="hidden" name="planId" value={planId} />

        <div className="grid gap-3 sm:grid-cols-2">
          <div className={fieldClass}>
            <label htmlFor={`planActivityName-${planId}`} className={labelClass}>
              Acción
            </label>
            <input
              id={`planActivityName-${planId}`}
              name="name"
              type="text"
              required
              placeholder="Taller de resolución pacífica de conflictos"
              className={controlClass}
            />
          </div>
          <div className={fieldClass}>
            <label htmlFor={`planActivityArea-${planId}`} className={labelClass}>
              Área
            </label>
            <select
              id={`planActivityArea-${planId}`}
              name="area"
              className={controlClass}
              defaultValue="PARTICIPACION"
            >
              {Object.entries(AREAS_PLAN).map(([valor, etiqueta]) => (
                <option key={valor} value={valor}>
                  {etiqueta}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className={fieldClass}>
            <label htmlFor={`planActivityResponsible-${planId}`} className={labelClass}>
              Responsable
            </label>
            <input
              id={`planActivityResponsible-${planId}`}
              name="responsible"
              type="text"
              className={controlClass}
            />
          </div>
          <div className={fieldClass}>
            <label htmlFor={`planActivityDue-${planId}`} className={labelClass}>
              Plazo (opcional)
            </label>
            <input
              id={`planActivityDue-${planId}`}
              name="dueAt"
              type="text"
              data-date="1"
              pattern="^\d{2}-\d{2}(-\d{4})?$"
              placeholder="DD-MM-AAAA"
              className={controlClass}
            />
          </div>
        </div>

        {state?.error ? <p className="text-sm text-danger">{state.error}</p> : null}

        <SubmitButton
          className="self-start rounded-control border border-primary bg-transparent px-3 py-1.5 text-sm font-semibold text-primary"
          pendingLabel="Guardando..."
        >
          Agregar
        </SubmitButton>
      </form>
    </details>
  );
}

/** Marca una acción del plan como hecha. */
export function CompletePlanActivityButton({
  activityId,
  planId,
}: {
  activityId: string;
  planId: string;
}) {
  const [state, action] = useActionState<ConvivenciaFormState, FormData>(
    completePlanActivity,
    undefined,
  );

  useEffect(() => {
    if (state?.ok) toast.success("Acción marcada como hecha");
  }, [state]);

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <form action={action} className="inline">
        <input type="hidden" name="activityId" value={activityId} />
        <input type="hidden" name="planId" value={planId} />
        <button
          type="submit"
          className="text-xs text-muted-foreground underline underline-offset-2 hover:text-primary"
        >
          Marcar como hecha
        </button>
      </form>
      {state?.error ? <span className="text-xs text-danger">{state.error}</span> : null}
    </span>
  );
}

/** Aprueba el plan y deja constancia de que se entregó a las familias. */
export function ApprovePlanButton({ planId }: { planId: string }) {
  const [state, action] = useActionState<ConvivenciaFormState, FormData>(
    approvePlan,
    undefined,
  );

  useEffect(() => {
    if (state?.ok) toast.success("Plan aprobado");
  }, [state]);

  return (
    <div className="flex flex-col gap-1">
      <form action={action} className="flex flex-wrap items-center gap-3">
        <input type="hidden" name="planId" value={planId} />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="delivered" defaultChecked className="h-4 w-4 accent-primary" />
          Ya se entregó copia a las familias
        </label>
        <SubmitButton
          className="rounded-control border border-primary bg-transparent px-3 py-1.5 text-sm font-semibold text-primary"
          pendingLabel="Aprobando..."
        >
          Aprobar el plan
        </SubmitButton>
      </form>
      {state?.error ? <p className="text-xs text-danger">{state.error}</p> : null}
    </div>
  );
}
