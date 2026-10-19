"use client";

import { useState, useTransition } from "react";

import { deletePayment } from "@/app/actions/payments";
import { ConfirmDialog } from "@/components/confirm-dialog";
import type { PaymentKind } from "@/lib/payments";
import { dangerButtonClass } from "@/lib/ui";

/** Elimina un abono pidiendo confirmación: el estado del documento se recalcula. */
export function DeletePaymentButton({ paymentId, kind }: { paymentId: string; kind: PaymentKind }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-muted-foreground underline-offset-2 transition-colors hover:text-danger hover:underline"
      >
        Eliminar
      </button>

      {open ? (
        <ConfirmDialog
          title="Eliminar abono"
          description="¿Eliminar este abono? Se recalcula el saldo y el estado del documento."
          onCancel={() => setOpen(false)}
        >
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              setOpen(false);
              const data = new FormData();
              data.set("id", paymentId);
              data.set("kind", kind);
              startTransition(async () => {
                await deletePayment(data);
              });
            }}
            className={dangerButtonClass}
          >
            {pending ? "Eliminando…" : "Eliminar"}
          </button>
        </ConfirmDialog>
      ) : null}
    </>
  );
}
