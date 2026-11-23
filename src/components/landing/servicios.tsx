"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

/**
 * Dos servicios presentados de forma desigual: el ERP es el producto principal
 * (más ancho, más énfasis) y el diseño web es la oferta complementaria.
 * Sin cards idénticas, sin bento grid.
 */

export function LandingServicios() {
  return (
    <section
      id="servicios"
      className="border-t border-border bg-surface/50 section"
      aria-labelledby="servicios-heading"
    >
      <div className="mx-auto max-w-6xl px-6 py-24 lg:py-32 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-20 lg:mb-28">
          <h2
            id="servicios-heading"
            className="text-3xl lg:text-4xl font-bold text-foreground mb-6 tracking-tight"
          >
            Dos servicios, una seriedad
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Construimos el ERP que llevan las empresas chilenas y diseñamos sitios
            corporativos que no se confunden con plantillas.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* ERP: servicio principal, más ancho */}
          <Card className="lg:p-10">
            <div className="p-0">
              <article>
                <div className="flex items-start gap-4 mb-8">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[8px] bg-primary text-primary-foreground">
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className="text-primary-foreground"
                      aria-hidden="true"
                    >
                      <rect x="3" y="3" width="7" height="7" />
                      <rect x="14" y="3" width="7" height="7" />
                      <rect x="14" y="14" width="7" height="7" />
                      <rect x="3" y="14" width="7" height="7" />
                    </svg>
                  </div>
                  <div>
                    <Badge variant="primary" size="sm" className="mb-3 block w-fit">
                      Producto principal
                    </Badge>
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
                <ul className="space-y-3 mb-10">
                  {[
                    "Libro de compras y libro de ventas con IVA",
                    "Conciliación bancaria",
                    "Notas de crédito y débito",
                    "Gastos con responsable y reembolso",
                    "Catálogos de terceros y productos",
                    "Reportes de flujo de caja",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <span className="flex shrink-0 items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold mt-0.5">
                        ✓
                      </span>
                      <p className="text-sm text-foreground">{item}</p>
                    </li>
                  ))}
                </ul>
                <Link href="/contacto">
                  <Button className="w-full sm:w-auto">
                    Solicitar cuenta
                  </Button>
                </Link>
              </article>
            </div>
          </Card>

          {/* Diseño web: servicio complementario */}
          <Card className="border border-border bg-surface">
            <div className="p-8 lg:p-10">
              <article>
                <div className="flex items-start gap-4 mb-8">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[8px] bg-accent/10 text-accent">
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className="text-accent"
                      aria-hidden="true"
                    >
                      <rect x="2" y="3" width="20" height="14" rx="2" />
                      <line x1="8" y1="21" x2="16" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      <line x1="12" y1="17" x2="12" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </div>
                  <div>
                    <Badge variant="warning" size="sm" className="mb-3 block w-fit">
                      Complementario
                    </Badge>
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
                <ul className="space-y-3 mb-10">
                  {[
                    "Identidad visual y maquetación",
                    "Sitio responsivo y rápido",
                    "Integración con tu ERP",
                    "Copia y contenido profesional",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <span className="flex shrink-0 items-center justify-center w-5 h-5 rounded-full bg-accent/10 text-accent text-[10px] font-bold mt-0.5">
                        ✓
                      </span>
                      <p className="text-sm text-foreground">{item}</p>
                    </li>
                  ))}
                </ul>
                <Link href="/contacto">
                  <Button variant="secondary" className="w-full sm:w-auto border-accent hover:bg-accent/10">
                    Ver proyectos
                  </Button>
                </Link>
              </article>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}