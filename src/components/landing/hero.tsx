"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function LandingHero() {
  return (
    <section className="border-b border-border bg-surface/50 section">
      <div className="mx-auto max-w-7xl px-6 py-20 lg:py-32">
        <div className="lg:grid lg:grid-cols-2 lg:gap-16 items-start">
          {/* Content */}
          <div className="lg:col-span-1">
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

          {/* Dashboard preview - aligned to the app's card system */}
          <div className="lg:col-span-1">
            <div className="relative w-full max-w-[520px] mx-auto lg:ml-auto">
              <div className="card overflow-hidden">
                {/* Header bar */}
                <div className="flex items-center justify-between border-b border-border bg-background/50 px-5 py-4">
                  <span className="text-xs font-semibold text-foreground">Facturas ERP</span>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>CHILE</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-accent" aria-hidden="true" />
                    <span>ACTIVO</span>
                  </div>
                </div>

                {/* Table */}
                <div className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-foreground">Libro de ventas</h3>
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">2026-11</span>
                  </div>
                  <div className="overflow-hidden rounded-[8px] border border-border bg-background/50">
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
                            <Badge variant="success" size="sm">
                              Pagada
                            </Badge>
                          </td>
                        </tr>
                        <tr>
                          <td className="px-4 py-3 font-mono tabular text-xs text-foreground">F-00873</td>
                          <td className="px-4 py-3 text-foreground">Retail Mayorista S.A.</td>
                          <td className="px-4 py-3 text-right text-foreground">$2.100.000</td>
                          <td className="px-4 py-3">
                            <Badge variant="warning" size="sm">
                              Pendiente
                            </Badge>
                          </td>
                        </tr>
                        <tr>
                          <td className="px-4 py-3 font-mono tabular text-xs text-foreground">F-00874</td>
                          <td className="px-4 py-3 text-foreground">Distribuciones ABC</td>
                          <td className="px-4 py-3 text-right text-foreground">$680.000</td>
                          <td className="px-4 py-3">
                            <Badge variant="warning" size="sm">
                              Parcial
                            </Badge>
                          </td>
                        </tr>
                        <tr>
                          <td className="px-4 py-3 font-mono tabular text-xs text-foreground">F-00875</td>
                          <td className="px-4 py-3 text-foreground">Servicios Integrales</td>
                          <td className="px-4 py-3 text-right text-foreground">$890.000</td>
                          <td className="px-4 py-3">
                            <Badge variant="success" size="sm">
                              Pagada
                            </Badge>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="border-t border-border bg-background/50 px-5 py-4 flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total del período</span>
                  <div className="text-right">
                    <span className="text-xl font-bold tabular text-foreground">$4.920.000</span>
                    <span className="text-xs text-muted-foreground"> IVA incluido</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}