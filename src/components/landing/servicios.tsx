"use client";

import Link from "next/link";
import { SectionReveal } from "@/components/motion/section-reveal";

/**
 * Dos servicios presentados de forma desigual: el ERP es el producto principal
 * (más ancho, más énfasis) y el diseño web es la oferta complementaria.
 * Sin cards idénticas, sin bento grid.
 *
 * Fondo: textura sutil de papel de factura.
 */
export function LandingServicios() {
  return (
    <section id="servicios" className="bg-background scroll-mt-24 border-t border-border relative overflow-hidden">
      {/* Textura sutil de papel */}
      <div
        className="absolute inset-0 z-0 pointer-events-none opacity-25"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(27, 95, 168, 0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(27, 95, 168, 0.03) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      <div className="relative z-10 mx-auto max-w-6xl px-6 py-24 lg:py-36">
        <SectionReveal delay={0}>
          <div className="text-center max-w-3xl mx-auto mb-20 lg:mb-28">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-6 tracking-tight">
              Dos servicios, una seriedad
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Construimos el ERP que llevan las empresas chilenas y diseñamos sitios
              corporativos que no se confunden con plantillas.
            </p>
          </div>
        </SectionReveal>

        <div className="grid gap-16 lg:grid-cols-2">
          {/* ERP: servicio principal, más ancho */}
          <SectionReveal delay={40}>
            <article className="rounded-card border border-border bg-surface p-10 lg:p-14 shadow-sm">
              <div className="flex items-start gap-4 mb-8">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shrink-0">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="text-primary-foreground"
                  >
                    <rect x="3" y="3" width="7" height="7" />
                    <rect x="14" y="3" width="7" height="7" />
                    <rect x="14" y="14" width="7" height="7" />
                    <rect x="3" y="14" width="7" height="7" />
                  </svg>
                </div>
                <div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-[10px] font-medium uppercase tracking-wider mb-3 block">
                    Producto principal
                  </span>
                  <h3 className="text-2xl font-bold text-foreground mb-2">
                    Facturas ERP
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Chile · CLP · IVA 19 %
                  </p>
                </div>
              </div>
              <p className="text-base leading-relaxed text-muted-foreground mb-8">
                Registra compras, ventas y gastos. Concilia el banco. Lleva el libro
                de compras y de ventas. Y siempre sabrás quién pagó cada gasto.
              </p>
              <ul className="space-y-4 mb-10">
                {[
                  "Libro de compras y libro de ventas con IVA",
                  "Conciliación bancaria",
                  "Notas de crédito y débito",
                  "Gastos con responsable y reembolso",
                  "Catálogos de terceros y productos",
                  "Reportes de flujo de caja",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="flex shrink-0 items-center justify-center w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold mt-0.5">
                      ✓
                    </span>
                    <p className="text-sm text-foreground">{item}</p>
                  </li>
                ))}
              </ul>
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 px-7 py-3 text-sm font-semibold text-white bg-primary border border-transparent rounded-control hover:bg-primary/90 transition-colors"
              >
                Entrar al ERP
              </Link>
            </article>
          </SectionReveal>

          {/* Diseño web: servicio complementario */}
          <SectionReveal delay={100}>
            <article className="rounded-card border border-border bg-surface p-10 lg:p-14 shadow-sm">
              <div className="flex items-start gap-4 mb-8">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-soft text-accent shrink-0">
                  <svg
                    width="24"
                    height="24"
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
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-accent/30 bg-accent/10 text-accent text-[10px] font-medium uppercase tracking-wider mb-3 block">
                    Complementario
                  </span>
                  <h3 className="text-2xl font-bold text-foreground mb-2">
                    Diseño web corporativo
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Sitios para empresas serias
                  </p>
                </div>
              </div>
              <p className="text-base leading-relaxed text-muted-foreground mb-8">
                Diseñamos sitios corporativos que reflejan la seriedad de tu empresa.
                Sin plantillas genéricas, sin adornos innecesarios: estructura clara,
                tipografía intencional y contenido que comunica.
              </p>
              <ul className="space-y-4 mb-10">
                {[
                  "Identidad visual y maquetación",
                  "Sitio responsivo y rápido",
                  "Integración con tu ERP",
                  "Copia y contenido profesional",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="flex shrink-0 items-center justify-center w-4 h-4 rounded-full bg-accent text-accent text-[10px] font-bold mt-0.5">
                      ✓
                    </span>
                    <p className="text-sm text-foreground">{item}</p>
                  </li>
                ))}
              </ul>
              <a
                href="/contacto"
                className="inline-flex items-center justify-center gap-2 px-7 py-3 text-sm font-semibold text-accent border border-accent bg-transparent rounded-control hover:bg-accent/10 transition-colors"
              >
                Ver proyectos
              </a>
            </article>
          </SectionReveal>
        </div>
      </div>
    </section>
  );
}
