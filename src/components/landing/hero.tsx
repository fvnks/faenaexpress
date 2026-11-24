"use client";

import Link from "next/link";
import { HeroPanelCarousel } from "@/components/landing/hero-panel-carousel";
import { Button } from "@/components/ui/button";

export function LandingHero() {
  return (
    <section className="catalog-grid relative overflow-hidden border-b border-border bg-surface/50 section">
      <span aria-hidden="true" className="pointer-events-none absolute -left-2 top-20 hidden select-none text-[16rem] font-bold leading-none tracking-tighter text-foreground/[0.02] lg:block">
        01
      </span>
      <div className="relative mx-auto max-w-7xl px-6 py-20 lg:py-32">
        <div className="lg:grid lg:grid-cols-2 lg:gap-16 items-start">
          {/* Content */}
          <div className="lg:col-span-1">
            <p className="mb-4 font-mono text-xs uppercase tracking-[0.18em] text-primary">
              Índice / 01 — Inicio
            </p>
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-border bg-surface text-muted-foreground text-xs font-medium uppercase tracking-wider mb-6 inline-block lg:mb-10">
              <svg className="h-3 w-3 text-primary" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
              ERP para empresas chilenas
            </span>

            <h1 className="text-4xl lg:text-6xl font-bold text-foreground leading-tight mb-8 lg:mb-12 tracking-tight text-wrap-balance">
              Tus cuentas al día,<br />sin Excel
            </h1>

            <p className="text-lg lg:text-xl text-muted-foreground leading-relaxed max-w-lg mb-12 lg:mb-16">
              Registra compras, ventas y gastos. Concilia el banco. Lleva el libro
              de compras y de ventas. Y siempre sabrás quién pagó cada gasto. Montos
              en pesos, IVA al 19 %, todo en español.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/contacto">
                <Button size="lg">
                  Solicitar cuenta
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="secondary" size="lg">
                  Entrar a mi cuenta
                </Button>
              </Link>
            </div>

            {/* Trust indicators - elevated as the proof strip */}
            <div className="mt-16 flex flex-wrap items-center gap-6 lg:gap-8 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4 text-success" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 12.586 7.293 10.879a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4a1 1 0 000-1.414z" clipRule="evenodd" />
                </svg>
                <span>SII homologado</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4 text-primary" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 2a8 8 0 100 16 8 8 0 000-16zm4.5 5.75a.75.75 0 00-1.5 0v3.5H8.75a.75.75 0 000 1.5h3.5v3.5a.75.75 0 001.5 0v-3.5H16a.75.75 0 000-1.5h-3.5V9a.75.75 0 00-1.5 0v3.5z" clipRule="evenodd" />
                </svg>
                <span>IVA 19% automático</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4 text-accent" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M12 2a9 9 0 100 18 9 9 0 000-18zm0 1.8a7.2 7.2 0 000 14.4 7.2 7.2 0 000-14.4zM12 9a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm0 8.25a.75.75 0 01-.75.75h-.008v.008H12V12a.75.75 0 01-1.5 0v-5.5A3.75 3.75 0 0115.75 3h.008V3H12a.75.75 0 010-1.5z" clipRule="evenodd" />
                </svg>
                <span>Montos en CLP</span>
              </div>
            </div>
          </div>

          {/* Dashboard preview — carrusel de vistas reales del ERP */}
          <div className="lg:col-span-1">
            <HeroPanelCarousel />
          </div>
        </div>
      </div>
    </section>
  );
}