"use client";

import Link from "next/link";

/**
 * Hero de la landing: afirmación fuerte sobre el control financiero.
 * No hay mockup, no hay números inventados, no hay gradiente decorativo.
 * El foco es el texto y la llamada a la acción.
 */
export function LandingHero() {
  return (
    <section className="relative min-h-[70vh] flex flex-col justify-center border-b border-border">
      <div className="mx-auto max-w-4xl px-6 py-20 lg:py-32 text-center">
        <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-border bg-surface text-muted-foreground text-xs font-medium uppercase tracking-wider mb-6 block lg:mb-10">
          ERP chileno · diseño web corporativo
        </span>

        <h1 className="text-4xl lg:text-6xl font-bold text-foreground leading-tight mb-8 lg:mb-12 tracking-tight">
          Tu empresa ordenada, tus cuentas claras
        </h1>

        <p className="text-lg lg:text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto mb-12 lg:mb-16">
          Registra compras, ventas y gastos. Concilia el banco. Saber quién pagó
          cada gasto. Y si necesitas presencia web, diseñamos tu sitio corporativo
          con la misma seriedad con la que llevamos tus libros.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/login"
            className="relative inline-flex items-center justify-center gap-2 px-8 py-4 text-sm font-semibold text-accent bg-accent-soft border border-accent rounded-control hover:bg-accent hover:text-black transition-colors"
          >
            Entrar a mi cuenta
          </Link>
          <Link
            href="#servicios"
            className="relative inline-flex items-center justify-center gap-2 px-8 py-4 text-sm font-semibold text-foreground border border-border bg-transparent rounded-control hover:bg-surface/50 hover:text-white transition-colors"
          >
            Conocer los servicios
          </Link>
        </div>
      </div>
    </section>
  );
}
