"use client";

import { SectionHeader } from "@/components/landing/section-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

/**
 * Sección de contacto: formulario simple + info de contacto.
 * Sin validación compleja en el cliente; la validación real es en el servidor.
 */

export function ContactoSection() {
  return (
    <section
      id="contacto"
      className="catalog-grid border-t border-border bg-surface/50 section"
      aria-labelledby="contacto-heading"
    >
      <div className="mx-auto max-w-3xl px-6 py-24 lg:py-32 lg:px-8">
        <SectionHeader
          index="06"
          label="Contacto"
          title="¿Hablamos?"
          description="Cuéntanos qué necesitas y te respondemos en menos de 24 horas."
        />

        <form className="card-accent relative mx-auto max-w-lg space-y-6 overflow-hidden rounded-card border border-border bg-surface p-6" action="/api/contacto" method="POST">
          <Input
            label="Nombre"
            id="nombre"
            name="nombre"
            required
            placeholder="Tu nombre"
          />

          <Input
            label="Email"
            id="email"
            name="email"
            type="email"
            required
            placeholder="tu@empresa.cl"
          />

          <Input
            label="Empresa"
            id="empresa"
            name="empresa"
            placeholder="Nombre de tu empresa"
          />

          <Textarea
            label="Mensaje"
            id="mensaje"
            name="mensaje"
            required
            rows={5}
            placeholder="Cuéntanos qué necesitas..."
          />

          <Button type="submit" className="w-full">
            Enviar mensaje
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Tus datos se usan solo para responderte. Nunca los compartimos.
          </p>
        </form>
      </div>
    </section>
  );
}