// Ordenamiento de listados: estado en la URL (`orden` + `dir`) para que el
// enlace sea compartible y sobreviva al filtrado. Los comparadores corren en
// el servidor porque los listados ya traen todas las filas (sin paginar).

export type SortDir = "asc" | "desc";

export function parseSortDir(value: unknown): SortDir {
  return value === "desc" ? "desc" : "asc";
}

/** Texto en español, sin distinguir mayúsculas ni acentos. */
export function compareText(a: string | null | undefined, b: string | null | undefined): number {
  return (a ?? "").localeCompare(b ?? "", "es", { sensitivity: "base", numeric: true });
}

/**
 * Folios: si ambos son números puros se comparan como número (20 va después
 * de 9, no antes como haría un texto). Si no, se comparan como texto.
 */
export function compareFolio(a: string | null | undefined, b: string | null | undefined): number {
  const sa = (a ?? "").trim();
  const sb = (b ?? "").trim();
  const na = /^\d+$/.test(sa) ? Number(sa) : null;
  const nb = /^\d+$/.test(sb) ? Number(sb) : null;
  if (na !== null && nb !== null) return na - nb;
  return compareText(sa, sb);
}

/**
 * Enlace para ordenar por `key` conservando los filtros actuales. Si la
 * columna ya está activa, invierte la dirección (arriba ↔ abajo); si no,
 * empieza ascendente. Ordenar de nuevo vuelve a la primera página.
 */
export function sortHref(
  pathname: string,
  params: Record<string, string | string[] | undefined>,
  key: string,
  activeKey: string,
  activeDir: SortDir,
): { href: string; dir: SortDir; active: boolean } {
  const active = activeKey === key;
  const dir: SortDir = active && activeDir === "asc" ? "desc" : "asc";

  const search = new URLSearchParams();
  for (const [rawKey, value] of Object.entries(params)) {
    if (rawKey === "orden" || rawKey === "dir" || rawKey === "pagina") continue;
    if (Array.isArray(value)) {
      for (const item of value) search.append(rawKey, item);
    } else if (value !== undefined && value !== "") {
      search.set(rawKey, value);
    }
  }
  search.set("orden", key);
  search.set("dir", dir);

  return { href: `${pathname}?${search.toString()}`, dir, active };
}
