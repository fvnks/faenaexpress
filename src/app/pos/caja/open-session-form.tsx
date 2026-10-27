"use client";

import { useActionState } from "react";

import { openPosSession, type PosActionState } from "@/app/actions/pos";
import { SubmitButton } from "@/components/submit-button";
import { controlClass, fieldClass, labelClass, primaryButtonClass } from "@/lib/ui";

export function OpenSessionForm({
  terminals,
}: {
  terminals: { id: string; name: string }[];
}) {
  const [state, formAction] = useActionState<PosActionState, FormData>(openPosSession, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className={fieldClass}>
        <label htmlFor="pos-terminal" className={labelClass}>
          Terminal (opcional)
        </label>
        <select id="pos-terminal" name="terminalId" className={controlClass}>
          <option value="">Ninguna</option>
          {terminals.map((terminal) => (
            <option key={terminal.id} value={terminal.id}>
              {terminal.name}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">
          Desde qué punto de venta físico se opera esta caja.
        </p>
      </div>

      <div className={fieldClass}>
        <label htmlFor="pos-opening-amount" className={labelClass}>
          Monto inicial en efectivo
        </label>
        <input
          id="pos-opening-amount"
          name="openingAmount"
          type="number"
          min="0"
          step="1"
          defaultValue="0"
          className={controlClass}
          required
        />
        <p className="text-xs text-muted-foreground">
          El vuelto con el que empieza la caja. No es una venta.
        </p>
      </div>

      <div className={fieldClass}>
        <label htmlFor="pos-opening-notes" className={labelClass}>
          Nota (opcional)
        </label>
        <input
          id="pos-opening-notes"
          name="notes"
          type="text"
          maxLength={200}
          className={controlClass}
          placeholder="Turno mañana, caja 2…"
        />
      </div>

      {state?.error ? (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      ) : null}

      <SubmitButton pendingLabel="Abriendo…" className={primaryButtonClass}>
        Abrir caja
      </SubmitButton>
    </form>
  );
}
