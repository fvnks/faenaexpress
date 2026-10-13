// Clases de estilo reutilizables (los literales están aquí para que Tailwind las detecte).
export const controlClass =
  "w-full rounded-control border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground disabled:opacity-60";

export const labelClass = "text-sm font-medium";

// Botones con efecto líquido: transparentes con borde, se rellenan al hover.
export const primaryButtonClass =
  "btn-liquid btn-liquid-primary rounded-control border border-primary bg-transparent px-4 py-2 text-sm font-semibold text-primary disabled:cursor-not-allowed disabled:opacity-60";

export const secondaryButtonClass =
  "btn-liquid btn-liquid-secondary rounded-control border border-border bg-transparent px-3 py-2 text-sm text-foreground disabled:cursor-not-allowed disabled:opacity-60";

export const dangerButtonClass =
  "btn-liquid btn-liquid-danger rounded-control border border-danger bg-transparent px-3 py-2 text-sm font-medium text-danger disabled:cursor-not-allowed disabled:opacity-60";

export const cardClass = "rounded-card border border-border bg-surface";

export const fieldClass = "flex flex-col gap-1.5";