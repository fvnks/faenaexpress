"use client";

import Link from "next/link";

import { Button } from "@/components/astryx/button";
import Card from "@/components/astryx/card";
import { Grid } from "@/components/astryx/layout";
import { Heading, Text } from "@/components/astryx/typography";

export function LandingServicios() {
  return (
    <section id="servicios" className="bg-background scroll-mt-24 border-t border-border">
      <div className="mx-auto max-w-6xl px-6 py-24 lg:py-36">
        <Grid cols="1" gap="10">
          <div className="lg:col-span-1">
            <Heading level={2} className="text-center max-w-3xl mx-auto mb-4">
              Dos servicios, una seriedad
            </Heading>
            <Text as="p" className="text-center max-w-3xl mx-auto">
              Construimos el ERP que llevan las empresas chilenas y diseñamos
              sitios corporativos que no se confunden con plantillas.
            </Text>
          </div>

          <Grid cols="1 lg:2" gap="16">
            <Card className="p-10 lg:p-14">
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
                  <Heading level={3} className="text-2xl mb-2">
                    Facturas ERP
                  </Heading>
                  <Text as="p" className="text-sm text-muted-foreground">
                    Chile · CLP · IVA 19 %
                  </Text>
                </div>
              </div>
              <Text as="p" className="text-base mb-8">
                Registra compras, ventas y gastos. Concilia el banco. Lleva el
                libro de compras y de ventas. Y siempre sabrás quién pagó cada
                gasto.
              </Text>
              <Grid cols="1" gap="4">
                {[
                  "Libro de compras y libro de ventas con IVA",
                  "Conciliación bancaria",
                  "Notas de crédito y débito",
                  "Gastos con responsable y reembolso",
                  "Catálogos de terceros y productos",
                  "Reportes de flujo de caja",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <span className="flex shrink-0 items-center justify-center w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold mt-0.5">
                      ✓
                    </span>
                    <Text as="p" className="text-sm mb-0">
                      {item}
                    </Text>
                  </div>
                ))}
              </Grid>
              <Button
                variant="primary"
                size="md"
                className="mt-8 w-full"
                href="/login"
              >
                Entrar al ERP
              </Button>
            </Card>

            <Card className="p-10 lg:p-14">
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
                  <Heading level={3} className="text-2xl mb-2">
                    Diseño web corporativo
                  </Heading>
                  <Text as="p" className="text-sm text-muted-foreground">
                    Sitios para empresas serias
                  </Text>
                </div>
              </div>
              <Text as="p" className="text-base mb-8">
                Diseñamos sitios corporativos que reflejan la seriedad de tu
                empresa. Sin plantillas genéricas, sin adornos innecesarios:
                estructura clara, tipografía intencional y contenido que
                comunica.
              </Text>
              <Grid cols="1" gap="4">
                {[
                  "Identidad visual y maquetación",
                  "Sitio responsivo y rápido",
                  "Integración con tu ERP",
                  "Copia y contenido profesional",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <span className="flex shrink-0 items-center justify-center w-4 h-4 rounded-full bg-accent text-accent text-[10px] font-bold mt-0.5">
                      ✓
                    </span>
                    <Text as="p" className="text-sm mb-0">
                      {item}
                    </Text>
                  </div>
                ))}
              </Grid>
              <Button
                variant="outline"
                size="md"
                className="mt-8 w-full"
                href="/contacto"
              >
                Ver proyectos
              </Button>
            </Card>
          </Grid>
        </Grid>
      </div>
    </section>
  );
}
