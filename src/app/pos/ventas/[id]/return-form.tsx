"use client";

import { useActionState, useState } from "react";

import { createPosReturn, type PosActionState } from "@/app/actions/pos";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { controlClass, dangerButtonClass, fieldClass, labelClass } from "@/lib/ui";

/**
 * Devolución de un ticket de un turno cerrado: el dinero sale de la caja
 * abierta de quien la procesa y el stock vuelve al inventario. Pide motivo y
 * confirmación, igual que la anulación.
 */
export function ReturnSaleForm({ saleId, saleNumber }: { saleId: string; saleNumber: string }) {
  const [state, formAction] = useActionState<PosActionState, FormData>(createPosReturn, undefined);
  const [motivo, setMotivo] = useState("");

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="saleId" value={saleId} />

      <div className={fieldClass}>
        <label htmlFor={`devolucion-${saleId}`} className={labelClass}>
          Motivo de la devolución
        </label>
        <input
          id={`devolucion-${saleId}`}
          name="motivo"
          type="text"
          value={motivo}
          onChange={(event) => setMotivo(event.target.value)}
          maxLength={200}
          className={controlClass}
          placeholder="Producto defectuoso, se arrepintió el cliente…"
          autoComplete="off"
          required
        />
      </div>

      {state?.error ? (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      ) : null}

      <ConfirmSubmit
        title={`Devolver ${saleNumber}`}
        description="Se registra una devolución por el monto completo del ticket: el dinero sale de tu caja abierta y los productos vuelven al inventario. Queda ligada al ticket original y no se puede deshacer."
        confirmLabel="Registrar devolución"
        className={dangerButtonClass}
      >
        Registrar devolución
      </ConfirmSubmit>
    </form>
  );
}
