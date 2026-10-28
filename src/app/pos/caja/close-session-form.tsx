"use client";

import { useState } from "react";

import { closePosSession, type PosActionState } from "@/app/actions/pos";
import { SubmitButton } from "@/components/submit-button";
import { controlClass, fieldClass, labelClass, primaryButtonClass } from "@/lib/ui";
import { formatCLP } from "@/lib/money";

export function CloseSessionForm({
  sessionId,
  expected,
}: {
  sessionId: string;
  expected: number;
}) {
  const [state, setState] = useState<PosActionState>(undefined);
  const [counted, setCounted] = useState("");

  const countedNumber = Number(counted);
  const difference =
    Number.isFinite(countedNumber) && counted !== "" ? countedNumber - expected : null;

  async function handleSubmit(formData: FormData) {
    setState(undefined);
    const result = await closePosSession(undefined, formData);
    setState(result);
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-4">
      <input type="hidden" name="sessionId" value={sessionId} />

      <div className={fieldClass}>
        <label htmlFor="pos-closing-amount" className={labelClass}>
          Efectivo contado al cierre
        </label>
        <input
          id="pos-closing-amount"
          name="closingAmount"
          type="number"
          min="0"
          step="1"
          value={counted}
          onChange={(event) => setCounted(event.target.value)}
          className={controlClass}
          required
        />
        <p className="text-xs text-muted-foreground">
          Esperado: <span className="tabular">{formatCLP(expected)}</span> (apertura + ventas en
          efectivo).
        </p>
      </div>

      {difference !== null ? (
        <p
          className={
            "rounded-control border px-3 py-2 text-sm " +
            (difference === 0
              ? "border-success/40 bg-success-soft text-foreground"
              : "border-accent/50 bg-accent-soft text-foreground")
          }
        >
          {difference === 0
            ? "La caja cuadra exactamente."
            : difference > 0
              ? `Sobran ${formatCLP(difference)}.`
              : `Faltan ${formatCLP(Math.abs(difference))}.`}
        </p>
      ) : null}

      <div className={fieldClass}>
        <label htmlFor="pos-closing-notes" className={labelClass}>
          Nota de cierre (opcional)
        </label>
        <input
          id="pos-closing-notes"
          name="notes"
          type="text"
          maxLength={200}
          className={controlClass}
          placeholder="Diferencia justificada, cambio de turno…"
        />
      </div>

      {state?.error ? (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      ) : null}

      <SubmitButton pendingLabel="Cerrando…" className={primaryButtonClass}>
        Cerrar caja
      </SubmitButton>
    </form>
  );
}
