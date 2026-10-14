"use client";

import { useActionState } from "react";

import { registerGuideFromVentas } from "@/app/actions/commissions";
import type { RegisterDispatchGuideState } from "@/app/actions/commissions";
import { SubmitButton } from "@/components/submit-button";
import { cardClass, controlClass, labelClass, primaryButtonClass } from "@/lib/ui";

type Customer = { id: string; name: string };
type Salesperson = { id: string; name: string };

export function GuiaForm({
  customers,
  salespeople,
  today,
}: {
  customers: Customer[];
  salespeople: Salesperson[];
  today: string;
}) {
  const [state, formAction] = useActionState<RegisterDispatchGuideState, FormData>(
    registerGuideFromVentas,
    undefined,
  );

  return (
    <form action={formAction} className={cardClass + " flex flex-col gap-4 p-4"}>
      {state?.error ? (
        <div className="rounded-control bg-danger-soft px-3 py-2 text-sm text-danger">{state.error}</div>
      ) : null}
      {state?.ok ? (
        <div className="rounded-control bg-success-soft px-3 py-2 text-sm text-success">{state.message}</div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>N° guía</span>
          <input name="guideNumber" required className={controlClass} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Cliente</span>
          <select name="partnerId" required className={controlClass}>
            <option value="">Selecciona…</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Vendedor (opcional)</span>
          <select name="salespersonId" className={controlClass}>
            <option value="">Sin asignar</option>
            {salespeople.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Fecha</span>
          <input name="date" type="date" required defaultValue={today} className={controlClass} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Neto</span>
          <input name="netAmount" type="number" required min={1} className={controlClass} />
        </label>
        <label className="flex flex-col gap-1.5 sm:col-span-2">
          <span className={labelClass}>Observación</span>
          <input name="note" className={controlClass} />
        </label>
      </div>
      <div className="flex justify-end">
        <SubmitButton className={primaryButtonClass} pendingLabel="Registrando…">
          Registrar guía
        </SubmitButton>
      </div>
    </form>
  );
}
