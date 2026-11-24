"use client";

import { SectionHeader } from "@/components/landing/section-header";
import { Card } from "@/components/ui/card";

/**
 * Sección de problemas reales: libros que no cuadran, gastos sin responsable,
 * sin visibilidad real. Sin estadísticas inventadas, sin "Sarah Chen".
 */

const problemas = [
  {
    id: "libros",
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M9 11H3v2h6v-2z" />
        <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 0-2 2z" />
      </svg>
    ),
    titulo: "Los libros no cuadran",
    descripcion:
      "El día de declarar IVA, la información anda regada: facturas en el escritorio, un Excel que nadie más entiende y el estado del banco en otra pestaña. Copiar cada folio a mano cansa y al final del mes nadie recuerda quién pagó qué.",
  },
  {
    id: "gastos",
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 8 8 10 8 10z" />
      </svg>
    ),
    titulo: "Gastos sin responsable",
    descripcion:
      "Cada gasto debería decir quién lo pagó y si ya se le reembolsó. Sin eso, el dinero se pierde entre recibos sueltos y mensajes de WhatsApp que nadie archiva.",
  },
  {
    id: "visibilidad",
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6m4 6v-6" />
      </svg>
    ),
    titulo: "Sin visibilidad real",
    descripcion:
      "No sabes cuánto debes, cuánto te deben o cuánto gastó cada área hasta que es demasiado tarde para corregirlo. Las sorpresas de fin de mes son costosas.",
  },
];

export function LandingProblema() {
  return (
    <section
      id="problema"
      className="catalog-grid border-t border-border bg-surface/50 section"
      aria-labelledby="problema-heading"
    >
      <div className="mx-auto max-w-7xl px-6 py-24 lg:py-32 lg:px-8">
        <SectionHeader
          index="05"
          label="El problema"
          title="Fin de mes sin sorpresas"
          description="Yellow ERP nació para resolver problemas que las empresas reales enfrentan cada mes."
        />

        <div className="grid gap-6 lg:grid-cols-3">
          {problemas.map((p, index) => (
            <article key={p.id} className="group">
              <Card accent className="p-6 hover:border-primary/60 transition-colors">
                <span className="catalog-code">{String(index + 1).padStart(2, "0")}</span>
                <div className="flex h-12 w-12 items-center justify-center rounded-control border border-primary/30 bg-primary-soft text-primary mb-6 shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  {p.icon}
                </div>
                <h3 className="text-lg font-bold text-foreground mb-3">
                  {p.titulo}
                </h3>
                <p className="text-base leading-relaxed text-muted-foreground">
                  {p.descripcion}
                </p>
              </Card>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}