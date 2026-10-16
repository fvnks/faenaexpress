"use client";

import { useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { dangerButtonClass } from "@/lib/ui";

/**
 * Botón de envío que pide confirmación antes de disparar la Server Action.
 *
 * El diálogo vive dentro del mismo `<form>`, así que al confirmar se envía con
 * `requestSubmit()`: el envío es del formulario real (con su Server Action y su
 * estado `pending`) y no de un botón que se desmonta al cerrar el diálogo.
 */
export function ConfirmSubmit({
  children,
  title,
  description,
  confirmLabel = "Confirmar",
  className,
  confirmClassName = dangerButtonClass,
}: {
  children: ReactNode;
  title: string;
  description: string;
  confirmLabel?: string;
  className?: string;
  confirmClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const { pending } = useFormStatus();

  return (
    <>
      <button type="button" disabled={pending} className={className} onClick={() => setOpen(true)}>
        {children}
      </button>
      {open ? (
        <ConfirmDialog title={title} description={description} onCancel={() => setOpen(false)}>
          <button
            type="button"
            className={confirmClassName}
            onClick={(event) => {
              setOpen(false);
              event.currentTarget.closest("form")?.requestSubmit();
            }}
          >
            {confirmLabel}
          </button>
        </ConfirmDialog>
      ) : null}
    </>
  );
}
