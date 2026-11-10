/**
 * El problema real: libros que no cuadran, IVA que no cierra, gastos sin responsable.
 * Sin estadísticas inventadas, sin "Sarah Chen updated a document".
 */
export function LandingProblema() {
  return (
    <section id="problema" className="bg-surface scroll-mt-24 border-t border-border">
      <div className="mx-auto max-w-3xl px-6 py-24 lg:py-32">
        <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-10 lg:mb-16 tracking-tight">
          Fin de mes sin sorpresas
        </h2>

        <div className="space-y-12 lg:space-y-16">
          <div className="flex flex-col lg:flex-row lg:items-center gap-8 lg:gap-16">
            <div className="lg:w-1/3 shrink-0 text-right lg:text-left">
              <h3 className="text-xl font-bold text-foreground mb-3">Los libros no cuadran</h3>
              <p className="text-base leading-relaxed text-muted-foreground">
                El día de declarar IVA, la información anda regada: facturas en el
                escritorio, un Excel que nadie más entiende y el estado del banco en
                otra pestaña. Copiar cada folio a mano cansa y al final del mes nadie
                recuerda quién pagó qué.
              </p>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center gap-8 lg:gap-16">
            <div className="lg:w-1/3 shrink-0">
              <h3 className="text-xl font-bold text-foreground mb-3">Gastos sin responsable</h3>
              <p className="text-base leading-relaxed text-muted-foreground">
                Cada gasto debería decir quién lo pagó y si ya se le reembolsó. Sin eso,
                el dinero se pierde entre recibos sueltos y mensajes de WhatsApp.
              </p>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center gap-8 lg:gap-16">
            <div className="lg:w-1/3 shrink-0 text-right lg:text-left">
              <h3 className="text-xl font-bold text-foreground mb-3">Sin visibilidad real</h3>
              <p className="text-base leading-relaxed text-muted-foreground">
                No sabes cuánto debes, cuánto te deben o cuánto gastó cada área hasta
                que es demasiado tarde para corregirlo.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
