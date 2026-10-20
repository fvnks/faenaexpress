"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";

import { createEvaluation, type GradesFormState } from "@/app/actions/schools";
import { SubmitButton } from "@/components/submit-button";
import { controlClass, fieldClass, labelClass } from "@/lib/ui";

/**
 * Alta de una evaluación.
 *
 * La ponderación va en porcentaje dentro de la asignatura. Si una evaluación
 * es la final del período, su peso no puede pasar del 30% (Art. 18 h) del
 * Decreto 67/2018, y la acción lo hace cumplir.
 */
export function EvaluationForm({
  cursoId,
  asignaturaId,
  periodoId,
  tipos,
}: {
  cursoId: string;
  asignaturaId: string;
  periodoId: string;
  tipos: readonly { value: string; label: string }[];
}) {
  const [state, action] = useActionState<GradesFormState, FormData>(createEvaluation, undefined);
  const panel = useRef<HTMLDetailsElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const esFinal = useRef<HTMLInputElement>(null);

  // Al guardar bien, el formulario se cierra y se limpia. Se manipula el DOM
  // (no el estado de React) porque el efecto sirve para eso: sincronizar con
  // algo de fuera de React.
  useEffect(() => {
    if (!state?.ok) return;
    toast.success("Evaluación creada");
    if (panel.current) panel.current.open = false;
    form.current?.reset();
    if (esFinal.current) esFinal.current.checked = false;
  }, [state]);

  return (
    <details ref={panel} className="w-full max-w-md">
      <summary className="cursor-pointer text-sm font-semibold text-primary">
        Nueva evaluación
      </summary>

      <form ref={form} action={action} className="mt-3">
        <input type="hidden" name="courseId" value={cursoId} />
        <input type="hidden" name="subjectId" value={asignaturaId} />
        <input type="hidden" name="periodId" value={periodoId} />

        <div className="flex flex-col gap-3">
          <div className={fieldClass}>
            <label htmlFor="name" className={labelClass}>
              Nombre
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              placeholder="Prueba 1"
              className={controlClass}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className={fieldClass}>
              <label htmlFor="type" className={labelClass}>
                Tipo
              </label>
              <select id="type" name="type" defaultValue="PRUEBA" className={controlClass}>
                {tipos.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div className={fieldClass}>
              <label htmlFor="date" className={labelClass}>
                Fecha
              </label>
              <input
                id="date"
                name="date"
                type="text"
                data-date="1"
                pattern="^\d{2}-\d{2}(-\d{4})?$"
                placeholder="DD-MM-AAAA"
                className={controlClass}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className={fieldClass}>
              <label htmlFor="weight" className={labelClass}>
                Ponderación (%)
              </label>
              <input
                id="weight"
                name="weight"
                type="number"
                min={0}
                max={100}
                step={1}
                defaultValue={0}
                className={controlClass + " tabular"}
              />
              <p className="text-xs text-muted-foreground">
                0 significa que todas las evaluaciones pesan lo mismo.
              </p>
            </div>
            <div className={fieldClass}>
              <span className={labelClass}>Evaluación final</span>
              <label className="flex items-center gap-2 py-2 text-sm">
                <input
                  ref={esFinal}
                  type="checkbox"
                  name="isFinal"
                  className="h-4 w-4 accent-primary"
                />
                Es la final del período
              </label>
              <p className="text-xs text-muted-foreground">
                Si lo es, su ponderación no puede pasar del 30% (Art. 18 h).
              </p>
            </div>
          </div>

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
