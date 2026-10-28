"use client";

import { useState } from "react";

import { voidPosSale, type PosActionState } from "@/app/actions/pos";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { controlClass, dangerButtonClass, fieldClass, labelClass } from "@/lib/ui";

export function VoidSaleForm({ saleId, saleNumber }: { saleId: string; saleNumber: string }) {
  const [state, setState] = useState<PosActionState>(undefined);

  async function handleSubmit(formData: FormData) {
    setState(undefined);
    const result = await voidPosSale(undefined, formData);
    setState(result);
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-3">
      <input type="hidden" name="saleId" value={saleId} />

      <div className={fieldClass}>
        <label htmlFor={`motivo-${saleId}`} className={labelClass}>
          Motivo de la anulación (opcional)
        </label>
        <input
          id={`motivo-${saleId}`}
          name="motivo"
          type="text"
          maxLength={200}
          className={controlClass}
          placeholder="Se equivocó de producto, se arrepintió el cliente…"
          autoComplete="off"
        />
      </div>

      {state?.error ? (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      ) : null}

      <ConfirmSubmit
        title={`Anular ${saleNumber}`}
        description="El ticket deja de contar como venta y los productos vuelven al inventario. Esta acción no se puede deshacer."
        confirmLabel="Anular venta"
        className={dangerButtonClass}
      >
        Anular venta
      </ConfirmSubmit>
    </form>
  );
}
