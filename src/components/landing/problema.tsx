"use client";

import { SectionReveal } from "@/components/motion/section-reveal";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
      className="scroll-mt-24 border-t border-border bg-surface/50"
      aria-labelledby="problema-heading"
    >
      <div className="mx-auto max-w-7xl px-6 py-24 lg:py-32 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-20 lg:mb-28">
          <h2
            id="problema-heading"
            className="text-3xl lg:text-4xl font-bold text-foreground mb-6 tracking-tight text-wrap-balance"
          >
            Fin de mes sin sorpresas
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Yellow ERP nació para resolver problemas que las empresas reales
            enfrentan cada mes.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {problemas.map((p, index) => (
            <article key={p.id} className="group">
              <div className="card-hover">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary mb-6 shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  {p.icon}
                </div>
                <h3 className="text-lg font-bold text-foreground mb-3">
                  {p.titulo}
                </h3>
                <p className="text-base leading-relaxed text-muted-foreground">
                  {p.descripcion}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}