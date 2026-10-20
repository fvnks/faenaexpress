"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import { setOrganizationModuleEnabled, type PlatformActionState } from "@/app/actions/platform";
import { SubmitButton } from "@/components/submit-button";

// Interruptor de un módulo para una organización. Es un cambio comercial (por
// eso se audita), así que el botón dice lo que va a hacer en vez de ser un
// switch que nadie entiende.
export function ModuleToggle({
  organizationId,
  moduleCode,
  moduleName,
  enabled,
  core = false,
}: {
  organizationId: string;
  moduleCode: string;
  moduleName: string;
  enabled: boolean;
  /** El núcleo no se puede cambiar. */
  core?: boolean;
}) {
  const [state, action, pending] = useActionState<PlatformActionState, FormData>(
    setOrganizationModuleEnabled,
    undefined,
  );

  useEffect(() => {
    if (state?.ok) {
      toast.success(
        state.enabled ? `${moduleName} habilitado` : `${moduleName} deshabilitado`,
      );
    }
  }, [state, moduleName]);

  if (core) {
    return (
      <li className="flex flex-wrap items-center justify-between gap-2 py-2.5">
        <div>
          <p className="text-sm font-medium">{moduleName}</p>
          <p className="text-xs text-muted-foreground">Núcleo del producto: siempre incluido.</p>
        </div>
        <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
          incluido
        </span>
      </li>
    );
  }

  return (
    <li className="flex flex-wrap items-center justify-between gap-2 py-2.5">
      <div className="min-w-0">
        <p className="text-sm font-medium">{moduleName}</p>
        <p className="text-xs text-muted-foreground">
          {enabled ? "Habilitado para esta cuenta." : "No contratado: no aparece en el panel."}
        </p>
      </div>
      <form action={action} className="flex items-center gap-2">
        <input type="hidden" name="organizationId" value={organizationId} />
        <input type="hidden" name="moduleCode" value={moduleCode} />
        <input type="hidden" name="enabled" value={enabled ? "false" : "true"} />
        <SubmitButton
          className="rounded-control border border-border bg-transparent px-3 py-1.5 text-xs text-foreground hover:bg-background disabled:opacity-60"
          pendingLabel="Guardando..."
        >
          {enabled ? "Deshabilitar" : "Habilitar"}
        </SubmitButton>
        <span className="sr-only" aria-live="polite">
          {pending ? "Guardando" : ""}
        </span>
      </form>
      {state?.error ? <p className="w-full text-xs text-danger">{state.error}</p> : null}
    </li>
  );
}
