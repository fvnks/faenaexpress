"use client";

import { secondaryButtonClass } from "@/lib/ui";

export function PrintTicketButton() {
  return (
    <button
      type="button"
      onClick={() => {
        setTimeout(() => window.print(), 0);
      }}
      className={secondaryButtonClass}
    >
      Imprimir ticket
    </button>
  );
}
