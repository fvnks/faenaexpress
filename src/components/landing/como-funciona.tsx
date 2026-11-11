"use client";

import { SectionReveal } from "@/components/motion/section-reveal";

/**
 * Cómo funciona: flujo real del producto, paso a paso.
 * Sin el template genérico de "1, 2, 3" con iconos redondos idénticos.
 *
 * Fondo: textura sutil de papel de factura.
 */
export function LandingComoFunciona() {
  const pasos = [
    {
      numero: "01",
      titulo: "Registra tus documentos",
      descripcion:
        "Ingresa facturas de compra y venta, boletas y notas con su RUT, folio, neto, IVA y total. Cada documento queda registrado con su estado de pago o cobro.",
    },
    {
      numero: "02",
      titulo: "Concilia el banco",
      descripcion:
        "Importa los movimientos bancarios y empáralos con tus compras por pagar y ventas por cobrar. Lo que no calza queda en una bandeja para revisar.",
    },
    {
      numero: "03",
      titulo: "Saber quién pagó qué",
      descripcion:
        "Cada gasto registra a su pagador y si ya se le reembolsó. Al final del mes sabes exactamente cuánto gastó cada área y cuánto te deben o debes.",
    },
  ];

  return (
    <section id="como-funciona" className="bg-surface scroll-mt-24 border-t border-border relative overflow-hidden">
      {/* Textura sutil de papel */}
      <div
        className="absolute inset-0 z-0 pointer-events-none opacity-30"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(27, 95, 168, 0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(27, 95, 168, 0.03) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      <div className="relative z-10 mx-auto max-w-5xl px-6 py-24 lg:py-36">
        <SectionReveal delay={0}>
          <div className="text-center max-w-2xl mx-auto mb-20 lg:mb-28">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-6 tracking-tight">
              Cómo funciona
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Tres pasos para tener los libros al día sin sorpresas de fin de mes.
            </p>
          </div>
        </SectionReveal>

        <div className="relative grid gap-16 lg:grid-cols-3">
          {/* Línea vertical sutil entre pasos */}
          <div className="hidden lg:block absolute left-1/2 top-20 bottom-20 w-px bg-border" />

          {pasos.map((paso, index) => (
            <SectionReveal key={paso.numero} delay={index * 40 + 60}>
              <div className="relative z-10">
                <div className="flex items-start gap-4 mb-6">
                  <div className="flex shrink-0 items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold text-sm">
                    {paso.numero}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-foreground mb-1">
                      {paso.titulo}
                    </h3>
                  </div>
                </div>
                <p className="text-base leading-relaxed text-muted-foreground">
                  {paso.descripcion}
                </p>
              </div>
            </SectionReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
