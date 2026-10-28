"use client";

import Link from "next/link";
import { useState } from "react";

import { submitContacto } from "@/app/actions/contacto";
import { primaryButtonClass, controlClass, fieldClass, labelClass } from "@/lib/ui";

export function ContactoSection() {
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "error">("idle");

  async function handleSubmit(event: FormDataEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");

    const formData = new FormData(event.currentTarget);
    try {
      await submitContacto(formData);
      setStatus("ok");
      event.currentTarget.reset();
    } catch {
      setStatus("error");
    }
  }

  return (
    <section className="py-16 lg:py-24 relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary-soft rounded-full blur-3xl -mr-16 -mt-16" />
      <div className="absolute bottom-0 left-0 w-72 h-72 bg-accent-soft rounded-full blur-3xl -ml-16 -mb-16" />

      <div className="relative mx-auto max-w-5xl px-6">
        <div className="mw-md mb-12 lg:mb-16">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-primary-soft bg-primary-soft text-primary text-xs font-medium uppercase tracking-wider mb-4 block">
            Contacto
          </span>
          <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            <span className="block">No dudes en</span>
            <span className="block text-primary">hablar con nosotros</span>
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Estamos listos para responder tus preguntas sobre Yellow ERP.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 lg:gap-12 items-start">
          {/* Contact info */}
          <div className="space-y-8">
            <ContactoItem
              label="Correo electrónico"
              value="hola@yellow-erp.cl"
              href="mailto:hola@yellow-erp.cl"
              icon="mail"
            />
            <ContactoItem
              label="Teléfono"
              value="+56 9 9458 0379"
              href="tel:+56994580379"
              icon="phone"
            />
            <ContactoItem
              label="Teléfono"
              value="+56 9 7278 8032"
              href="tel:+56972788032"
              icon="phone"
            />
          </div>

          {/* Form */}
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
              <label htmlFor="contacto-mensaje" className={labelClass}>
                Mensaje
              </label>
              <textarea
                id="contacto-mensaje"
                name="mensaje"
                rows="5"
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
              className={primaryButtonClass + " w-full lg:w-auto py-3 px-8 text-base font-semibold"}
            >
              {status === "sending" ? "Enviando…" : "Enviar mensaje"}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}

function ContactoItem({
  label,
  value,
  href,
  icon,
}: {
  label: string;
  value: string;
  href: string;
  icon: "mail" | "phone";
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex shrink-0 items-center justify-center w-10 h-10 rounded-lg border border-border bg-surface">
        {icon === "mail" ? (
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="text-muted-foreground"
          >
            <path
              d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <polyline points="22 6 12 13 2 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="text-muted-foreground"
          >
            <path
              d="M22 16.92v3a2 2 0 0 1-2.18 2L16.8 22a2 2 0 0 1-1-0.47L8 14a2 2 0 0 1-.83-1.56l6-9A2 2 0 0 1 15 4h4a2 2 0 0 1 2 2l.5 3a2 2 0 0 1-.36 1.34l-1.27 1.27a2 2 0 0 1-1.19.76zm-6.3-9.41L6 12.62a2 2 0 0 0 .35 1.38l1.15 1.15a2 2 0 0 0 1.38.35H20a1 1 0 0 0 1-1V4.82a1 1 0 0 0-.14-.45l-3-4A1 1 0 0 0 17.5 3H7a1 1 0 0 0-.87.5L3 7.42a1 1 0 0 0-.14.45v3.26a1 1 0 0 0 1 1h5.29a1 1 0 0 0 1-1zm5.2 1.42a2 2 0 0 1-.8-1.26l2-2a2 2 0 0 1 1.66 0l1.5 1.5a2 2 0 0 1 0 2.83l-3 3a2 2 0 0 1-2.7 0zM4.93 7.77l-1.22 1.22a1 1 0 0 0-.12.15l-3 4a1 1 0 0 0 .12.58v3.26a1 1 0 0 0 1 1h7.13a1 1 0 0 0 .7-.29l3-3a1 1 0 0 0 0-1.42l-1.22-1.22a1 1 0 0 0-1.42 0z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>
      <div>
        {href ? (
          <Link
            href={href}
            className="text-sm font-medium text-foreground hover:text-primary transition-colors"
          >
            {value}
          </Link>
        ) : (
          <span className="text-sm font-medium text-foreground">{value}</span>
        )}
        <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
