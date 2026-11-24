"use client";

import { SectionHeader } from "@/components/landing/section-header";

/**
 * Cómo funciona: flujo real del producto, paso a paso.
 * Sin el template genérico de "1, 2, 3" con iconos redondos idénticos.
 */

const pasos = [
  {
    numero: "01",
    titulo: "Registra tus documentos",
    descripcion:
      "Ingresa facturas de compra y venta, boletas y notas con su RUT, folio, neto, IVA y total. Cada documento queda registrado con su estado de pago o cobro.",
  },
  {
    numero: "02",
    titulo: "Concilia el banco",
    descripcion:
      "Importa los movimientos bancarios y empáralos con tus compras por pagar y ventas por cobrar. Lo que no calza queda en una bandeja para revisar.",
  },
  {
    numero: "03",
    titulo: "Saber quién pagó qué",
    descripcion:
      "Cada gasto registra a su pagador y si ya se le reembolsó. Al final del mes sabes exactamente cuánto gastó cada área y cuánto te deben o debes.",
  },
];

export function LandingComoFunciona() {
  return (
    <section
      id="como-funciona"
      className="catalog-grid border-t border-border bg-surface/50 section"
      aria-labelledby="como-funciona-heading"
    >
      <div className="mx-auto max-w-5xl px-6 py-24 lg:py-32 lg:px-8">
        <SectionHeader
          index="03"
          label="Proceso"
          title="Cómo funciona"
          description="Tres pasos para tener los libros al día sin sorpresas de fin de mes."
        />

        <div className="grid gap-6 lg:grid-cols-3">
          {pasos.map((paso) => (
            <article key={paso.numero} className="group card-accent relative overflow-hidden rounded-card border border-border bg-surface p-6 transition-colors duration-150 hover:border-primary/60 hover:bg-surface-elevated">
              <span className="pointer-events-none absolute -right-1 -top-4 font-mono text-7xl font-bold text-foreground/[0.04]">
                {paso.numero}
              </span>
              <div className="relative flex items-start gap-4 mb-6">
                <div className="flex shrink-0 items-center justify-center w-10 h-10 rounded-control border border-primary/30 bg-primary-soft font-mono text-sm font-bold text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  {paso.numero}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground mb-1">
                    {paso.titulo}
                  </h3>
                </div>
              </div>
              <p className="relative text-base leading-relaxed text-muted-foreground">
                {paso.descripcion}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}