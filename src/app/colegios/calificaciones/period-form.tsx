"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";

import { createGradingPeriod, type GradesFormState } from "@/app/actions/schools";
import { SubmitButton } from "@/components/submit-button";
import { controlClass, fieldClass, labelClass } from "@/lib/ui";

/**
 * Alta de un período de evaluación (semestre o trimestre).
 *
 * El Decreto 67/2018 no dice cuántos períodos tiene el año ni cómo se
 * ponderan: lo fija el reglamento de cada colegio. Por eso son datos del
 * colegio, no un default del sistema.
 */
export function PeriodForm({ puedeEditar }: { puedeEditar: boolean }) {
  const [state, action] = useActionState<GradesFormState, FormData>(
    createGradingPeriod,
    undefined,
  );
  const panel = useRef<HTMLDetailsElement>(null);
  const form = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state?.ok) return;
    toast.success("Período creado");
    if (panel.current) panel.current.open = false;
    form.current?.reset();
  }, [state]);

  if (!puedeEditar) return null;

  return (
    <details ref={panel} className="w-full max-w-md">
      <summary className="cursor-pointer text-sm font-semibold text-muted-foreground hover:text-foreground">
        Nuevo período
      </summary>

      <form ref={form} action={action} className="mt-3">
        <div className="flex flex-col gap-3">
          <div className={fieldClass}>
            <label htmlFor="periodName" className={labelClass}>
              Nombre
            </label>
            <input
              id="periodName"
              name="name"
              type="text"
              required
              placeholder="Primer semestre"
              className={controlClass}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className={fieldClass}>
              <label htmlFor="periodType" className={labelClass}>
                Régimen
              </label>
              <select id="periodType" name="type" defaultValue="SEMESTRE" className={controlClass}>
                <option value="SEMESTRE">Semestral</option>
                <option value="TRIMESTRE">Trimestral</option>
              </select>
            </div>
            <div className={fieldClass}>
              <label htmlFor="periodWeight" className={labelClass}>
                Ponderación (%)
              </label>
              <input
                id="periodWeight"
                name="weight"
                type="number"
                min={0}
                max={100}
                step={1}
                defaultValue={0}
                className={controlClass + " tabular"}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className={fieldClass}>
              <label htmlFor="startDate" className={labelClass}>
                Desde
              </label>
              <input
                id="startDate"
                name="startDate"
                type="text"
                data-date="1"
                pattern="^\d{2}-\d{2}-\d{4}$"
                placeholder="DD-MM-AAAA"
                className={controlClass}
              />
            </div>
            <div className={fieldClass}>
              <label htmlFor="endDate" className={labelClass}>
                Hasta
              </label>
              <input
                id="endDate"
                name="endDate"
                type="text"
                data-date="1"
                pattern="^\d{2}-\d{2}-\d{4}$"
                placeholder="DD-MM-AAAA"
                className={controlClass}
              />
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            En régimen semestral lo habitual es 60% y 40%; en trimestral, 70%, 30% y 10%. La suma de
            los períodos no tiene que dar 100: el cálculo la normaliza.
          </p>

          {state?.error ? <p className="text-sm text-danger">{state.error}</p> : null}

          <SubmitButton
            className="self-start rounded-control border border-primary bg-transparent px-3 py-1.5 text-sm font-semibold text-primary"
            pendingLabel="Guardando..."
          >
            Crear
          </SubmitButton>
        </div>
      </form>
    </details>
  );
}
