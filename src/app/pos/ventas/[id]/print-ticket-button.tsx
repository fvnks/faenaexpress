"use client";

import { secondaryButtonClass } from "@/lib/ui";
import { useEffect, useRef } from "react";

export function PrintTicketButton() {
  const printRef = useRef<(() => void) | undefined>(undefined);

  useEffect(() => {
    printRef.current = () => window.print();
  }, []);

  return (
    <button
      type="button"
      onClick={() => {
        printRef.current?.();
      }}
      className={secondaryButtonClass}
    >
      Imprimir ticket
    </button>
  );
}
