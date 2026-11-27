"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { toast } from "sonner";

import { activarObra } from "@/components/activar-obra";

/**
 * Dropdown de obras para la barra superior, con el mismo patrón del selector
 * de módulos: trigger con chevron, menú de tarjeta y navegación completa del
 * navegador (no una transición RSC) para que el cambio nunca se quede pegado.
 */
export function ObraSwitcher({
  obras,
  activeId,
}: {
  obras: { id: string; name: string }[];
  activeId: string | null;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const active = obras.find((obra) => obra.id === activeId) ?? obras[0];
  const otras = obras.filter((obra) => obra.id !== activeId);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const cambiar = async (event: MouseEvent<HTMLAnchorElement>, obraId: string) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    if (pending) return;
    setPending(obraId);
    try {
      const href = await activarObra(obraId, pathname);
      window.location.assign(href);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo cambiar de obra.");
      setPending(null);
    }
  };

  if (obras.length === 0) return null;

  if (obras.length === 1) {
    return (
      <span className="flex items-center gap-2 rounded-control border border-border bg-surface px-3 py-1.5 text-sm font-medium">
        {obras[0].name}
      </span>
    );
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-2 rounded-control border border-border bg-surface px-3 py-1.5 text-sm transition-colors hover:bg-background"
      >
        <span className="max-w-[10rem] truncate font-medium text-foreground">{active?.name}</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 opacity-60" aria-hidden="true">
          <path d="M7 15l5 5 5-5" /><path d="M7 9l5-5 5 5" />
        </svg>
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-40 mt-2 w-60 rounded-card border border-border bg-surface-elevated p-1 shadow-lg">
          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Obras</div>
          <ul className="flex flex-col">
            {otras.map((obra) => (
              <li key={obra.id}>
                <a
                  href="/obras/mis-obras"
                  aria-disabled={pending === obra.id}
                  onClick={(event) => cambiar(event, obra.id)}
                  className="flex w-full items-center rounded-control px-2 py-1.5 text-left text-sm text-foreground transition-colors hover:bg-background aria-disabled:opacity-60"
                >
                  <span className="flex-1 truncate font-medium">{obra.name}</span>
                  {pending === obra.id ? <span className="text-xs text-muted-foreground">…</span> : null}
                </a>
              </li>
            ))}
          </ul>
          <div className="mx-1 my-1 border-t border-border" />
          <Link
            href="/obras/mis-obras"
            onClick={() => setOpen(false)}
            className="flex items-center rounded-control px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
          >
            Todas las obras
          </Link>
        </div>
      ) : null}
    </div>
  );
}
