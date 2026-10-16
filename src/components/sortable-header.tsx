import Link from "next/link";

import type { SortDir } from "@/lib/sort";

// Icono funcional de orden: dos chevrones; el que corresponde a la dirección
// activa se marca con el color de marca, el otro queda tenue.
function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  const up = active && dir === "asc" ? "text-primary" : "opacity-40";
  const down = active && dir === "desc" ? "text-primary" : "opacity-40";
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5 shrink-0"
      aria-hidden="true"
    >
      <path d="M8 10l4-4 4 4" className={up} />
      <path d="M16 14l-4 4-4-4" className={down} />
    </svg>
  );
}

/**
 * Encabezado de tabla ordenable. Es un enlace normal: al hacer clic navega a
 * la misma lista con `orden`/`dir` en la URL y conserva los filtros.
 */
export function SortableHeader({
  label,
  href,
  active,
  dir,
  align = "left",
  className,
}: {
  label: string;
  href: string;
  active: boolean;
  dir: SortDir;
  align?: "left" | "right";
  className?: string;
}) {
  // `dir` es la dirección que aplicará el enlace (el próximo clic). El estado
  // actual de la columna es la opuesta cuando está activa: `aria-sort`, el
  // ícono y el texto para lectores de pantalla describen el estado actual.
  const currentDir: SortDir = dir === "asc" ? "desc" : "asc";

  return (
    <th
      scope="col"
      aria-sort={active ? (currentDir === "asc" ? "ascending" : "descending") : "none"}
      className={
        "px-3 py-2 font-medium " + (align === "right" ? "text-right " : "") + (className ?? "")
      }
    >
      <Link
        href={href}
        className={
          "inline-flex items-center gap-1 underline-offset-2 transition-colors hover:text-foreground " +
          (active ? "text-foreground" : "text-muted-foreground")
        }
      >
        <span>{label}</span>
        <SortIcon active={active} dir={currentDir} />
        <span className="sr-only">
          {active
            ? currentDir === "asc"
              ? "Ordenado ascendente. Presiona para invertir."
              : "Ordenado descendente. Presiona para invertir."
            : "Ordenar por esta columna."}
        </span>
      </Link>
    </th>
  );
}
