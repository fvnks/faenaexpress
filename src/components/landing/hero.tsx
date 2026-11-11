"use client";

import Link from "next/link";
import { SectionReveal } from "@/components/motion/section-reveal";

export function LandingHero() {
  return (
    <section className="relative border-b border-border overflow-hidden">
      <div className="absolute inset-0 z-0 bg-background" />
      <div
        className="absolute inset-0 z-10 pointer-events-none opacity-40"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(27, 95, 168, 0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(27, 95, 168, 0.04) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/10 rounded-full blur-[100px]" />

      <div className="relative z-30 mx-auto max-w-7xl px-6 py-24 lg:py-36">
        <SectionReveal delay={0}>
          <div className="lg:grid lg:grid-cols-2 lg:gap-12 items-start">
            <div className="lg:col-span-1">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-border bg-surface text-muted-foreground text-xs font-medium uppercase tracking-wider mb-6 inline-block lg:mb-10">
                ERP para empresas chilenas
              </span>
              <h1 className="text-4xl lg:text-6xl font-bold text-foreground leading-tight mb-8 lg:mb-12 tracking-tight">
                Tus cuentas al día, sin Excel
              </h1>
              <p className="text-lg lg:text-xl text-muted-foreground leading-relaxed max-w-lg mb-12 lg:mb-16">
                Registra compras, ventas y gastos. Concilia el banco. Lleva el libro
                de compras y de ventas. Y siempre sabrás quién pagó cada gasto. Montos
                en pesos, IVA al 19 %, todo en español.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/login"
                  className="relative inline-flex items-center justify-center gap-2 px-8 py-4 text-sm font-semibold text-white bg-primary border border-transparent rounded-control hover:bg-primary/90 transition-colors shadow-lg shadow-black/20"
                >
                  Entrar a mi cuenta
                </Link>
                <Link
                  href="#servicios"
                  className="relative inline-flex items-center justify-center gap-2 px-8 py-4 text-sm font-semibold text-foreground border border-border bg-transparent rounded-control hover:bg-surface/50 transition-colors"
                >
                  Conocer los servicios
                </Link>
              </div>
            </div>
            <div className="lg:col-span-1 flex items-center justify-center">
              <div className="relative w-full max-w-[520px]">
                <div className="absolute inset-0 bg-black/30 blur-xl rounded-[16px] -translate-y-4" />
                <div className="relative rounded-[16px] border border-border bg-surface shadow-2xl overflow-hidden">
                  <div className="border-b border-border bg-surface/50 px-5 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-7 w-7 rounded-lg bg-primary" />
                      <span className="text-xs font-semibold text-foreground tracking-tight">
                        Facturas ERP
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>CHILE</span>
                      <span className="w-1 h-1 rounded-full bg-accent" />
                      <span>ACTIVO</span>
                    </div>
                  </div>
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-semibold text-foreground">
                        Libro de ventas
                      </h3>
                      <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                        2026-11
                      </span>
                    </div>
                    <div className="overflow-hidden rounded-lg border border-border bg-surface/50">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border text-left text-[10px] font-semibold text-muted-foreground uppercase">
                            <th className="px-4 py-3">Folio</th>
                            <th className="px-4 py-3">Cliente</th>
                            <th className="px-4 py-3 text-right">Monto</th>
                            <th className="px-4 py-3 text-right">Estado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          <tr className="hover:bg-white/5 transition-colors">
                            <td className="px-4 py-3 font-mono tabular text-[11px] text-foreground">F-00872</td>
                            <td className="px-4 py-3 tabular text-[11px] text-foreground">Constructora del Sur</td>
                            <td className="px-4 py-3 tabular text-[11px] text-right text-foreground">$1.250.000</td>
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-success-soft text-success">
                                Pagada
                              </span>
                            </td>
                          </tr>
                          <tr className="hover:bg-white/5 transition-colors">
                            <td className="px-4 py-3 font-mono tabular text-[11px] text-foreground">F-00873</td>
                            <td className="px-4 py-3 tabular text-[11px] text-foreground">Retail Mayorista S.A.</td>
                            <td className="px-4 py-3 tabular text-[11px] text-right text-foreground">$2.100.000</td>
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-accent-soft text-accent">
                                Pendiente
                              </span>
                            </td>
                          </tr>
                          <tr className="hover:bg-white/5 transition-colors">
                            <td className="px-4 py-3 font-mono tabular text-[11px] text-foreground">F-00874</td>
                            <td className="px-4 py-3 tabular text-[11px] text-foreground">Distribuciones ABC</td>
                            <td className="px-4 py-3 tabular text-[11px] text-right text-foreground">$680.000</td>
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-accent-soft text-accent">
                                Parcial
                              </span>
                            </td>
                          </tr>
                          <tr className="hover:bg-white/5 transition-colors">
                            <td className="px-4 py-3 font-mono tabular text-[11px] text-foreground">F-00875</td>
                            <td className="px-4 py-3 tabular text-[11px] text-foreground">Servicios Integrales</td>
                            <td className="px-4 py-3 tabular text-[11px] text-right text-foreground">$890.000</td>
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-success-soft text-success">
                                Pagada
                              </span>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div className="border-t border-border bg-surface/50 px-5 py-4 flex items-center justify-between">
                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                      Total del período
                    </span>
                    <div className="text-right">
                      <span className="text-xl font-bold tabular text-foreground">
                        $4.920.000
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        IVA incluido
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </SectionReveal>
      </div>
    </section>
  );
}
