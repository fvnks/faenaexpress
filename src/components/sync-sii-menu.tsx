"use client";

import { useEffect, useRef, useState } from "react";

import { quickSyncRcv } from "@/app/actions/sii";
import { SubmitButton } from "@/components/submit-button";
import { currentPeriod, formatPeriod, shiftPeriod } from "@/lib/money";

/**
 * Botón "Sincronizar SII" con dropdown de meses: el usuario elige qué
 * período sincronizar antes de disparar la acción. Muestra los últimos
 * 12 meses (el actual primero).
 *
 * `tipos` limita qué se importa: desde la pantalla de Guías se pide solo el
 * tipo 50 (guía de despacho), para no volver a traer las facturas del mes.
 * `destino` es a dónde vuelve el usuario.
 */
export function SyncSiiMenu({
  side,
  buttonClass,
  tipos,
  destino,
  etiqueta = "Sincronizar SII",
}: {
  side: "COMPRA" | "VENTA";
  buttonClass: string;
  tipos?: string;
  destino?: string;
  etiqueta?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

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

  // Últimos 12 meses, el actual primero.
  const hoy = currentPeriod();
  const periodos = Array.from({ length: 12 }, (_, i) => shiftPeriod(hoy, -i));

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((v) => !v)}
        className={buttonClass + " flex items-center gap-1"}
      >
        <span>{etiqueta}</span>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={"h-3 w-3 shrink-0 opacity-50 transition-transform duration-200 " + (open ? "rotate-180" : "")}
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-40 mt-1 w-44 rounded-card border border-border bg-surface p-1 shadow-lg">
          <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">
            Período
          </div>
          <ul className="flex max-h-56 flex-col overflow-y-auto">
            {periodos.map((periodo) => (
              <li key={periodo}>
                <form action={quickSyncRcv}>
                  <input type="hidden" name="side" value={side} />
                  <input type="hidden" name="periodo" value={periodo} />
                  {tipos ? <input type="hidden" name="tipos" value={tipos} /> : null}
                  {destino ? <input type="hidden" name="destino" value={destino} /> : null}
                  <SubmitButton
                    pendingLabel="…"
                    className={
                      "flex w-full items-center gap-1 rounded-control px-2 py-1.5 text-left text-sm transition-colors hover:bg-background " +
                      (periodo === hoy ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground")
                    }
                  >
                    {formatPeriod(periodo)}
                    {periodo === hoy ? (
                      <span className="ml-auto text-[9px] font-semibold uppercase tracking-wide text-primary">hoy</span>
                    ) : null}
                  </SubmitButton>
                </form>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
