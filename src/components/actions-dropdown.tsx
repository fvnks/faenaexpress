"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";

const iconCls = "h-4 w-4 shrink-0";

function EllipsisIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
      <circle cx="12" cy="5" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="12" cy="19" r="1" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={iconCls} aria-hidden="true">
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={iconCls} aria-hidden="true">
      <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </svg>
  );
}

function PdfIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={iconCls} aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="12" y1="18" x2="12" y2="12" />
      <polyline points="9 15 12 12 15 15" />
    </svg>
  );
}

/**
 * Menú de acciones (⋮) con opciones de editar, descargar PDF y eliminar.
 */
export function ActionsDropdown({
  editHref,
  pdfHref,
  deleteAction,
  deleteId,
  deleteMessage,
}: {
  editHref: string;
  pdfHref?: string;
  deleteAction: (formData: FormData) => Promise<void>;
  deleteId: string;
  deleteMessage: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  // Las tablas tienen scroll horizontal: un dropdown absolute queda recortado
  // por el contenedor. Se posiciona fixed respecto al viewport, alineado a la
  // derecha del botón y con clamp para no salirse de la pantalla. Si no hay
  // espacio debajo (última fila), se abre hacia arriba.
  const MENU_HEIGHT = 150;

  const openMenu = () => {
    if (open) {
      setOpen(false);
      return;
    }
    const rect = rootRef.current?.getBoundingClientRect();
    const width = 224; // w-56
    const left = rect
      ? Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8))
      : 0;

    const spaceBelow = window.innerHeight - (rect?.bottom ?? 0);
    const openUpward = spaceBelow < MENU_HEIGHT + 16 && (rect?.top ?? 0) > MENU_HEIGHT + 16;

    setPos({
      top: openUpward
        ? Math.max(8, (rect?.top ?? 0) - MENU_HEIGHT - 8)
        : (rect?.bottom ?? 0) + 8,
      left,
    });
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const close = () => setOpen(false);
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="Más acciones"
        onClick={openMenu}
        className="flex h-9 w-9 items-center justify-center rounded-control border border-border bg-surface text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
      >
        <EllipsisIcon />
      </button>

      {open && pos ? (
        <div
          className="fixed z-50 w-56 rounded-card border border-border bg-surface p-1 shadow-lg"
          style={{ top: pos.top, left: pos.left }}
        >
          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
            Acciones
          </div>
          <ul className="flex flex-col">
            <li>
              <Link
                href={editHref}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-control px-2 py-1.5 text-sm text-foreground transition-colors hover:bg-background"
              >
                <PencilIcon />
                Editar
              </Link>
            </li>
            {pdfHref ? (
              <li>
                <a
                  href={pdfHref}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-control px-2 py-1.5 text-sm text-foreground transition-colors hover:bg-background"
                >
                  <PdfIcon />
                  Descargar PDF
                </a>
              </li>
            ) : null}
          </ul>
          <div className="mx-1 my-1 border-t border-border" />
          <ul className="flex flex-col">
            <li>
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  if (!window.confirm(deleteMessage)) return;
                  setOpen(false);
                  const data = new FormData();
                  data.set("id", deleteId);
                  startTransition(async () => {
                    await deleteAction(data);
                  });
                }}
                className="flex w-full items-center gap-3 rounded-control px-2 py-1.5 text-left text-sm text-danger transition-colors hover:bg-danger-soft disabled:opacity-60"
              >
                <TrashIcon />
                {pending ? "Eliminando…" : "Eliminar"}
              </button>
            </li>
          </ul>
        </div>
      ) : null}
    </div>
  );
}