"use client";

import { useEffect, useState } from "react";

export type Density = "compact" | "comfortable";

type Preferences = {
  hidden: string[];
  density: Density;
};

const KEY = "facturas_list_prefs";

/**
 * Preferencias de la lista (columnas visibles y densidad) persistidas en
 * localStorage por sección. No toca la URL: es una preferencia de UX, no un
 * filtro, así no ensucia los bookmarks ni las vistas guardadas.
 */
export function useListPreferences(section: string, allColumns: string[]) {
  const [prefs, setPrefs] = useState<Preferences>({ hidden: [], density: "compact" });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      const parsed = raw ? (JSON.parse(raw) as Record<string, Preferences>) : {};
      setPrefs(parsed[section] ?? { hidden: [], density: "compact" });
    } catch {
      setPrefs({ hidden: [], density: "compact" });
    }
  }, [section]);

  const update = (next: Preferences) => {
    setPrefs(next);
    try {
      const raw = localStorage.getItem(KEY);
      const parsed = raw ? (JSON.parse(raw) as Record<string, Preferences>) : {};
      parsed[section] = next;
      localStorage.setItem(KEY, JSON.stringify(parsed));
    } catch {
      // localStorage bloqueado: la preferencia vive solo en esta sesión.
    }
  };

  return {
    hidden: prefs.hidden,
    density: prefs.density,
    isVisible: (column: string) => !prefs.hidden.includes(column),
    toggleColumn: (column: string) =>
      update({
        ...prefs,
        hidden: prefs.hidden.includes(column)
          ? prefs.hidden.filter((c) => c !== column)
          : [...prefs.hidden, column],
      }),
    setDensity: (density: Density) => update({ ...prefs, density }),
    reset: () => update({ hidden: [], density: "compact" }),
    allColumns,
  };
}

/** Control de columnas + densidad para la barra de herramientas de la lista. */
export function ListPreferencesMenu({
  section,
  columns,
  prefs,
}: {
  section: string;
  columns: Array<{ key: string; label: string }>;
  prefs: ReturnType<typeof useListPreferences>;
}) {
  return (
    <details className="relative">
      <summary className={["cursor-pointer list-none rounded-control border border-border bg-surface px-3 py-1.5 text-sm text-foreground hover:border-primary/60", "[&::-webkit-details-marker]:hidden"].join(" ")}>
        Vista
      </summary>
      <div className="absolute right-0 top-full z-40 mt-2 w-60 rounded-card border border-border bg-surface p-2 shadow-lg">
        <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-subtle">
          Columnas / {section}
        </p>
        <ul className="flex flex-col gap-0.5">
          {columns.map((col) => (
            <li key={col.key}>
              <label className="flex cursor-pointer items-center gap-2 rounded-control px-1.5 py-1 text-sm text-foreground hover:bg-background">
                <input
                  type="checkbox"
                  checked={prefs.isVisible(col.key)}
                  onChange={() => prefs.toggleColumn(col.key)}
                  className="h-3.5 w-3.5 accent-primary"
                />
                {col.label}
              </label>
            </li>
          ))}
        </ul>
        <div className="mt-2 border-t border-border pt-2">
          <p className="mb-1.5 font-mono text-[10px] uppercase tracking-widest text-subtle">Densidad</p>
          <div className="flex gap-1">
            {(["compact", "comfortable"] as const).map((density) => (
              <button
                key={density}
                type="button"
                onClick={() => prefs.setDensity(density)}
                className={[
                  "flex-1 rounded-control border px-2 py-1 text-xs",
                  prefs.density === density
                    ? "border-primary bg-primary-soft text-primary"
                    : "border-border text-muted-foreground hover:border-primary/60",
                ].join(" ")}
              >
                {density === "compact" ? "Compacta" : "Cómoda"}
              </button>
            ))}
          </div>
        </div>
        <button type="button" onClick={prefs.reset} className="mt-2 w-full text-left text-xs text-muted-foreground hover:text-primary">
          Restablecer
        </button>
      </div>
    </details>
  );
}

/** Clase de padding para filas según densidad. */
export function rowPadding(density: Density) {
  return density === "compact" ? "px-3 py-2" : "px-4 py-4";
}
