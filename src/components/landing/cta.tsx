"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

/**
 * CTA final: entrar al ERP o escribirnos para diseño web.
 * Dos botones con jerarquía clara, sin adornos innecesarios.
 * Primary action matches hero: Solicitar cuenta (→ contacto), Secondary: Entrar (→ login)
 */

export function LandingCTA() {
  return (
    <section className="bg-primary border-t border-primary/20 section">
      <div className="mx-auto max-w-4xl px-6 py-24 lg:py-32">
        <div className="text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-primary-foreground mb-6 lg:mb-10 tracking-tight">
            ¿Listo para ordenar tus cuentas?
          </h2>
          <p className="text-lg text-primary-foreground/90 leading-relaxed mb-12 lg:mb-16 max-w-lg mx-auto">
            Entra al ERP y empieza a registrar compras, ventas y gastos hoy mismo.
            O escríbenos si necesitas diseño web corporativo.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/contacto">
              <Button variant="secondary" className="w-full sm:w-auto">
                Solicitar cuenta
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="ghost" className="w-full sm:w-auto border-primary-foreground/30 hover:bg-primary-foreground/10 text-primary-foreground">
                Entrar a mi cuenta
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}