"use client";

import { useActionState, useCallback, useEffect, useRef, useState, startTransition } from "react";

import { searchPartnersAction } from "@/app/actions/partners";

type AutocompletePartnerProps = {
  label: "Cliente" | "Proveedor";
  initialPartnerId?: string;
  initialPartnerName?: string;
  onSelect: (partnerId: string, rut: string, name: string) => void;
};

/**
 * Componente de autocompletado para Cliente o Proveedor.
 *
 * Muestra un campo de búsqueda por RUT o nombre. Al seleccionar un resultado,
 * actualiza el campo `partnerId` (hidden) y ejecuta el callback `onSelect`.
 *
 * La búsqueda pasa por una Server Action (searchPartnersAction) para no
 * arrastrar el driver de BD al bundle del navegador.
 *
 * Al enfocar el campo con la consulta vacía, muestra todos los proveedores/clientes
 * (lista completa) para permitir selección directa.
 */
export function AutocompletePartner({
  label,
  initialPartnerId,
  initialPartnerName,
  onSelect,
}: AutocompletePartnerProps) {
  const [query, setQuery] = useState("");
  const [touched, setTouched] = useState(false);
  const [selectedPartnerId, setSelectedPartnerId] = useState(initialPartnerId ?? "");
  const [options, setOptions] = useState<{ id: string; name: string; rut: string }[]>([]);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimeout = useRef<number | null>(null);

  const form = new FormData();
  form.append("q", query);
  form.append("kind", label === "Cliente" ? "customers" : "suppliers");
  const [state, formAction] = useActionState<
    { results: { id: string; name: string; rut: string }[] },
    FormData
  >(searchPartnersAction, { results: [] });

  useEffect(() => {
    if (state.results) {
      setTimeout(() => {
        setOptions(state.results);
        setOpen(state.results.length > 0);
      }, 0);
    }
  }, [state.results]);

  useEffect(() => {
    return () => {
      if (debounceTimeout.current != null) clearTimeout(debounceTimeout.current);
    };
  }, []);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    if (debounceTimeout.current != null) clearTimeout(debounceTimeout.current);
    debounceTimeout.current = window.setTimeout(() => {
      form.set("q", value);
      startTransition(() => {
        formAction(form);
      });
    }, 300);
  };

  const onFocus = () => {
    if (query.trim() === "") {
      startTransition(() => {
        formAction(form);
      });
    }
  };

  const onBlur = () => {
    setTimeout(() => {
      setOpen(false);
    }, 200);
  };

  const handleOptionSelect = useCallback(
    (partner: { id: string; name: string; rut: string }) => {
      setSelectedPartnerId(partner.id);
      onSelect(partner.id, partner.rut, partner.name);
      // Deja visible el nombre del tercero elegido.
      setQuery(partner.name);
      setTouched(true);
      setOpen(false);
    },
    [onSelect]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        if (open && options.length > 0) {
          const selected = options[0];
          handleOptionSelect(selected);
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, options, handleOptionSelect]);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  return (
    <div className="relative w-full">
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground uppercase">{label}</label>

        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            placeholder={`RUT o nombre de ${label.toLowerCase()}`}
            value={query !== "" ? query : !touched && initialPartnerName ? initialPartnerName : ""}
            onChange={(e) => {
              setTouched(true);
              onInputChange(e);
            }}
            onFocus={onFocus}
            onBlur={onBlur}
            className="w-full rounded-control border border-border bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-autocomplete="list"
            aria-controls="autocomplete-partner-list"
            aria-label="Buscar cliente"
          />

          {open && options.length > 0 && (
            <div
              id="autocomplete-partner-list"
              role="listbox"
              className="absolute top-full left-0 z-20 mt-2 w-full max-h-64 overflow-y-auto rounded-card border border-border bg-surface p-1 shadow-lg"
            >
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                Resultados
              </div>
              {options.map((partner) => (
                <div
                  key={partner.id}
                  role="option"
                  aria-selected={selectedPartnerId === partner.id}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleOptionSelect(partner);
                  }}
                  className="flex cursor-pointer items-center gap-3 rounded-control px-2 py-1.5 text-sm transition-colors hover:bg-background"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-foreground">{partner.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">{partner.rut}</span>
                  </span>
                  {selectedPartnerId === partner.id ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0 text-primary" aria-hidden="true">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <input
        type="hidden"
        name="partnerId"
        value={selectedPartnerId}
        className="hidden"
      />
    </div>
  );
}