"use client";

import Link from "next/link";
import { SectionReveal } from "@/components/motion/section-reveal";
import { Button } from "@/components/ui/button";

/**
 * CTA final: entrar al ERP o escribirnos para diseño web.
 * Dos botones con jerarquía clara, sin adornos innecesarios.
 */

export function LandingCTA() {
  return (
    <section className="bg-primary border-t border-primary/20 section">
      <div className="mx-auto max-w-4xl px-6 py-24 lg:py-32">
        <SectionReveal delay={0}>
          <div className="text-center">
            <h2 className="text-3xl lg:text-4xl font-bold text-primary-foreground mb-6 lg:mb-10 tracking-tight">
              ¿Listo para ordenar tus cuentas?
            </h2>
            <p className="text-lg text-primary-foreground/90 leading-relaxed mb-12 lg:mb-16 max-w-lg mx-auto">
              Entra al ERP y empieza a registrar compras, ventas y gastos hoy mismo.
              O escríbenos si necesitas diseño web corporativo.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/login" className="btn-secondary w-full sm:w-auto">
                Entrar a mi cuenta
              </Link>
              <Link href="/contacto" className="btn-ghost w-full sm:w-auto border-border hover:bg-primary-foreground/10">
                Diseño web corporativo
              </Link>
            </div>
          </div>
        </SectionReveal>
      </div>
    </section>
  );
}