"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";

import {
  addCaseAction,
  closeCase,
  completeCaseAction,
  reportCase,
  type ConvivenciaFormState,
} from "@/app/actions/school-convivencia";
import { SubmitButton } from "@/components/submit-button";
import { controlClass, fieldClass, labelClass } from "@/lib/ui";
import { TIPOS_ACCION, TIPOS_CASO } from "@/lib/school-convivencia-rules";

type Alumno = { id: string; nombre: string };

/** Reportar un caso. */
export function ReportCaseForm({
  alumnos,
  puedeGestionar,
}: {
  alumnos: Alumno[];
  puedeGestionar: boolean;
}) {
  const [state, action] = useActionState<ConvivenciaFormState, FormData>(
    reportCase,
    undefined,
  );
  const panel = useRef<HTMLDetailsElement>(null);
  const form = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state?.ok) return;
    toast.success("Caso reportado");
    if (panel.current) panel.current.open = false;
    form.current?.reset();
  }, [state]);

  return (
    <details ref={panel} className="w-full max-w-2xl">
      <summary className="cursor-pointer text-sm font-semibold text-primary">
        Reportar un caso
      </summary>

      <form ref={form} action={action} className="mt-3 flex flex-col gap-3">
        <div className={fieldClass}>
          <label htmlFor="caseTitle" className={labelClass}>
            Título
          </label>
          <input
            id="caseTitle"
            name="title"
            type="text"
            required
            placeholder="Agresión entre dos estudiantes en el patio"
            className={controlClass}
          />
        </div>

        <div className={fieldClass}>
          <label htmlFor="caseDescription" className={labelClass}>
            Qué pasó
          </label>
          <textarea
            id="caseDescription"
            name="description"
            required
            rows={4}
            placeholder="Cuéntalo como lo viste o como te lo contaron."
            className={controlClass}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className={fieldClass}>
            <label htmlFor="caseType" className={labelClass}>
              Tipo
            </label>
            <select id="caseType" name="type" defaultValue="CONDUCTA" className={controlClass}>
              {Object.entries(TIPOS_CASO).map(([valor, etiqueta]) => (
                <option key={valor} value={valor}>
                  {etiqueta}
                </option>
              ))}
            </select>
          </div>
          <div className={fieldClass}>
            <label htmlFor="caseSeverity" className={labelClass}>
              Gravedad
            </label>
            <select id="caseSeverity" name="severity" defaultValue="LEVE" className={controlClass}>
              <option value="LEVE">Leve</option>
              <option value="MEDIA">Media</option>
              <option value="GRAVE">Grave</option>
            </select>
          </div>
        </div>

        {alumnos.length > 0 ? (
          <fieldset className={fieldClass}>
            <legend className={labelClass}>Alumnos involucrados</legend>
            <div className="mt-1 grid max-h-40 gap-1 overflow-y-auto rounded-control border border-border p-2 sm:grid-cols-2">
              {alumnos.map((a) => (
                <label key={a.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="studentId"
                    value={a.id}
                    className="h-4 w-4 accent-primary"
                  />
                  {a.nombre}
                </label>
              ))}
            </div>
          </fieldset>
        ) : null}

        {state?.error ? <p className="text-sm text-danger">{state.error}</p> : null}

        <div className="flex items-center gap-3">
          <SubmitButton
            className="rounded-control border border-primary bg-transparent px-3 py-1.5 text-sm font-semibold text-primary"
            pendingLabel="Reportando..."
          >
            Reportar
          </SubmitButton>
          {!puedeGestionar ? (
            <p className="text-xs text-muted-foreground">
              Lo reporta ahora; el seguimiento lo lleva la dirección o la UTP.
            </p>
          ) : null}
        </div>
      </form>
    </details>
  );
}

