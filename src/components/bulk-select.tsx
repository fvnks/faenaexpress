"use client";

import { useEffect, useState } from "react";

/**
 * Checkbox "seleccionar todas" para las acciones masivas: marca/desmarca
 * todos los checkboxes `name="ids"` del formulario indicado y muestra
 * cuántas filas están seleccionadas.
 */
export function BulkSelectAll({ formId, total }: { formId: string; total: number }) {
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    const form = document.getElementById(formId);
    if (!form) return;
    const update = () => {
      const boxes = form.querySelectorAll<HTMLInputElement>('input[name="ids"]');
      setSelected([...boxes].filter((box) => box.checked).length);
    };
    form.addEventListener("change", update);
    return () => form.removeEventListener("change", update);
  }, [formId]);

  const toggleAll = (checked: boolean) => {
    const form = document.getElementById(formId);
    form?.querySelectorAll<HTMLInputElement>('input[name="ids"]').forEach((box) => {
      box.checked = checked;
    });
    setSelected(checked ? total : 0);
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
