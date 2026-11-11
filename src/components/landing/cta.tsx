"use client";

import Link from "next/link";
import { SectionReveal } from "@/components/motion/section-reveal";

/**
 * CTA final: entrar al ERP o escribirnos para diseño web.
 * Dos botones con jerarquía clara, sin adornos innecesarios.
 *
 * Fondo: azul primario con textura sutil.
 */
export function LandingCTA() {
  return (
    <section className="bg-primary scroll-mt-24 border-t border-primary/20 relative overflow-hidden">
      {/* Círculo sutil para profundidad */}
      <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary/10 rounded-full blur-[80px]" />

      <div className="relative z-10 mx-auto max-w-4xl px-6 py-24 lg:py-32">
        <SectionReveal delay={0}>
          <h2 className="text-3xl lg:text-4xl font-bold text-primary-foreground mb-6 lg:mb-10 tracking-tight">
            ¿Listo para ordenar tus cuentas?
          </h2>
          <p className="text-lg text-primary-foreground/90 leading-relaxed mb-12 lg:mb-16 max-w-lg mx-auto">
            Entra al ERP y empieza a registrar compras, ventas y gastos hoy mismo.
            O escríbenos si necesitas diseño web corporativo.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/login"
              className="relative inline-flex items-center justify-center gap-2 px-10 py-4 text-sm font-semibold text-white bg-primary-foreground border border-transparent rounded-control hover:bg-gray-100 transition-colors shadow-lg shadow-black/20"
            >
              Entrar a mi cuenta
            </Link>
            <Link
              href="/contacto"
              className="relative inline-flex items-center justify-center gap-2 px-10 py-4 text-sm font-semibold text-white border border-white/20 bg-transparent rounded-control hover:bg-white/10 transition-colors"
            >
              Diseño web corporativo
            </Link>
          </div>
        </SectionReveal>
      </div>
    </section>
  );
}
