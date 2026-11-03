"use client";

import { useEffect, useRef, useState } from "react";

import { CheckIcon, ChevronsUpDown, type SelectOption } from "@/components/select-dropdown";

/**
 * Filtro de selección múltiple: el mismo patrón visual del SelectDropdown
 * (trigger de contorno, menú de tarjeta) pero marcando casillas.
 *
 * Cada clic suma o quita y la lista se actualiza al instante (los valores
 * viajan en la URL separados por coma, `a,b,c`), con el menú abierto para
 * poder seguir marcando. "Todos" arriba limpia el filtro completo.
 */
export function MultiSelectDropdown({
  id,
  values,
  options,
  emptyLabel = "Todos",
  onValuesChange,
}: {
  id?: string;
  /** Los valores elegidos ya parseados (de la URL: `a,b` → ["a", "b"]). */
  values: string[];
  options: SelectOption[];
  emptyLabel?: string;
  onValuesChange: (values: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const toggle = (value: string) => {
    onValuesChange(
      values.includes(value) ? values.filter((v) => v !== value) : [...values, value],
    );
  };

  // Con dos o más elegidos el trigger no los lista: en un filtro de 200
  // clientes los nombres no caben y "2 seleccionados" dice lo mismo.
  const etiqueta =
    values.length === 0
      ? emptyLabel
      : values.length === 1
        ? (options.find((o) => o.value === values[0])?.label ?? emptyLabel)
        : `${values.length} seleccionados`;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        id={id}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 rounded-control border border-border bg-surface px-3 py-2 text-sm text-foreground transition-colors hover:bg-background"
      >
        <span
          className={"min-w-0 flex-1 truncate text-left " + (values.length === 0 ? "text-muted-foreground" : "")}
        >
          {etiqueta}
        </span>
        {values.length > 1 ? (
          <span className="tabular shrink-0 rounded-full bg-primary-soft px-2 text-xs font-semibold text-primary">
            {values.length}
          </span>
        ) : null}
        <ChevronsUpDown />
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-40 mt-2 w-56 rounded-card border border-border bg-surface p-1 shadow-lg">
          <ul role="listbox" aria-multiselectable="true" className="flex max-h-72 flex-col overflow-y-auto">
            <li>
              <button
                type="button"
                role="option"
                aria-selected={values.length === 0}
                onClick={() => onValuesChange([])}
                className={
                  "flex w-full items-center gap-3 rounded-control px-2 py-1.5 text-left text-sm transition-colors hover:bg-background " +
                  (values.length === 0 ? "font-medium text-foreground" : "text-muted-foreground")
                }
              >
                <span className="min-w-0 flex-1 truncate">{emptyLabel}</span>
                {values.length === 0 ? <CheckIcon /> : null}
              </button>
            </li>
            {options.map((option) => {
              const marcado = values.includes(option.value);
              return (
                <li key={option.value}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={marcado}
                    onClick={() => toggle(option.value)}
                    className={
                      "flex w-full items-center gap-3 rounded-control px-2 py-1.5 text-left text-sm transition-colors hover:bg-background " +
                      (marcado ? "font-medium text-foreground" : "text-muted-foreground")
                    }
                  >
                    {/* La casilla es tateable: la vista del estado real, no
                        solo una barra de color. */}
                    <span
                      className={
                        "flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border " +
                        (marcado ? "border-primary bg-primary-soft" : "border-border bg-background")
                      }
                    >
                      {marcado ? <CheckIcon /> : null}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{option.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
