"use client";

import { secondaryButtonClass } from "@/lib/ui";

export function PrintTicketButton() {
  return (
    <button type="button" onClick={() => window.print()} className={secondaryButtonClass}>
      Imprimir ticket
    </button>
  );
}