/** Agrega una etapa al caso. */
export function AddActionForm({ caseId }: { caseId: string }) {
  const [state, action] = useActionState<ConvivenciaFormState, FormData>(
    addCaseAction,
    undefined,
  );
  const panel = useRef<HTMLDetailsElement>(null);
  const form = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state?.ok) return;
    toast.success("Etapa agregada");
    if (panel.current) panel.current.open = false;
    form.current?.reset();
  }, [state]);

  return (
    <details ref={panel} className="w-full max-w-xl">
      <summary className="cursor-pointer text-sm font-semibold text-primary">
        Agregar una etapa
      </summary>

      <form ref={form} action={action} className="mt-3 flex flex-col gap-3">
        <input type="hidden" name="caseId" value={caseId} />

        <div className="grid gap-3 sm:grid-cols-2">
          <div className={fieldClass}>
            <label htmlFor={`actionType-${caseId}`} className={labelClass}>
              Etapa
            </label>
            <select
              id={`actionType-${caseId}`}
              name="type"
              defaultValue="INVESTIGACION"
              className={controlClass}
            >
              {Object.entries(TIPOS_ACCION).map(([valor, etiqueta]) => (
                <option key={valor} value={valor}>
                  {etiqueta}
                </option>
              ))}
            </select>
          </div>
          <div className={fieldClass}>
            <label htmlFor={`actionTitle-${caseId}`} className={labelClass}>
              Qué hay que hacer
            </label>
            <input
              id={`actionTitle-${caseId}`}
              name="title"
              type="text"
              required
              placeholder="Entrevistar a los testigos"
              className={controlClass}
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className={fieldClass}>
            <label htmlFor={`actionDue-${caseId}`} className={labelClass}>
              Plazo (opcional)
            </label>
            <input
              id={`actionDue-${caseId}`}
              name="dueAt"
              type="text"
              data-date="1"
              pattern="^\d{2}-\d{2}(-\d{4})?$"
              placeholder="DD-MM-AAAA"
              className={controlClass}
            />
          </div>
          <div className={fieldClass}>
            <label htmlFor={`actionNotes-${caseId}`} className={labelClass}>
              Observación
            </label>
            <input id={`actionNotes-${caseId}`} name="notes" type="text" className={controlClass} />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="doneAt" className="h-4 w-4 accent-primary" />
          La etapa ya está hecha
        </label>

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

/** Cierra una etapa. */
export function CompleteActionButton({
  actionId,
  caseId,
}: {
  actionId: string;
  caseId: string;
}) {
  const [state, action] = useActionState<ConvivenciaFormState, FormData>(
    completeCaseAction,
    undefined,
  );

  useEffect(() => {
    if (state?.ok) toast.success("Etapa cerrada");
  }, [state]);

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <form action={action} className="inline">
        <input type="hidden" name="actionId" value={actionId} />
        <input type="hidden" name="caseId" value={caseId} />
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

/** Cierra el caso. */
export function CloseCaseForm({ caseId }: { caseId: string }) {
  const [state, action] = useActionState<ConvivenciaFormState, FormData>(
    closeCase,
    undefined,
  );
  const panel = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    if (state?.ok) toast.success("Caso cerrado");
  }, [state]);

  return (
    <details ref={panel} className="w-full max-w-xl">
      <summary className="cursor-pointer text-sm font-semibold text-muted-foreground hover:text-foreground">
        Cerrar el caso
      </summary>

      <form action={action} className="mt-3 flex flex-col gap-3">
        <input type="hidden" name="caseId" value={caseId} />

        <div className={fieldClass}>
          <label htmlFor={`resolution-${caseId}`} className={labelClass}>
            Cómo se resolvió
          </label>
          <textarea
            id={`resolution-${caseId}`}
            name="resolution"
            required
            rows={3}
            className={controlClass}
          />
        </div>

        <div className={fieldClass}>
          <label htmlFor={`commission-${caseId}`} className={labelClass}>
            Informe de la comisión (solo si hubo expulsión)
          </label>
          <textarea
            id={`commission-${caseId}`}
            name="commissionReport"
            rows={3}
            placeholder="Profesor jefe, coordinador de convivencia y un técnico-pedagógico."
            className={controlClass}
          />
          <p className="text-xs text-muted-foreground">
            La ley 21.809 exige el informe de la comisión antes de una medida de expulsión o
            cancelación de matrícula.
          </p>
        </div>

        {state?.error ? <p className="text-sm text-danger">{state.error}</p> : null}

        <SubmitButton
          className="self-start rounded-control border border-primary bg-transparent px-3 py-1.5 text-sm font-semibold text-primary"
          pendingLabel="Cerrando..."
        >
          Cerrar el caso
        </SubmitButton>
      </form>
    </details>
  );
}
