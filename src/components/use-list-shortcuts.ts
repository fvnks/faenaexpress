"use client";

import { useEffect } from "react";

/**
 * Atajos de teclado para listas de movimientos:
 *   /           enfoca el buscador
 *   j / ↓       fila siguiente
 *   k / ↑       fila anterior
 *   x           selecciona/deselecciona la fila activa
 *   Enter       abre la fila activa (primer enlace)
 *   Esc         limpia la selección de filas
 *
 * No se activa mientras se escribe en un input/textarea/select ni con
 * modificadores, para no interferir con el navegador ni con formularios.
 */
export function useListShortcuts({
  searchId = "q",
  rowSelector = "tbody tr",
  enabled = true,
}: {
  searchId?: string;
  rowSelector?: string;
  enabled?: boolean;
} = {}) {
  useEffect(() => {
    if (!enabled) return;

    const isTyping = (target: EventTarget | null) => {
      const el = target as HTMLElement | null;
      if (!el) return false;
      return (
        el.isContentEditable ||
        ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName) ||
        el.getAttribute("role") === "dialog"
      );
    };

    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || isTyping(event.target)) return;

      const rows = Array.from(document.querySelectorAll<HTMLElement>(rowSelector)).filter(
        (row) => row.offsetParent !== null,
      );
      if (rows.length === 0) return;

      const active = document.activeElement as HTMLElement | null;
      const currentIndex = rows.findIndex((row) => row === active || row.contains(active));

      if (event.key === "/") {
        const search = document.getElementById(searchId) as HTMLInputElement | null;
        if (search) {
          event.preventDefault();
          search.focus();
          search.select();
        }
        return;
      }

      if (event.key === "j" || event.key === "ArrowDown") {
        event.preventDefault();
        const next = currentIndex < 0 ? 0 : Math.min(currentIndex + 1, rows.length - 1);
        rows[next].focus?.();
        rows[next].scrollIntoView({ block: "nearest" });
        return;
      }

      if (event.key === "k" || event.key === "ArrowUp") {
        event.preventDefault();
        const prev = currentIndex < 0 ? rows.length - 1 : Math.max(currentIndex - 1, 0);
        rows[prev].focus?.();
        rows[prev].scrollIntoView({ block: "nearest" });
        return;
      }

      if (event.key === "x" && currentIndex >= 0) {
        const box = rows[currentIndex].querySelector<HTMLInputElement>('input[type="checkbox"]');
        if (box && !box.disabled) {
          event.preventDefault();
          box.click();
        }
        return;
      }

      if (event.key === "Enter" && currentIndex >= 0) {
        const link = rows[currentIndex].querySelector<HTMLAnchorElement>("a[href]");
        if (link) {
          event.preventDefault();
          link.click();
        }
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [searchId, rowSelector, enabled]);
}
