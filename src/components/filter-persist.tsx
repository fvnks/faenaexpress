"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const STORAGE_KEY = "facturas-filters";

/**
 * Persistencia de filtros: guarda los parámetros de búsqueda en localStorage
 * y los restaura al montar el componente. El usuario puede limpiarlos
 * manualmente desde la UI o con ClearFiltersButton.
 *
 * Uso en un Server Component:
 *   <FilterPersist router="/dashboard/ventas" />
 */
export function FilterPersist({ router }: { router: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Restore filters on mount
  useEffect(() => {
    const stored: Record<string, string> = {};
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) Object.assign(stored, JSON.parse(raw));
    } catch {}

    const keys = Object.keys(stored).filter((key) => key.startsWith(router + "?"));
    if (keys.length === 0) return;

    const params = new URLSearchParams();
    for (const key of keys) {
      const storedParams = new URLSearchParams(stored[key]);
      storedParams.forEach((value, param) => {
        if (!params.has(param)) params.set(param, value);
      });
    }

    const url = new URL(window.location.href);
    params.forEach((value, key) => url.searchParams.set(key, value));
    window.history.replaceState(null, "", url.toString());
  }, [router]);

  // Save filters whenever pathname or searchParams change
  useEffect(() => {
    if (pathname !== router) return;
    const params = new URLSearchParams(searchParams.toString());
    if (params.toString() === "") return;

    const stored: Record<string, string> = {};
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) Object.assign(stored, JSON.parse(raw));
    } catch {}

    stored[router + "?" + params.toString()] = params.toString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  }, [pathname, searchParams, router]);

  return null;
}

/** Botón de limpiar filtros guardados. */
export function ClearFiltersButton({ router }: { router: string }) {
  const clear = () => {
    const stored: Record<string, string> = {};
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) Object.assign(stored, JSON.parse(raw));
    } catch {}

    const keysToRemove = Object.keys(stored).filter((key) => key.startsWith(router + "?"));
    keysToRemove.forEach((key) => delete stored[key]);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    window.location.href = router;
  };

  return (
    <button
      type="button"
      onClick={clear}
      className="rounded-md border border-border bg-transparent px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted"
    >
      Limpiar filtros
    </button>
  );
}