import type { ReactNode } from "react";

/**
 * Cabecera de sección de la landing con el mismo lenguaje que el selector de
 * módulos y Facturas: eyebrow de catálogo, número de dos dígitos y regla fina.
 */
export function SectionHeader({
  index,
  label,
  title,
  description,
  align = "center",
}: {
  index: string;
  label: string;
  title: string;
  description?: ReactNode;
  align?: "center" | "left";
}) {
  return (
    <div className={`mb-16 lg:mb-24 ${align === "center" ? "mx-auto max-w-3xl text-center" : "max-w-3xl"}`}>
      <div className={`flex items-center gap-3 ${align === "center" ? "justify-center" : ""}`}>
        <span className="font-mono text-xs uppercase tracking-[0.18em] text-primary">
          Índice / {index} — {label}
        </span>
        <span aria-hidden="true" className="h-px w-10 bg-border" />
        <span aria-hidden="true" className="font-mono text-xs text-subtle">{index}</span>
      </div>
      <h2 className="mt-5 text-3xl font-bold text-foreground mb-5 tracking-tight lg:text-4xl">
        {title}
      </h2>
      {description ? (
        <p className="text-lg leading-relaxed text-muted-foreground">{description}</p>
      ) : null}
    </div>
  );
}
