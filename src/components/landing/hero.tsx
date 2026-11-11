"use client";

import Link from "next/link";

import { Button } from "@/components/astryx/button";
import Card from "@/components/astryx/card";
import { Stack } from "@/components/astryx/layout";
import { Text, Heading } from "@/components/astryx/typography";

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
        <Stack space="8">
          <div className="lg:grid lg:grid-cols-2 lg:gap-12 items-start">
            <div className="lg:col-span-1">
              <Stack space="4">
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-border bg-surface text-muted-foreground text-xs font-medium uppercase tracking-wider inline-block">
                  ERP para empresas chilenas
                </span>
                <Heading level={1}>
                  Tus cuentas al día, sin Excel
                </Heading>
                <Text as="p" className="text-lg lg:text-xl max-w-lg">
                  Registra compras, ventas y gastos. Concilia el banco. Lleva el
                  libro de compras y de ventas. Y siempre sabrás quién pagó cada
                  gasto. Montos en pesos, IVA al 19 %, todo en español.
                </Text>
                <Stack space="4" direction="row">
                  <Button variant="primary" size="lg" href="/login">
                    Entrar a mi cuenta
                  </Button>
                  <Button variant="outline" size="lg" href="#servicios">
                    Conocer los servicios
                  </Button>
                </Stack>
              </Stack>
            </div>
            <div className="lg:col-span-1 flex items-center justify-center">
              <Card className="w-full max-w-[520px] shadow-2xl">
                <Card.Header className="pb-0">
                  <div className="flex items-center justify-between">
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
                </Card.Header>
                <Card.Content className="p-0">
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-4">
                      <Heading level={3} className="text-sm mb-0">
                        Libro de ventas
                      </Heading>
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
                </Card.Content>
                <Card.Footer>
                  <Stack space="2">
                    <Text as="span" className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                      Total del período
                    </Text>
                    <div className="text-right">
                      <Text as="span" className="text-xl font-bold tabular text-foreground">
                        $4.920.000
                      </Text>
                      <Text as="span" className="text-[10px] text-muted-foreground">
                        IVA incluido
                      </Text>
                    </div>
                  </Stack>
                </Card.Footer>
              </Card>
            </div>
          </div>
        </Stack>
      </div>
    </section>
  );
}
