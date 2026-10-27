"use client";

export function PrintButton({ label = "Imprimir liquidación" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => {
        setTimeout(() => window.print(), 0);
      }}
      className="no-print rounded-control border border-border bg-surface px-3 py-1.5 text-sm text-foreground transition-colors hover:border-primary hover:text-primary"
    >
      {label}
    </button>
  );
}
