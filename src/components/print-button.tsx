"use client";

import { useEffect, useRef } from "react";

export function PrintButton({ label = "Imprimir liquidación" }: { label?: string }) {
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Adjuntar el event listener después de la hidratación para evitar mismatch
  useEffect(() => {
    const button = buttonRef.current;
    if (button) {
      const handler = () => window.print();
      button.addEventListener("click", handler);
      return () => button.removeEventListener("click", handler);
    }
  }, []);

  return (
    <button
      type="button"
      ref={buttonRef}
      className="no-print rounded-control border border-border bg-surface px-3 py-1.5 text-sm text-foreground transition-colors hover:border-primary hover:text-primary"
    >
      {label}
    </button>
  );
}
