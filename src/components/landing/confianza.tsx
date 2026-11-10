/**
 * Confianza sin adornos: no hay logos de clientes inventados ni testimonios
 * fabricados. Solo lo que somos y cómo trabajamos.
 */
export function LandingConfianza() {
  return (
    <section className="bg-surface scroll-mt-24 border-t border-border">
      <div className="mx-auto max-w-3xl px-6 py-24 lg:py-32">
        <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-10 lg:mb-16 tracking-tight">
          Empresa chilena, reglas claras
        </h2>

        <div className="space-y-10 lg:space-y-14">
          <div className="flex flex-col gap-4">
            <h3 className="text-lg font-bold text-foreground">Tus datos son tuyos</h3>
            <p className="text-base leading-relaxed text-muted-foreground">
              Exporta todo lo de tu empresa a CSV cuando quieras, sin pedir permiso ni
              esperar a nadie. Cada empresa vive aislada: nadie ve los datos de otra,
              salvo que des el permiso explícito.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <h3 className="text-lg font-bold text-foreground">Hecho en Chile</h3>
            <p className="text-base leading-relaxed text-muted-foreground">
              Montos en pesos, IVA al 19 %, todo en español. Diseñado para la realidad
              de las empresas chilenas, no traducido de otro mercado.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <h3 className="text-lg font-bold text-foreground">Sin sorpresas de fin de mes</h3>
            <p className="text-base leading-relaxed text-muted-foreground">
              Los libros cuadran con el resumen de IVA. Sabes siempre quién pagó cada
              gasto y cuánto te deben o debes. No hay cálculos ocultos.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
