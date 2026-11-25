"use client";

import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";

export type SelectOption = { value: string; label: string };

export function ChevronsUpDown() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden="true">
      <path d="M7 15l5 5 5-5" /><path d="M7 9l5-5 5 5" />
    </svg>
  );
}

export function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0 text-primary" aria-hidden="true">
      <path d="M20 6L9 15l-5-5" />
    </svg>
  );
}

/**
 * Selector desplegable con el mismo patrón visual del selector de empresas:
 * trigger de contorno con chevron doble y menú de tarjeta con check en la
 * opción activa. Reemplaza al <select> nativo en filtros y formularios.
 *
 * El valor viaja en un input oculto, así funciona igual en formularios GET
 * (filtros) y en formularios de server actions (formularios de registro).
 *
 * Al abrir se puede escribir para filtrar las opciones por etiqueta o valor
 * (útil en catálogos grandes: categorías, áreas, centros de costo). Enter
 * elige la primera coincidencia y Escape cierra sin cambiar el valor.
 */
export function SelectDropdown({
  name,
  id,
  value,
  options,
  emptyLabel = "Todos",
  allowEmpty = true,
  onValueChange,
  className = "",
  disabled = false,
}: {
  name: string;
  id?: string;
  value: string;
  options: SelectOption[];
  emptyLabel?: string;
  allowEmpty?: boolean;
  onValueChange?: (value: string) => void;
  className?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(value);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Tras navegar (filtros), el server component entrega un nuevo value.
  // Ajuste de estado durante el render: patrón recomendado en vez de un effect.
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    setSelected(value);
  }

  useEffect(() => {
    setQuery("");
    if (open) searchRef.current?.focus();
  }, [open]);

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

  const selectedLabel =
    selected === ""
      ? emptyLabel
      : options.find((option) => option.value === selected)?.label ?? emptyLabel;

  const normalizar = (texto: string) => texto.trim().toLocaleLowerCase("es");
  const busqueda = normalizar(query);
  const visibles = busqueda
    ? options.filter(
        (option) =>
          normalizar(option.label).includes(busqueda) ||
          normalizar(option.value).includes(busqueda),
      )
    : options;
  const mostrarVacio = allowEmpty && (!busqueda || normalizar(emptyLabel).includes(busqueda));

  function elegir(valor: string) {
    setSelected(valor);
    setOpen(false);
    onValueChange?.(valor);
  }

  function alEscribir(event: ReactKeyboardEvent<HTMLInputElement>) {
    // Evita que Enter envíe el formulario (filtros GET y server actions).
    if (event.key === "Enter") {
      event.preventDefault();
      if (visibles.length > 0) elegir(visibles[0].value);
      else if (mostrarVacio) elegir("");
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      rootRef.current?.querySelector<HTMLButtonElement>('[role="option"]')?.focus();
    }
  }

  return (
    <div ref={rootRef} className={"relative " + className}>
      <button
        type="button"
        id={id}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 rounded-control border border-border bg-surface px-3 py-2 text-sm text-foreground transition-colors hover:bg-background disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className={"min-w-0 flex-1 truncate text-left " + (selected === "" ? "text-muted-foreground" : "")}>
          {selectedLabel}
        </span>
        <ChevronsUpDown />
      </button>
      <input type="hidden" name={name} value={selected} />

      {open ? (
        <div className="absolute right-0 top-full z-40 mt-2 w-56 rounded-card border border-border bg-surface-elevated p-2 shadow-lg">
          <input
            ref={searchRef}
            type="search"
            data-live="off"
            role="combobox"
            aria-label="Buscar opción"
            aria-expanded={true}
            aria-controls={`${name}-listbox`}
            autoComplete="off"
            placeholder="Buscar…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={alEscribir}
            className="mb-1 w-full rounded-control border border-border bg-background px-2 py-1.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary"
          />
          <ul id={`${name}-listbox`} role="listbox" className="flex max-h-64 flex-col overflow-y-auto">
            {mostrarVacio ? (
              <li>
                <button
                  type="button"
                  role="option"
                  aria-selected={selected === ""}
                  onClick={() => elegir("")}
                  className={"flex w-full items-center gap-3 rounded-control px-2 py-1.5 text-left text-sm transition-colors hover:bg-background " + (selected === "" ? "font-medium text-foreground" : "text-muted-foreground")}
                >
                  <span className="min-w-0 flex-1 truncate">{emptyLabel}</span>
                  {selected === "" ? <CheckIcon /> : null}
                </button>
              </li>
            ) : null}
            {visibles.map((option) => {
              const isActive = option.value === selected;
              return (
                <li key={option.value}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    onClick={() => elegir(option.value)}
                    className={"flex w-full items-center gap-3 rounded-control px-2 py-1.5 text-left text-sm transition-colors hover:bg-background " + (isActive ? "font-medium text-foreground" : "text-muted-foreground")}
                  >
                    <span className="min-w-0 flex-1 truncate">{option.label}</span>
                    {isActive ? <CheckIcon /> : null}
                  </button>
                </li>
              );
            })}
            {!mostrarVacio && visibles.length === 0 ? (
              <li className="px-2 py-2 text-xs text-muted-foreground">Sin coincidencias</li>
            ) : null}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
