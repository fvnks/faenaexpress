import Link from "next/link";

/**
 * CTA directo: entrar al ERP o escribirnos para diseño web.
 * Sin adornos, sin "trusted by", sin countdown falso.
 */
export function LandingCTA() {
  return (
    <section className="bg-primary scroll-mt-24 border-t border-border/30">
      <div className="mx-auto max-w-2xl px-6 py-24 lg:py-32 text-center">
        <h2 className="text-3xl lg:text-4xl font-bold text-primary-foreground mb-6 lg:mb-10 tracking-tight">
          ¿Listo para ordenar tus cuentas?
        </h2>
        <p className="text-lg text-primary-foreground/90 leading-relaxed mb-12 lg:mb-16 max-w-lg mx-auto">
          Entra al ERP y empieza a registrar compras, ventas y gastos hoy mismo.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/login"
            className="relative inline-flex items-center justify-center gap-2 px-10 py-4 text-sm font-semibold text-black bg-white border border-transparent rounded-control hover:bg-primary-soft/50 transition-colors"
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
      </div>
    </section>
  );
}
