"use client";

import Link from "next/link";
import { SectionReveal } from "@/components/motion/section-reveal";

export function LandingHero() {
  return (
    <section className="relative border-b border-border overflow-hidden bg-surface/50">
      {/* Background pattern */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-30" style={{
        backgroundImage: `
          linear-gradient(to right, rgba(29, 78, 216, 0.03) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(29, 78, 216, 0.03) 1px, transparent 1px)
        `,
        backgroundSize: "32px 32px",
      }} />

      {/* Gradient orbs */}
      <div className="absolute -top-40 -right-40 w-[24rem] h-[24rem] bg-primary/5 rounded-full blur-3xl" aria-hidden="true" />
      <div className="absolute -bottom-40 -left-40 w-[24rem] h-[24rem] bg-accent/5 rounded-full blur-3xl" aria-hidden="true" />

      <div className="relative z-10 mx-auto max-w-7xl px-6 py-20 lg:py-32">
        <SectionReveal delay={0}>
          <div className="lg:grid lg:grid-cols-2 lg:gap-16 items-start">
            {/* Content */}
            <div className="lg:col-span-1">
              <SectionReveal delay={100}>
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-border bg-surface text-muted-foreground text-xs font-medium uppercase tracking-wider mb-6 inline-block lg:mb-10">
                  <svg className="h-3 w-3 text-primary" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                  </svg>
                  ERP para empresas chilenas
                </span>
              </SectionReveal>

              <SectionReveal delay={200}>
                <h1 className="text-4xl lg:text-6xl font-bold text-foreground leading-tight mb-8 lg:mb-12 tracking-tight text-wrap-balance">
                  Tus cuentas al día,<br />sin Excel
                </h1>
              </SectionReveal>

              <SectionReveal delay={300}>
                <p className="text-lg lg:text-xl text-muted-foreground leading-relaxed max-w-lg mb-12 lg:mb-16">
                  Registra compras, ventas y gastos. Concilia el banco. Lleva el libro
                  de compras y de ventas. Y siempre sabrás quién pagó cada gasto. Montos
                  en pesos, IVA al 19 %, todo en español.
                </p>
              </SectionReveal>

              <SectionReveal delay={400}>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link
                    href="/login"
                    className="btn-primary group"
                  >
                    Entrar a mi cuenta
                    <svg className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </Link>
                  <Link
                    href="#servicios"
                    className="btn-secondary"
                  >
                    Conocer los servicios
                  </Link>
                </div>
              </SectionReveal>

              {/* Trust indicators */}
              <SectionReveal delay={500}>
                <div className="mt-16 flex flex-wrap items-center gap-8 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-success" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 12.586 7.293 10.879a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4a1 1 0 000-1.414z" clipRule="evenodd" />
                    </svg>
                    <span>SII homologado</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-primary" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path fillRule="evenodd" d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 2a8 8 0 100 16 8 8 0 000-16zm4.5 5.75a.75.75 0 00-1.5 0v3.5H8.75a.75.75 0 000 1.5h3.5v3.5a.75.75 0 001.5 0v-3.5H16a.75.75 0 000-1.5h-3.5v-3.5z" clipRule="evenodd" />
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
              </SectionReveal>
            </div>

            {/* Dashboard preview */}
            <div className="lg:col-span-1">
              <SectionReveal delay={150} className="lg:ml-auto">
                <div className="relative w-full max-w-[520px] mx-auto">
                  {/* Glow effect */}
                  <div className="absolute inset-0 bg-black/20 blur-2xl rounded-2xl -translate-y-2" aria-hidden="true" />
                  
                  {/* Dashboard mockup */}
                  <div className="relative rounded-2xl border border-border bg-surface shadow-2xl overflow-hidden shadow-black/30">
                    {/* Header bar */}
                    <div className="flex items-center justify-between border-b border-border bg-surface/50 px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex gap-1.5">
                          <div className="h-3 w-3 rounded bg-danger/60" />
                          <div className="h-3 w-3 rounded bg-warning/60" />
                          <div className="h-3 w-3 rounded bg-success/60" />
                        </div>
                        <span className="text-xs font-semibold text-foreground">Facturas ERP</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>CHILE</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                        <span>ACTIVO</span>
                      </div>
                    </div>

                    {/* Table */}
                    <div className="p-5">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold text-foreground">Libro de ventas</h3>
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">2026-11</span>
                      </div>
                      <div className="overflow-hidden rounded-lg border border-border bg-surface/50">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-border text-left text-xs font-semibold text-muted-foreground uppercase">
                              <th className="px-4 py-3">Folio</th>
                              <th className="px-4 py-3">Cliente</th>
                              <th className="px-4 py-3 text-right">Monto</th>
                              <th className="px-4 py-3 text-right">Estado</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            <tr className="hover:bg-primary/5 transition-colors">
                              <td className="px-4 py-3 font-mono tabular text-xs text-foreground">F-00872</td>
                              <td className="px-4 py-3 text-foreground">Constructora del Sur</td>
                              <td className="px-4 py-3 text-right text-foreground">$1.250.000</td>
                              <td className="px-4 py-3">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-success/10 text-success">
                                  <span className="h-1.5 w-1.5 rounded-full bg-success" />
                                  Pagada
                                </span>
                              </td>
                            </tr>
                            <tr>
                              <td className="px-4 py-3 font-mono tabular text-xs text-foreground">F-00873</td>
                              <td className="px-4 py-3 text-foreground">Retail Mayorista S.A.</td>
                              <td className="px-4 py-3 text-right text-foreground">$2.100.000</td>
                              <td className="px-4 py-3">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-warning/10 text-warning">
                                  <span className="h-1.5 w-1.5 rounded-full bg-warning" />
                                  Pendiente
                                </span>
                              </td>
                            </tr>
                            <tr>
                              <td className="px-4 py-3 font-mono tabular text-xs text-foreground">F-00874</td>
                              <td className="px-4 py-3 text-foreground">Distribuciones ABC</td>
                              <td className="px-4 py-3 text-right text-foreground">$680.000</td>
                              <td className="px-4 py-3">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-warning/10 text-warning">
                                  <span className="h-1.5 w-1.5 rounded-full bg-warning" />
                                  Parcial
                                </span>
                              </td>
                            </tr>
                            <tr>
                              <td className="px-4 py-3 font-mono tabular text-xs text-foreground">F-00875</td>
                              <td className="px-4 py-3 text-foreground">Servicios Integrales</td>
                              <td className="px-4 py-3 text-right text-foreground">$890.000</td>
                              <td className="px-4 py-3">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-success/10 text-success">
                                  <span className="h-1.5 w-1.5 rounded-full bg-success" />
                                  Pagada
                                </span>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                    <div className="border-t border-border bg-surface/50 px-5 py-4 flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total del período</span>
                      <div className="text-right">
                        <span className="text-xl font-bold tabular text-foreground">$4.920.000</span>
                        <span className="text-xs text-muted-foreground"> IVA incluido</span>
                      </div>
                    </div>
                  </div>
                </div>
              </SectionReveal>
            </div>
          </div>
        </SectionReveal>
      </div>
    </section>
  );
}