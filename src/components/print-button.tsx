"use client";

import { useEffect, useRef } from "react";

export function PrintButton({ label = "Imprimir liquidación" }: { label?: string }) {
  const printRef = useRef<(() => void) | undefined>(undefined);

  // Capturar window.print solo después de la hidratación del cliente
  useEffect(() => {
    printRef.current = () => window.print();
  }, []);

  return (
    <button
      type="button"
      onClick={() => {
        printRef.current?.();
      }}
      className="no-print rounded-control border border-border bg-surface px-3 py-1.5 text-sm text-foreground transition-colors hover:border-primary hover:text-primary"
    >
      {label}
    </button>
  );
}
