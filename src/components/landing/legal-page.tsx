import type { ReactNode } from "react";

import { LandingFooter } from "@/components/landing/footer";
import { LandingNavbar } from "@/components/landing/navbar";
import { SectionHeader } from "@/components/landing/section-header";

/**
 * Estructura común de las páginas públicas de texto (legales, blog,
 * documentación y changelog). Mismo shell que la landing: navbar fijo,
 * ancho de lectura cómodo y footer con los enlaces reales.
 */
export function LegalPage({
  index,
  label,
  title,
  description,
  published,
  children,
}: {
  index: string;
  label: string;
  title: string;
  description: string;
  published?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-background">
      <LandingNavbar />
      <main className="relative pt-20">
        <div className="mx-auto max-w-4xl px-6 py-16 lg:py-24">
          <SectionHeader
            index={index}
            label={label}
            title={title}
            description={description}
            align="left"
            as="h1"
          />
          {published ? (
            <p className="mb-12 font-mono text-xs uppercase tracking-[0.18em] text-subtle">
              Actualizado el {published}
            </p>
          ) : null}
          <div className="space-y-12">{children}</div>
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}

export function LegalSection({
  id,
  title,
  children,
}: {
  id?: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-border pt-8">
      <h2 className="text-xl font-semibold tracking-tight text-foreground">{title}</h2>
      <div className="mt-4 space-y-4 text-base leading-relaxed text-muted-foreground">
        {children}
      </div>
    </section>
  );
}
