"use client";

import Link from "next/link";
import { useState } from "react";

import { enviarContacto } from "@/app/actions/contacto";
import { controlClass, fieldClass, labelClass } from "@/lib/ui";

export function ContactoSection() {
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "error">("idle");

  async function handleSubmit(formData: FormData): Promise<void> {
    setStatus("sending");
    try {
      const result = await enviarContacto(formData);
      if (result.ok) {
        setStatus("ok");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  return (
    <section className="py-16 lg:py-24">
      <div className="mx-auto max-w-3xl px-6">
        <div className="mb-12 lg:mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4 tracking-tight">
            Escríbenos
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Para dudas sobre el ERP, diseño web corporativo o cualquier otra cosa.
          </p>
        </div>

        <form action={handleSubmit} className="space-y-6 lg:space-y-8">
          <div className={fieldClass}>
            <label htmlFor="contacto-nombre" className={labelClass}>
              Nombre completo
            </label>
            <input
              id="contacto-nombre"
              name="nombre"
              type="text"
              maxLength={100}
              className={controlClass}
              required
              placeholder="Tu nombre"
            />
          </div>

          <div className={fieldClass}>
            <label htmlFor="contacto-email" className={labelClass}>
              Correo electrónico
            </label>
            <input
              id="contacto-email"
              name="email"
              type="email"
              maxLength={200}
              className={controlClass}
              required
              placeholder="tú@empresa.cl"
            />
          </div>

          <div className={fieldClass}>
            <label htmlFor="contacto-empresa" className={labelClass}>
              Empresa
            </label>
            <input
              id="contacto-empresa"
              name="empresa"
              type="text"
              maxLength={200}
              className={controlClass}
              required
              placeholder="Nombre de tu empresa"
            />
          </div>

          <div className={fieldClass}>
            <label htmlFor="contacto-mensaje" className={labelClass}>
              Mensaje
            </label>
            <textarea
              id="contacto-mensaje"
              name="mensaje"
              rows={5}
              maxLength={1000}
              className={controlClass}
              required
              placeholder="Cuéntanos qué necesitas…"
            />
          </div>

          {status === "ok" ? (
            <p className="rounded-control border border-success/40 bg-success-soft px-4 py-3 text-sm text-success">
              Mensaje enviado. Te responderemos a la brevedad.
            </p>
          ) : status === "error" ? (
            <p className="rounded-control border border-danger/40 bg-danger-soft px-4 py-3 text-sm text-danger">
              Ocurrió un error al enviar. Inténtalo de nuevo.
            </p>
          ) : null}

          <button
            type="submit"
            disabled={status === "sending"}
            className="relative inline-flex items-center justify-center gap-2 px-10 py-3 text-sm font-semibold text-black bg-white border border-transparent rounded-control hover:bg-gray-200 transition-colors"
          >
            {status === "sending" ? "Enviando…" : "Enviar mensaje"}
          </button>
        </form>
      </div>
    </section>
  );
}
