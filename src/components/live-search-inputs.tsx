"use client";

import { useEffect } from "react";

const SELECTOR =
  'input:not([data-date])[type="search"],' +
  'input:not([data-date])[name^="q"],' +
  'input:not([data-date])[name*="cliente"],' +
  'input:not([data-date])[name*="proveedor"],' +
  'input:not([data-date])[name*="numero"],' +
  'input:not([data-date])[name*="factura"],' +
  'input:not([data-date])[name*="folio"]';

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
