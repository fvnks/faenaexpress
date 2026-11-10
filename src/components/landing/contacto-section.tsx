"use client";

import Link from "next/link";
import { useState } from "react";

import { enviarContacto } from "@/app/actions/contacto";
import { controlClass, fieldClass, labelClass } from "@/lib/ui";

/**
 * Sección de contacto completa: información de contacto + formulario funcional.
 * Sin datos inventados, sin ilustraciones genéricas.
 */
export function ContactoSection() {
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "error">(
    "idle"
  );

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

  const infoContacto = [
    {
      label: "Correo electrónico",
      value: "contacto@yellow-erp.cl",
      href: "mailto:contacto@yellow-erp.cl",
    },
    {
      label: "Teléfono",
      value: "+56 9 9458 0379",
      href: "tel:+56994580379",
    },
  ];

  return (
    <section className="py-16 lg:py-24 relative overflow-hidden">
      {/* Decoración sutil sin glassmorphism */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-primary/10 rounded-full blur-[100px] -mr-24 -mt-24" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-accent/10 rounded-full blur-[100px] -ml-24 -mb-24" />

      <div className="relative mx-auto max-w-6xl px-6">
        <div className="mb-12 lg:mb-16">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-border bg-surface text-muted-foreground text-xs font-medium uppercase tracking-wider mb-4 inline-block lg:mb-6">
            Contacto
          </span>
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4 tracking-tight">
            Escríbenos
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-lg">
            Para dudas sobre el ERP, diseño web corporativo o cualquier otra cosa.
            Respondemos a la brevedad.
          </p>
        </div>

        <div className="grid gap-16 lg:grid-cols-2">
          {/* Información de contacto */}
          <div className="space-y-8">
            {infoContacto.map((item) => (
              <div
                key={item.label}
                className="flex items-start gap-4"
              >
                <div className="flex shrink-0 items-center justify-center w-12 h-12 rounded-lg border border-border bg-surface">
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="text-muted-foreground"
                  >
                    {item.label === "Correo electrónico" ? (
                      <>
                        <path
                          d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <polyline
                          points="22 6 12 13 2 6"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </>
                    ) : (
                      <>
                        <path
                          d="M22 16.92v3a2 2 0 0 1-2.18 2L16.8 22a2 2 0 0 1-1-0.47L8 14a2 2 0 0 1-.83-1.56l6-9A2 2 0 0 1 15 4h4a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h15.5a2 2 0 0 1 2 2z"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </>
                    )}
                  </svg>
                </div>
                <div>
                  {item.href ? (
                    <Link
                      href={item.href}
                      className="text-sm font-medium text-foreground hover:text-primary transition-colors"
                    >
                      {item.value}
                    </Link>
                  ) : (
                    <span className="text-sm font-medium text-foreground">
                      {item.value}
                    </span>
                  )}
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {item.label}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Formulario */}
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
              className="relative inline-flex items-center justify-center gap-2 px-10 py-3 text-sm font-semibold text-white bg-primary border border-transparent rounded-control hover:bg-primary/90 transition-colors shadow-lg shadow-black/20"
            >
              {status === "sending" ? "Enviando…" : "Enviar mensaje"}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
