"use client";

import { secondaryButtonClass } from "@/lib/ui";

export function PrintCloseButton() {
  return (
    <button type="button" onClick={() => window.print()} className={secondaryButtonClass}>
      Imprimir cierre
    </button>
  );
}
