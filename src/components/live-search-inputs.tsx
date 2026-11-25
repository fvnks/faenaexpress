"use client";

import { useEffect } from "react";

// `data-live="off"` lo usan los buscadores internos (p. ej. el de SelectDropdown):
// son inputs de texto para filtrar opciones, no búsquedas de lista que deban
// recargar la página, y auto-enviar el formulario al escribir sería destructivo.
const BASE = 'input:not([data-date]):not([data-live="off"])';
const SELECTOR = [
  `${BASE}[type="search"]`,
  `${BASE}[name^="q"]`,
  `${BASE}[name*="cliente"]`,
  `${BASE}[name*="proveedor"]`,
  `${BASE}[name*="numero"]`,
  `${BASE}[name*="factura"]`,
  `${BASE}[name*="folio"]`,
].join(",");

export function LiveSearchInputs() {
  useEffect(() => {
    const timers = new WeakMap<HTMLInputElement, number>();

    const bind = () => {
      for (const input of Array.from(document.querySelectorAll(SELECTOR))) {
        const el = input as HTMLInputElement;
        const form = el.form;
        if (!form) continue;
        if (el.dataset.liveBound === "1") continue;
        el.dataset.liveBound = "1";

        const submit = () => {
          const pending = timers.get(el);
          if (pending) window.clearTimeout(pending);
          timers.set(el, window.setTimeout(() => {
            form.requestSubmit();
          }, 350));
        };

        el.addEventListener("input", submit);
      }
    };

    bind();
    const observer = new MutationObserver(bind);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, []);

  return null;
}
