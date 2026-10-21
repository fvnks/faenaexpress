"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";

import { saveProtocol, type ConvivenciaFormState } from "@/app/actions/school-convivencia";
import { SubmitButton } from "@/components/submit-button";
import { controlClass, fieldClass, labelClass } from "@/lib/ui";

/**
 * Guarda un protocolo con sus etapas y sus plazos.
 *
 * Las etapas se escriben como "Nombre | días | responsable", una por línea: es
 * como las tiene escritas el colegio en el RICE, y no obliga a que nadie
 * aprenda a escribir JSON.
 */
export function ProtocolForm({
  protocolId,
  name,
  kind,
  steps,
}: {
  protocolId?: string;
  name?: string;
  kind?: string;
  steps?: string;
}) {
  const [state, action] = useActionState<ConvivenciaFormState, FormData>(
    saveProtocol,
    undefined,
  );
  const panel = useRef<HTMLDetailsElement>(null);
  const form = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state?.ok) return;
    toast.success("Protocolo guardado");
    if (panel.current) panel.current.open = false;
    form.current?.reset();
  }, [state]);

  return (
    <details ref={panel} className="w-full max-w-2xl">
      <summary className="cursor-pointer text-sm font-semibold text-primary">
        {protocolId ? "Editar el protocolo" : "Nuevo protocolo"}
      </summary>

      <form ref={form} action={action} className="mt-3 flex flex-col gap-3">
        {protocolId ? <input type="hidden" name="protocolId" value={protocolId} /> : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <div className={fieldClass}>
            <label htmlFor="protocolName" className={labelClass}>
              Nombre
            </label>
            <input
              id="protocolName"
              name="name"
              type="text"
              required
              defaultValue={name ?? ""}
              placeholder="Protocolo de convivencia general"
              className={controlClass}
            />
          </div>
          <div className={fieldClass}>
            <label htmlFor="protocolKind" className={labelClass}>
              Tipo
            </label>
            <select
              id="protocolKind"
              name="kind"
              defaultValue={kind ?? "CONVIVENCIA"}
              className={controlClass}
            >
              <option value="CONVIVENCIA">Convivencia general</option>
              <option value="MALTRATO">Maltrato infantil</option>
              <option value="ACOSO">Acoso escolar</option>
              <option value="ACOSO_LABORAL">Acoso laboral</option>
              <option value="DISCRIMINACION">Discriminación</option>
            </select>
          </div>
        </div>

        <div className={fieldClass}>
          <label htmlFor="protocolSteps" className={labelClass}>
            Etapas (una por línea: nombre | días | responsable)
          </label>
          <textarea
            id="protocolSteps"
            name="steps"
            rows={6}
            defaultValue={steps ?? ""}
            placeholder={"Recepción de la denuncia | 1 | Coordinador de convivencia\nInvestigación | 20 | UTP\nEntrevista a las familias | 30 | Profesor jefe\nMediación | 45 | Coordinador de convivencia"}
            className={controlClass + " font-mono text-xs"}
          />
          <p className="text-xs text-muted-foreground">
            Los días son el plazo de cada etapa desde que se abre el caso. Si no pones días, la etapa
            queda sin plazo.
          </p>
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
