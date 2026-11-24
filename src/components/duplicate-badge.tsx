"use client";

/** Aviso en una fila de que otro documento de la lista parece el mismo. */
export function DuplicateBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span
      title={`${count} ${count === 1 ? "otro documento" : "otros documentos"} con el mismo RUT, folio y monto`}
      className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-medium text-accent"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3" aria-hidden="true">
        <path d="M12 9v4M12 17h.01" />
        <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
      </svg>
      Posible duplicado{count > 1 ? ` ×${count}` : ""}
    </span>
  );
}
