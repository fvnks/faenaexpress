"use client";

import Link from "next/link";

/**
 * Dos servicios, presentados de forma desigual: el ERP es el producto principal,
 * el diseño web es la oferta complementaria. Sin cards idénticas, sin bento grid.
 */
export function LandingServicios() {
  return (
    <section id="servicios" className="bg-background scroll-mt-24 border-t border-border">
      <div className="mx-auto max-w-6xl px-6 py-24 lg:py-32">
        <div className="flex flex-col lg:flex-row gap-16 lg:gap-24">
          {/* Columna izquierda: introducción */}
          <div className="lg:w-5/12 shrink-0">
            <span className="inline-block px-3 py-1 rounded-full border border-border bg-surface text-muted-foreground text-xs font-medium uppercase tracking-wider mb-6 block">
              Qué hacemos
            </span>
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground leading-tight mb-8 lg:mb-10 tracking-tight">
              Dos servicios, una seriedad
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed mb-10 lg:mb-14">
              Construimos el ERP que llevan las empresas chilenas y diseñamos sitios
              corporativos que no se confunden con plantillas. Lo hacemos con la misma
              seriedad: datos precisos, sin adornos innecesarios.
            </p>
          </div>

          {/* Columna derecha: los dos servicios */}
          <div className="lg:w-7/12 space-y-16 lg:space-y-20">
            <div className="border border-border rounded-card bg-surface p-8 lg:p-12 shadow-sm">
              <div className="flex items-start gap-4 mb-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-soft text-primary shrink-0">
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="text-primary"
                  >
                    <rect x="3" y="3" width="7" height="7" />
                    <rect x="14" y="3" width="7" height="7" />
                    <rect x="14" y="14" width="7" height="7" />
                    <rect x="3" y="14" width="7" height="7" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground mb-1">Facturas ERP</h3>
                  <p className="text-sm text-muted-foreground">Chile, CLP, IVA 19%</p>
                </div>
              </div>
              <p className="text-base leading-relaxed text-muted-foreground mb-6">
                Registra compras, ventas y gastos. Concilia el banco. Lleva el libro
                de compras y de ventas. Saber quién pagó cada gasto. Montos en pesos,
                todo en español.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-white transition-colors"
              >
                Entrar al ERP
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M11.25 3.75L3.75 11.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M11.25 11.25L3.75 3.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            </div>

            <div className="border border-border rounded-card bg-surface p-8 lg:p-12 shadow-sm">
              <div className="flex items-start gap-4 mb-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-soft text-accent shrink-0">
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="text-accent"
                  >
                    <rect x="2" y="3" width="20" height="14" rx="2" />
                    <line x1="8" y1="21" x2="16" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <line x1="12" y1="17" x2="12" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground mb-1">Diseño web corporativo</h3>
                  <p className="text-sm text-muted-foreground">Sitios para empresas serias</p>
                </div>
              </div>
              <p className="text-base leading-relaxed text-muted-foreground mb-6">
                Diseñamos sitios corporativos que reflejan la seriedad de tu empresa.
                Sin plantillas genéricas, sin adornos innecesarios: estructura clara,
                tipografía intencional y contenido que comunica.
              </p>
              <a
                href="/contacto"
                className="inline-flex items-center gap-2 text-sm font-semibold text-accent hover:text-white transition-colors"
              >
                Ver proyectos
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M11.25 3.75L3.75 11.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M11.25 11.25L3.75 3.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
