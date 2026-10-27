"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { dangerButtonClass } from "@/lib/ui";

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

function PrintIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={iconCls} aria-hidden="true">
      <polyline points="6 9 6 2 18 2 18 9" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" />
    </svg>
  );
}

function XmlIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={iconCls} aria-hidden="true">
      <path d="M4 3h16a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
      <rect x="8" y="6" width="8" height="12" rx="1" ry="1" />
      <line x1="8" y1="10" x2="16" y2="10" />
      <line x1="12" y1="6" x2="12" y2="18" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={iconCls} aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={iconCls} aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  );
}

/**
 * Menú de acciones (⋮) para facturas de venta.
 * Incluye: editar, PDF, imprimir, marcar como cobrado, anular y eliminar.
 */
export function ActionsDropdown({
  editHref,
  pdfHref,
  printHref,
  deleteAction,
  deleteId,
  deleteMessage,
  onMarkPaid,
  confirming,
  onToggleConfirming,
  assignSalesperson,
  onAssignSalesperson,
  onCancel,
  fetchDefontana,
}: {
  editHref: string;
  pdfHref?: string;
  printHref?: string;
  deleteAction: (formData: FormData) => Promise<void>;
  deleteId: string;
  deleteMessage: string;
  onMarkPaid?: () => void;
  confirming?: boolean;
  onToggleConfirming?: () => void;
  assignSalesperson?: boolean;
  onAssignSalesperson?: () => void;
  onCancel?: () => void;
  fetchDefontana?: {
    id: string;
    fieldName: "purchaseId" | "saleId";
    action: (prev: any, formData: FormData) => Promise<any>;
    label?: string;
  };
}) {
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [fetchingDefontana, setFetchingDefontana] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const MENU_HEIGHT = 220;

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
            {printHref ? (
              <li>
                <Link
                  href={printHref}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-control px-2 py-1.5 text-sm text-foreground transition-colors hover:bg-background"
                >
                  <PrintIcon />
                  Imprimir
                </Link>
              </li>
            ) : null}
          </ul>
          <div className="mx-1 my-1 border-t border-border" />
          <ul className="flex flex-col">
            {onMarkPaid ? (
              <li>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    setOpen(false);
                    onMarkPaid();
                  }}
                  className="flex w-full items-center gap-3 rounded-control px-2 py-1.5 text-left text-sm text-success transition-colors hover:bg-success-soft"
                >
                  <CheckIcon />
                  Marcar como cobrado
                </button>
              </li>
            ) : null}
            {onToggleConfirming ? (
              <li>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    setOpen(false);
                    onToggleConfirming();
                  }}
                  className="flex w-full items-center gap-3 rounded-control px-2 py-1.5 text-left text-sm text-primary transition-colors hover:bg-primary-soft"
                >
                  <CheckIcon />
                  {confirming ? "Quitar Confirming" : "Marcar Confirming"}
                </button>
              </li>
            ) : null}
            {onAssignSalesperson ? (
              <li>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    onAssignSalesperson();
                  }}
                  className="flex w-full items-center gap-3 rounded-control px-2 py-1.5 text-left text-sm text-foreground transition-colors hover:bg-background"
                >
                  <PencilIcon />
                  Asignar vendedor
                </button>
              </li>
            ) : null}
            {onCancel ? (
              <li>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    setOpen(false);
                    onCancel();
                  }}
                  className="flex w-full items-center gap-3 rounded-control px-2 py-1.5 text-left text-sm text-danger transition-colors hover:bg-danger-soft"
                >
                  <XIcon />
                  Anular
                </button>
              </li>
            ) : null}
            {fetchDefontana ? (
              <li>
                <button
                  type="button"
                  disabled={fetchingDefontana}
                  onClick={() => {
                    setOpen(false);
                    setFetchingDefontana(true);
                    const formData = new FormData();
                    formData.set(fetchDefontana.fieldName, fetchDefontana.id);
                    startTransition(async () => {
                      try {
                        await fetchDefontana.action(undefined, formData);
                      } finally {
                        setFetchingDefontana(false);
                      }
                    });
                  }}
                  className="flex w-full items-center gap-3 rounded-control px-2 py-1.5 text-left text-sm text-primary transition-colors hover:bg-primary-soft disabled:opacity-60"
                >
                  <XmlIcon />
                  {fetchDefontana.label ?? "Traer XML de Defontana"}
                </button>
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
                  setOpen(false);
                  setConfirmOpen(true);
                }}
                className="flex w-full items-center gap-3 rounded-control px-2 py-1.5 text-left text-sm text-danger transition-colors hover:bg-danger-soft disabled:opacity-60"
              >
                <TrashIcon />
                Eliminar
              </button>
            </li>
          </ul>
        </div>
      ) : null}

      {confirmOpen ? (
        <ConfirmDialog
          title="Eliminar registro"
          description={deleteMessage}
          onCancel={() => setConfirmOpen(false)}
        >
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              setConfirmOpen(false);
              const data = new FormData();
              data.set("id", deleteId);
              startTransition(async () => {
                await deleteAction(data);
              });
            }}
            className={dangerButtonClass}
          >
            {pending ? "Eliminando…" : "Eliminar"}
          </button>
        </ConfirmDialog>
      ) : null}
    </div>
  );
}
