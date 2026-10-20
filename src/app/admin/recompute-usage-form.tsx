"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import { recomputeOrganizationUsage, type PlatformActionState } from "@/app/actions/platform";
import { SubmitButton } from "@/components/submit-button";
import { secondaryButtonClass } from "@/lib/ui";

// Recalcula el consumo real desde los datos. El contador se lleva al día al
// crear, pero se puede desviar (una eliminación, una importación, un cambio de
// período): esto lo arregla.
export function RecomputeUsageForm({ organizationId }: { organizationId: string }) {
  const [state, action, pending] = useActionState<PlatformActionState, FormData>(
    recomputeOrganizationUsage,
    undefined,
  );

  useEffect(() => {
    if (state?.ok) toast.success("Uso recalculado");
  }, [state]);

  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="organizationId" value={organizationId} />
      <SubmitButton
        className={secondaryButtonClass + " py-1.5 text-xs"}
        pendingLabel="Recalculando..."
      >
        Recalcular uso
      </SubmitButton>
      {state?.error ? <p className="text-xs text-danger">{state.error}</p> : null}
      <span className="sr-only" aria-live="polite">
        {pending ? "Recalculando" : ""}
      </span>
    </form>
  );
}
