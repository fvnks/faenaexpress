export function LandingPlatformSection() {
  return (
    <section className="border-t border-border bg-surface">
      <div className="mx-auto max-w-5xl px-6 py-16">
        <div className="flex flex-col lg:flex-row lg:items-start gap-8">
          <div className="lg:w-1/3 shrink-0">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Facturas es el primer módulo
            </h2>
            <p className="mt-2 max-w-lg text-base text-muted-foreground">
              Yellow ERP se arma de a poco, con módulos que funcionan antes de anunciarlos.
            </p>
          </div>
          <div className="flex-1 grid gap-4 sm:grid-cols-3">
            {[
              ["Facturas", "Compras, ventas, gastos, banco, inventario y comisiones.", true],
              ["Remuneraciones", "Trabajadores, pagos y ausencias del módulo RRHH.", true],
              ["Más módulos", "En camino, cuando estén listos y no antes.", false],
            ].map(([nombre, texto, listo]) => (
              <div
                key={String(nombre)}
                className={
                  "rounded-2xl border p-5 " +
                  (listo
                    ? "border-border bg-background"
                    : "border-dashed border-border bg-transparent")
                }
              >
                <p className="font-semibold text-foreground">{nombre}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{texto}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
