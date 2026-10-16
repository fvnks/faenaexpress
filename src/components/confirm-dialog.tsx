"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

import { secondaryButtonClass } from "@/lib/ui";

/**
 * Diálogo de confirmación del sistema, en reemplazo de `window.confirm`.
 * El botón de confirmar lo pone quien lo usa, así el mismo diálogo sirve para
 * enviar un formulario (`type="submit"`) o para disparar una acción directa.
 */
export function ConfirmDialog({
  title,
  description,
  onCancel,
  children,
}: {
  title: string;
  description: string;
  onCancel: () => void;
  children: ReactNode;
}) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  // Foco al abrir: así Escape y el tabulador no se quedan en la página de fondo.
  useEffect(() => {
    panelRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 p-4">
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-sm rounded-card border border-border bg-surface p-4 shadow-lg outline-none"
      >
        <h2 id={titleId} className="text-base font-semibold">
          {title}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className={secondaryButtonClass}>
            Cancelar
          </button>
          {children}
        </div>
      </div>
    </div>
  );
}
