import Link from "next/link";

import { PAGE_SIZE, pageHref } from "@/lib/pagination";

const linkClass =
  "rounded-control border border-border px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-background";
const offClass =
  "rounded-control border border-border px-3 py-1.5 text-sm text-muted-foreground opacity-60";

/**
 * Paginación de los listados largos. Son enlaces normales, así que conservan
 * los filtros y el orden que ya viven en la URL. Con una sola página no se
 * muestra nada.
 */
export function Pagination({
  pathname,
  params,
  page,
  pageCount,
  total,
}: {
  pathname: string;
  params: Record<string, string | string[] | undefined>;
  page: number;
  pageCount: number;
  total: number;
}) {
  if (pageCount <= 1) return null;

  const from = (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);

  return (
    <nav className="flex flex-wrap items-center justify-between gap-3" aria-label="Paginación">
      <p className="text-sm text-muted-foreground">
        Mostrando <span className="tabular">{from}</span>–<span className="tabular">{to}</span> de{" "}
        <span className="tabular">{total}</span>
      </p>
      <div className="flex items-center gap-2">
        {page > 1 ? (
          <Link href={pageHref(pathname, params, page - 1)} rel="prev" className={linkClass}>
            Anterior
          </Link>
        ) : (
          <span aria-disabled="true" className={offClass}>
            Anterior
          </span>
        )}
        <span className="text-sm text-muted-foreground">
          Página <span className="tabular">{page}</span> de{" "}
          <span className="tabular">{pageCount}</span>
        </span>
        {page < pageCount ? (
          <Link href={pageHref(pathname, params, page + 1)} rel="next" className={linkClass}>
            Siguiente
          </Link>
        ) : (
          <span aria-disabled="true" className={offClass}>
            Siguiente
          </span>
        )}
      </div>
    </nav>
  );
}
