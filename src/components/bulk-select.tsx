"use client";

import { useEffect, useState } from "react";

/**
 * Control de selección masiva: checkbox "seleccionar todas", contador de filas
 * y habilitación de las acciones del formulario.
 *
 * Los botones de acción llevan `data-bulk`; se deshabilitan sin selección y
 * `data-bulk="single"` exige exactamente una fila. Se toca el DOM del formulario
 * a propósito: el formulario puede venir de un Server Component y no comparte
 * estado de React con este control.
 */
export function BulkSelectAll({ formId, total }: { formId: string; total: number }) {
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    const form = document.getElementById(formId);
    if (!form) return;

    const sync = () => {
      const boxes = form.querySelectorAll<HTMLInputElement>('input[name="ids"]');
      const count = [...boxes].filter((box) => box.checked).length;
      setSelected(count);
      setActionsEnabled(form, count);
    };

    sync();
    form.addEventListener("change", sync);
    return () => form.removeEventListener("change", sync);
  }, [formId, total]);

  const toggleAll = (checked: boolean) => {
    const form = document.getElementById(formId);
    if (!form) return;
    form.querySelectorAll<HTMLInputElement>('input[name="ids"]').forEach((box) => {
      box.checked = checked;
    });
    const count = checked ? total : 0;
    setSelected(count);
    // Marcar por código no dispara `change`: hay que sincronizar a mano.
    setActionsEnabled(form, count);
  };

  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
      <input
        type="checkbox"
        onChange={(event) => toggleAll(event.target.checked)}
        aria-label="Seleccionar todas las filas"
        className="h-4 w-4 accent-primary"
      />
      {selected > 0 ? (
        <span className="font-medium text-foreground">
          {selected} de {total} seleccionadas
        </span>
      ) : (
        <span>Seleccionar todas ({total})</span>
      )}
    </label>
  );
}

function setActionsEnabled(form: HTMLElement, count: number) {
  form.querySelectorAll<HTMLButtonElement>("[data-bulk]").forEach((button) => {
    const single = button.dataset.bulk === "single";
    button.disabled = count === 0 || (single && count !== 1);
    if (single && count > 1) {
      button.title = "Selecciona una sola fila";
    } else {
      button.removeAttribute("title");
    }
  });
}
