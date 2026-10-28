export function LandingFeaturesSection() {
  return (
    <section id="que-hace" className="mx-auto max-w-5xl scroll-mt-20 px-6 py-16">
      <div className="flex flex-col lg:flex-row lg:items-start gap-8">
        <div className="lg:w-1/3 shrink-0">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Qué hace el módulo Facturas hoy
          </h2>
          <p className="mt-2 max-w-lg text-base text-muted-foreground">
            Todo esto funciona ya en producción con datos reales.
          </p>
        </div>
        <div className="flex-1 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-border bg-surface p-6">
            <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Lo que más cambia tu semana
            </p>
            <h3 className="mt-2 text-xl font-semibold text-foreground">
              Conciliación bancaria en el mismo lugar
            </h3>
            <p className="mt-3 text-base leading-relaxed text-muted-foreground">
              Baja los movimientos del banco, los revisa contra tus compras por pagar y
              ventas por cobrar, y te muestra las parejas alineadas para aceptarlas con un
              clic. Si algo no calza, queda anotado en una bandeja para revisar con calma.
            </p>
          </div>
          <ul className="space-y-4">
            {[
              ["Compras y ventas", "Facturas, boletas y notas con IVA, vencimiento y medio de pago."],
              ["Gastos con responsable", "Cada gasto dice quién lo pagó y si ya se le reembolsó."],
              ["XML del SII", "Importa el sobre del SII y completa la factura en un paso."],
              ["Reportes", "Flujo de caja, IVA mensual, libro de compras y ventas."],
            ].map(([titulo, texto]) => (
              <li key={titulo} className="border-l-2 border-border pl-4">
                <p className="font-medium text-foreground">{titulo}</p>
                <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
                  {texto}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
