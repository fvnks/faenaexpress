"use client";

import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/astryx/button";
import Card from "@/components/astryx/card";
import { Grid } from "@/components/astryx/layout";
import { Heading, Label, Text } from "@/components/astryx/typography";

import { enviarContacto } from "@/app/actions/contacto";

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
      <div className="absolute top-0 right-0 w-72 h-72 bg-primary/10 rounded-full blur-[100px] -mr-24 -mt-24" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-accent/10 rounded-full blur-[100px] -ml-24 -mb-24" />

      <div className="relative mx-auto max-w-6xl px-6">
        <Grid cols="1 lg:2" gap="16">
          <div className="lg:col-span-1">
            <Heading level={2} className="text-3xl lg:text-4xl mb-4 tracking-tight">
              Escríbenos
            </Heading>
            <Text as="p" className="text-lg text-muted-foreground leading-relaxed">
              Para dudas sobre el ERP, diseño web corporativo o cualquier otra
              cosa. Respondemos a la brevedad.
            </Text>
          </div>

          <div className="grid gap-16 lg:grid-cols-2">
            {infoContacto.map((item) => (
              <div key={item.label} className="flex items-start gap-4">
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
                  <Text as="p" className="mt-0.5 text-xs text-muted-foreground">
                    {item.label}
                  </Text>
                </div>
              </div>
            ))}
          </div>

          <form action={handleSubmit} className="space-y-6 lg:space-y-8">
            <Grid cols="1 lg:2" gap="6">
              <div className="lg:col-span-2">
                <Label htmlFor="contacto-nombre">Nombre completo</Label>
                <input
                  id="contacto-nombre"
                  name="nombre"
                  type="text"
                  maxLength={100}
                  className="w-full rounded-control border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground disabled:opacity-60"
                  required
                  placeholder="Tu nombre"
                />
              </div>
              <div className="lg:col-span-2">
                <Label htmlFor="contacto-email">Correo electrónico</Label>
                <input
                  id="contacto-email"
                  name="email"
                  type="email"
                  maxLength={200}
                  className="w-full rounded-control border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground disabled:opacity-60"
                  required
                  placeholder="tú@empresa.cl"
                />
              </div>
              <div className="lg:col-span-2">
                <Label htmlFor="contacto-empresa">Empresa</Label>
                <input
                  id="contacto-empresa"
                  name="empresa"
                  type="text"
                  maxLength={200}
                  className="w-full rounded-control border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground disabled:opacity-60"
                  required
                  placeholder="Nombre de tu empresa"
                />
              </div>
              <div className="lg:col-span-2">
                <Label htmlFor="contacto-mensaje">Mensaje</Label>
                <textarea
                  id="contacto-mensaje"
                  name="mensaje"
                  rows={5}
                  maxLength={1000}
                  className="w-full rounded-control border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground disabled:opacity-60"
                  required
                  placeholder="Cuéntanos qué necesitas…"
                />
              </div>
            </Grid>

            {status === "ok" ? (
              <p className="rounded-control border border-success/40 bg-success-soft px-4 py-3 text-sm text-success">
                Mensaje enviado. Te responderemos a la brevedad.
              </p>
            ) : status === "error" ? (
              <p className="rounded-control border border-danger/40 bg-danger-soft px-4 py-3 text-sm text-danger">
                Ocurrió un error al enviar. Inténtalo de nuevo.
              </p>
            ) : null}

            <Button
              type="submit"
              disabled={status === "sending"}
              variant="primary"
              size="md"
              className="w-full lg:w-auto"
            >
              {status === "sending" ? "Enviando…" : "Enviar mensaje"}
            </Button>
          </form>
        </Grid>
      </div>
    </section>
  );
}
