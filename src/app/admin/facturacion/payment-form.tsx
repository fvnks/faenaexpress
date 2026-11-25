"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import { confirmPlatformPayment, runPlatformBillingJobs, type BillingActionState } from "@/app/actions/platform-billing";
import { SubmitButton } from "@/components/submit-button";
import { controlClass, secondaryButtonClass } from "@/lib/ui";

export function ConfirmarPagoForm({ invoiceId }: { invoiceId: string }) {
  const [state, action] = useActionState<BillingActionState, FormData>(confirmPlatformPayment, undefined);
  useEffect(() => {
    if (state?.ok) toast.success("Pago confirmado.");
    if (state?.error) toast.error(state.error);
  }, [state]);

  return (
    <form action={action} className="mt-3 flex flex-wrap items-end gap-2 border-t border-border pt-3">
      <input type="hidden" name="invoiceId" value={invoiceId} />
      <label className="flex flex-col gap-1 text-xs text-muted-foreground">
        Referencia del pago
        <input name="providerRef" required placeholder="Ej. comprobante-transferencia" className={controlClass + " w-56"} />
      </label>
      <label className="flex flex-col gap-1 text-xs text-muted-foreground">
        Monto (CLP)
        <input name="amountCLP" type="number" min="1" step="1" required className={controlClass + " w-40 tabular"} />
      </label>
      <SubmitButton pendingLabel="Confirmando…" className={secondaryButtonClass}>Confirmar pago manual</SubmitButton>
      {state?.error ? <span className="text-xs text-danger">{state.error}</span> : null}
    </form>
  );
}

export function JobsFacturacionForm() {
  const [state, action] = useActionState<BillingActionState, FormData>(runPlatformBillingJobs, undefined);
  useEffect(() => {
    if (state?.ok) toast.success("Tarea ejecutada.");
    if (state?.error) toast.error(state.error);
  }, [state]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <form action={action}>
        <input type="hidden" name="tarea" value="facturas" />
        <SubmitButton pendingLabel="Generando…" className={secondaryButtonClass}>Generar facturas del mes</SubmitButton>
      </form>
      <form action={action}>
        <input type="hidden" name="tarea" value="vencidas" />
        <SubmitButton pendingLabel="Actualizando…" className={secondaryButtonClass}>Marcar vencidas</SubmitButton>
      </form>
      {state?.error ? <span className="text-xs text-danger">{state.error}</span> : null}
    </div>
  );
}
