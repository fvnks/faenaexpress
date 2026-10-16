// Los listados de compras y ventas se ordenan completos en el servidor (los
// comparadores son propios: texto en español, folios numéricos, orden de
// estado) y se cortan en páginas. Antes se renderizaban cientos de filas de
// una sola vez.
export const PAGE_SIZE = 50;

export function parsePage(value: string | undefined): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

export function paginate<T>(
  rows: T[],
  page: number,
): { items: T[]; page: number; pageCount: number } {
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const current = Math.min(Math.max(1, page), pageCount);

  return {
    items: rows.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE),
    page: current,
    pageCount,
  };
}

/** Enlace de página conservando los filtros y el orden de la URL actual. */
export function pageHref(
  pathname: string,
  params: Record<string, string | string[] | undefined>,
  target: number,
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (key === "pagina") continue;
    if (Array.isArray(value)) {
      for (const item of value) search.append(key, item);
    } else if (value !== undefined && value !== "") {
      search.set(key, value);
    }
  }
  if (target > 1) search.set("pagina", String(target));

  const query = search.toString();
  return query ? `${pathname}?${query}` : pathname;
}
