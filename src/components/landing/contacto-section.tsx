"use client";

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
      className="border-t border-border bg-surface/50 section"
      aria-labelledby="contacto-heading"
    >
      <div className="mx-auto max-w-3xl px-6 py-24 lg:py-32 lg:px-8">
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