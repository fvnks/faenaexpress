"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { DateRangeFilter } from "@/components/date-range-filter";
import { SelectDropdown, type SelectOption } from "@/components/select-dropdown";
import { cardClass, controlClass, labelClass, secondaryButtonClass } from "@/lib/ui";

export type FilterField =
  | { kind: "text"; name: string; label: string; placeholder?: string; grow?: boolean }
  | {
      kind: "select";
      name: string;
      label: string;
      options: SelectOption[];
      emptyLabel?: string;
      width?: string;
    };

const DATE_KEYS = ["desde", "hasta"];

/**
 * Barra de filtros que vive en la URL. Todo se aplica al instante con
 * navegación de cliente (`router`), así que escribir no recarga la página y
 * las fechas ya no se pierden al filtrar. Limpiar deja la URL sin filtros
 * pero conserva el ordenamiento.
 *
 * No usa `<form>`: al ser inputs controlados por React, el componente global
 * `LiveSearchInputs` (que auto-envía formularios GET) no la toca.
 */
export function FilterBar({ fields }: { fields: FilterField[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Base siempre actual: evita que un commit diferido (debounce del texto)
  // pise con parámetros viejos otro filtro recién aplicado.
  const base = useRef(searchParams.toString());
  useEffect(() => {
    base.current = searchParams.toString();
  }, [searchParams]);

  const filterKeys = [...fields.map((field) => field.name), ...DATE_KEYS];

  const navigate = (params: URLSearchParams, mode: "push" | "replace") => {
    const query = params.toString();
    const url = query ? `${pathname}?${query}` : pathname;
    router[mode](url, { scroll: false });
  };

  const apply = (key: string, value: string, mode: "push" | "replace" = "push") => {
    const params = new URLSearchParams(base.current);
    if (value) params.set(key, value);
    else params.delete(key);
    // Al cambiar un filtro se vuelve a la primera página: la número anterior
    // puede quedar vacía con el nuevo conjunto de resultados.
    params.delete("pagina");
    navigate(params, mode);
  };

  const clear = () => {
    const params = new URLSearchParams(base.current);
    for (const key of filterKeys) params.delete(key);
    params.delete("pagina");
    navigate(params, "push");
  };

  const hasFilters = filterKeys.some((key) => (searchParams.get(key) ?? "") !== "");

  return (
    <div className={cardClass + " flex flex-wrap items-end gap-3 p-4"}>
      {fields.map((field) =>
        field.kind === "text" ? (
          <div
            key={field.name}
            className={"flex min-w-[12rem] flex-col gap-1 " + (field.grow ? "flex-1" : "")}
          >
            <label htmlFor={field.name} className={labelClass}>
              {field.label}
            </label>
            <TextFilter
              id={field.name}
              initial={searchParams.get(field.name) ?? ""}
              placeholder={field.placeholder}
              onCommit={(value) => apply(field.name, value, "replace")}
            />
          </div>
        ) : (
          <div key={field.name} className={"flex flex-col gap-1 " + (field.width ?? "w-full sm:w-48")}>
            <label htmlFor={field.name} className={labelClass}>
              {field.label}
            </label>
            <SelectDropdown
              id={field.name}
              name={field.name}
              value={searchParams.get(field.name) ?? ""}
              emptyLabel={field.emptyLabel ?? "Todos"}
              options={field.options}
              onValueChange={(value) => apply(field.name, value)}
            />
          </div>
        ),
      )}

      <DateRangeFilter
        from={searchParams.get("desde") ?? undefined}
        to={searchParams.get("hasta") ?? undefined}
      />

      {hasFilters ? (
        <div className="flex items-end">
          <button type="button" onClick={clear} className={secondaryButtonClass}>
            Limpiar
          </button>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Input de texto con debounce (350 ms) y Enter para aplicar al instante.
 * El valor base sale de la URL, pero mientras se escribe el estado local manda
 * para no perder el cursor ni la última tecla.
 */
function TextFilter({
  id,
  initial,
  placeholder,
  onCommit,
}: {
  id: string;
  initial: string;
  placeholder?: string;
  onCommit: (value: string) => void;
}) {
  const [text, setText] = useState(initial);
  const [seen, setSeen] = useState(initial);
  const [pushed, setPushed] = useState(initial);
  const timer = useRef<number | undefined>(undefined);

  // Adoptar cambios externos (Limpiar, botón atrás) sin pisar lo que se escribe.
  if (initial !== seen) {
    setSeen(initial);
    if (initial !== pushed) {
      setPushed(initial);
      setText(initial);
    }
  }

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const commit = (value: string) => {
    setPushed(value);
    onCommit(value);
  };

  return (
    <input
      id={id}
      type="search"
      value={text}
      placeholder={placeholder}
      onChange={(event) => {
        const value = event.target.value;
        setText(value);
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => commit(value), 350);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          window.clearTimeout(timer.current);
          commit(text);
        }
      }}
      className={controlClass}
    />
  );
}
