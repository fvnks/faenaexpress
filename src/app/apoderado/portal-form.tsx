"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import { portalLogin, type PortalFormState } from "@/app/actions/portal";
import { SubmitButton } from "@/components/submit-button";
import { controlClass, fieldClass, labelClass } from "@/lib/ui";

/**
 * Entrada al portal del apoderado.
 *
 * El código lo entrega el colegio en persona (en la reunión de apoderados).
 * Si la familia no lo tiene, lo pide en la secretaría.
 */
export function PortalForm() {
  const [state, action] = useActionState<PortalFormState, FormData>(portalLogin, undefined);

  useEffect(() => {
    if (state?.ok) toast.success("Bienvenido");
  }, [state]);

  return (
    <form action={action} className="flex w-full max-w-sm flex-col gap-3">
      <div className={fieldClass}>
        <label htmlFor="codigo" className={labelClass}>
          Código de acceso
        </label>
        <input
          id="codigo"
          name="codigo"
          type="text"
          required
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          placeholder="ABCD-1234"
          className={controlClass + " uppercase tracking-widest"}
        />
      </div>

      {state?.error ? <p className="text-sm text-danger">{state.error}</p> : null}

      <SubmitButton
        className="rounded-control border border-primary bg-transparent px-4 py-2 text-sm font-semibold text-primary"
        pendingLabel="Entrando..."
      >
        Entrar
      </SubmitButton>
    </form>
  );
}
