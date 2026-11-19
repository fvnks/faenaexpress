"use client";

import { SectionReveal } from "@/components/motion/section-reveal";

/**
 * Sección de contacto: formulario simple + info de contacto.
 * Sin validación compleja en el cliente; la validación real es en el servidor.
 */

export function ContactoSection() {
  return (
    <section
      id="contacto"
      className="border-t border-border bg-surface/50 section"
      aria-labelledby="contacto-heading"
    >
      <div className="mx-auto max-w-3xl px-6 py-24 lg:py-32 lg:px-8">
        <SectionReveal delay={0}>
          <div className="text-center max-w-xl mx-auto mb-12 lg:mb-16">
            <h2
              id="contacto-heading"
              className="text-3xl lg:text-4xl font-bold text-foreground mb-4 tracking-tight"
            >
              ¿Hablamos?
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Cuéntanos qué necesitas y te respondemos en menos de 24 horas.
            </p>
          </div>

          <form className="mx-auto max-w-lg space-y-6" action="/api/contacto" method="POST">
            <div className="space-y-1.5">
              <label htmlFor="nombre" className="block text-sm font-medium text-foreground mb-1.5">
                Nombre
              </label>
              <input
                type="text"
                id="nombre"
                name="nombre"
                required
                className="input"
                placeholder="Tu nombre"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1.5">
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                required
                className="input"
                placeholder="tu@empresa.cl"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="empresa" className="block text-sm font-medium text-foreground mb-1.5">
                Empresa
              </label>
              <input
                type="text"
                id="empresa"
                name="empresa"
                className="input"
                placeholder="Nombre de tu empresa"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="mensaje" className="block text-sm font-medium text-foreground mb-1.5">
                Mensaje
              </label>
              <textarea
                id="mensaje"
                name="mensaje"
                required
                rows={5}
                className="input resize-y min-h-[120px]"
                placeholder="Cuéntanos qué necesitas..."
              />
            </div>

            <button
              type="submit"
              className="btn-primary w-full"
            >
              Enviar mensaje
            </button>

            <p className="text-xs text-muted-foreground text-center">
              Tus datos se usan solo para responderte. Nunca los compartimos.
            </p>
          </form>
        </SectionReveal>
      </div>
    </section>
  );
}