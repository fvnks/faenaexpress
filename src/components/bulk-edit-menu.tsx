"use client";

import { useEffect, useRef, useState } from "react";

import { secondaryButtonClass } from "@/lib/ui";

type Option = { value: string; label: string };

/**
 * Menú de edición masiva para las listas: elige campo (categoría, área, medio
 * de pago) y valor, y envía el formulario con bulkAction=bulk_edit.
 * También ofrece borrado en lote con confirmación.
 */
export function BulkEditMenu({
  formId,
  categories,
  areas,
  paymentMethods = [],
  canDelete = false,
  deleteLabel = "Eliminar seleccionadas",
}: {
  formId: string;
  categories: Option[];
  areas: Option[];
  paymentMethods?: Option[];
  canDelete?: boolean;
  deleteLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [field, setField] = useState("categoria");
  const [value, setValue] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const options = field === "categoria" ? categories : field === "area" ? areas : paymentMethods;
  const fieldLabels: Record<string, string> = {
    categoria: "categoría",
    area: "área",
    metodoPago: "medio de pago",
  };

  /** Envía el formulario nativo con los campos ocultos ya puestos. */
  const submitBulk = (action: string, extra?: { field?: string; value?: string }) => {
    const form = document.getElementById(formId) as HTMLFormElement | null;
    if (!form) return;

    form.querySelectorAll('input[data-bulk-helper]').forEach((el) => el.remove());
    const set = (name: string, val: string) => {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = name;
      input.value = val;
      input.setAttribute("data-bulk-helper", "");
      form.appendChild(input);
    };
    set("bulkAction", action);
    if (extra?.field) set("bulkField", extra.field);
    if (extra?.value) set("bulkValue", extra.value);

    if (action === "bulk_delete") {
      const ok = window.confirm(`¿Eliminar las filas seleccionadas? Esta acción no se puede deshacer.`);
      if (!ok) {
        form.querySelectorAll('input[data-bulk-helper]').forEach((el) => el.remove());
        return;
      }
    }
    form.requestSubmit();
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((v) => !v)}
        className={secondaryButtonClass + " inline-flex items-center gap-2"}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
          <path d="M12 3v12m0 0 4-4m-4 4-4-4M4 17v3h16v-3" />
        </svg>
        Editar selección
      </button>

      {open ? (
        <div className="user-menu-pop absolute left-0 top-full z-40 mt-2 w-64 rounded-card border border-border bg-surface p-2 shadow-lg">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-subtle">
            Cambiar en bloque
          </p>
          <label className="mb-1 block text-xs text-muted-foreground" htmlFor={`bulk-field-${formId}`}>
            Campo
          </label>
          <select
            id={`bulk-field-${formId}`}
            value={field}
            onChange={(event) => {
              setField(event.target.value);
              setValue("");
            }}
            className="input w-full px-2 py-1.5 text-sm"
          >
            <option value="categoria">Categoría</option>
            <option value="area">Área</option>
            {paymentMethods.length > 0 ? <option value="metodoPago">Medio de pago</option> : null}
          </select>

          <label className="mb-1 mt-3 block text-xs text-muted-foreground" htmlFor={`bulk-value-${formId}`}>
            Nuevo valor
          </label>
          <select
            id={`bulk-value-${formId}`}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            className="input w-full px-2 py-1.5 text-sm"
          >
            <option value="">Seleccionar…</option>
            {options.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>

          <button
            type="button"
            disabled={!value}
            onClick={() => {
              submitBulk("bulk_edit", { field, value });
              setOpen(false);
            }}
            className="mt-3 w-full rounded-control bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            Aplicar a seleccionadas
          </button>

          {canDelete ? (
            <>
              <div className="my-2 border-t border-border" />
              <button
                type="button"
                onClick={() => {
                  submitBulk("bulk_delete");
                  setOpen(false);
                }}
                className="w-full rounded-control border border-danger px-3 py-2 text-sm font-medium text-danger hover:bg-danger-soft"
              >
                {deleteLabel}
              </button>
            </>
          ) : null}

          <p className="mt-2 text-[11px] leading-snug text-subtle">
            Solo se aplica a las filas marcadas. Campo: {fieldLabels[field]}.
          </p>
        </div>
      ) : null}
    </div>
  );
}
