"use client";

import { useState } from "react";

import { SelectDropdown, type SelectOption } from "@/components/select-dropdown";

type Props = {
  name: string;
  id?: string;
  value: string;
  options: SelectOption[];
  emptyLabel?: string;
  kind: "category" | "area";
  onCreated?: (newId: string) => void;
  className?: string;
};

/**
 * Selector desplegable con opción de crear nueva categoría o área inline.
 *
 * Usa Server Actions `createCategory` / `createArea` para crear el elemento
 * sin salir del formulario. Al crear, el nuevo elemento se selecciona
 * automáticamente y se notifica al padre para que refresque la lista.
 */
export function InlineCreateSelect({
  name,
  id,
  value,
  options,
  emptyLabel = "Todos",
  kind,
  onCreated,
  className,
}: Props) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setCreating(true);
    setError(null);

    const formData = new FormData();
    formData.set("name", trimmed);

    try {
      const action = kind === "category" ? createCategoryInline : createAreaInline;
      const result = await action(formData);
      if (result.error) {
        setError(result.error);
        setCreating(false);
        return;
      }
      if (result.ok && result.id) {
        setNewName("");
        setOpen(false);
        onCreated?.(result.id);
      }
    } catch {
      setError("Error al crear.");
      setCreating(false);
    }
  };

  return (
    <div className={"relative " + className}>
      <SelectDropdown
        name={name}
        id={id}
        value={value}
        options={options}
        emptyLabel={emptyLabel}
        onValueChange={() => {}}
      />

      {/* Botón para abrir el panel de creación */}
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          setNewName("");
          setError(null);
        }}
        className="absolute right-8 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
        title={`+Nuevo ${kind === "category" ? "categoría" : "área"}`}
      >
        +
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-40 mt-2 w-56 rounded-card border border-border bg-surface p-3 shadow-lg">
          <p className="mb-2 text-xs font-medium">
            Crear {kind === "category" ? "categoría" : "área"}
          </p>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={`Nombre de la ${kind === "category" ? "categoría" : "área"}…`}
            className="w-full rounded-control border border-border bg-transparent px-3 py-1.5 text-sm"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
              if (e.key === "Escape") setOpen(false);
            }}
          />
          {error && <p className="mt-1 text-xs text-danger">{error}</p>}
          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-control border border-border bg-transparent px-3 py-1.5 text-xs text-muted-foreground hover:bg-background"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={creating || !newName.trim()}
              onClick={handleCreate}
              className="rounded-control bg-primary px-3 py-1.5 text-xs text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {creating ? "Creando…" : "Crear"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// Server Actions inline (se ejecutan en el navegador, no necesitan importación directa)
async function createCategoryInline(formData: FormData): Promise<{ error?: string; ok?: boolean; id?: string }> {
  const res = await fetch("/api/catalogs/category", {
    method: "POST",
    body: formData,
  });
  return res.json();
}

async function createAreaInline(formData: FormData): Promise<{ error?: string; ok?: boolean; id?: string }> {
  const res = await fetch("/api/catalogs/area", {
    method: "POST",
    body: formData,
  });
  return res.json();
}