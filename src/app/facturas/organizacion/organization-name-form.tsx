"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";

import { updateOrganization, type CompanyFormState } from "@/app/actions/companies";
import { SubmitButton } from "@/components/submit-button";
import { controlClass, labelClass, secondaryButtonClass } from "@/lib/ui";

// Nombre de la cuenta (el «holding»): solo tiene sentido cuando la organización
// agrupa MÁS DE UNA empresa. Con una sola, la cuenta se llama como la empresa y
// esto ni se muestra.
export function OrganizationNameForm({ name }: { name: string }) {
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState<CompanyFormState, FormData>(
    updateOrganization,
    undefined,
  );

  useEffect(() => {
    if (state?.ok) toast.success("Nombre de la organización actualizado");
  }, [state]);

  // Cierra el formulario cuando el guardado termina bien. El ajuste se hace en
  // render con guarda (patrón «ajustar estado cuando cambian las props»), no en un
  // effect: un setState dentro de un effect provoca renders en cascada.
  const [lastHandled, setLastHandled] = useState(state);
  if (state?.ok && state !== lastHandled) {
    setLastHandled(state);
    setEditing(false);
  }

  if (!editing) {
    return (
      <div className="flex flex-col items-end gap-1">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className={secondaryButtonClass + " py-1.5 text-sm"}
        >
          Cambiar nombre
        </button>
        <p className="text-xs text-muted-foreground">Nombre de la cuenta</p>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <div>
        <label htmlFor="org-name" className={labelClass}>
          Nombre de la organización
        </label>
        <input
          id="org-name"
          name="name"
          type="text"
          required
          minLength={2}
          maxLength={80}
          defaultValue={name}
          autoFocus
          className={controlClass}
        />
      </div>
      <SubmitButton
        className={secondaryButtonClass + " py-1.5 text-sm"}
        pendingLabel="Guardando..."
      >
        Guardar
      </SubmitButton>
      <button
        type="button"
        onClick={() => setEditing(false)}
        className={secondaryButtonClass + " py-1.5 text-sm"}
      >
        Cancelar
      </button>
      {state?.error ? (
        <p className="w-full text-sm text-danger">{state.error}</p>
      ) : null}
      <span className="sr-only" aria-live="polite">
        {pending ? "Guardando" : ""}
      </span>
    </form>
  );
}
