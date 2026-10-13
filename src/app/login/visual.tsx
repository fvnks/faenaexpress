/**
 * Columna visual del login: gradiente mesh con los tonos de la marca y un
 * mockup de navegador flotando (perspectiva suave) con un mini panel ERP
 * dibujado en HTML/CSS puro. Es decorativo: aria-hidden en todo el conjunto.
 */
export function LoginVisual() {
  return (
    <div className="relative h-full w-full overflow-hidden" aria-hidden="true">
      {/* Gradiente mesh con los colores de la marca */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: [
            "radial-gradient(at 12% 18%, var(--color-primary-soft) 0px, transparent 55%)",
            "radial-gradient(at 88% 12%, var(--color-accent-soft) 0px, transparent 50%)",
            "radial-gradient(at 78% 88%, var(--color-primary-soft) 0px, transparent 55%)",
            "radial-gradient(at 30% 92%, var(--color-accent-soft) 0px, transparent 45%)",
          ].join(", "),
        }}
      />
      {/* Velo diagonal sutil para dar profundidad */}
      <div className="absolute inset-0 bg-linear-to-br from-primary/5 via-transparent to-primary/25" />

      {/* Mockup flotante */}
      <div className="absolute inset-0 flex items-center justify-center p-8 [perspective:1400px]">
        <div className="float-soft motion-reduce:animate-none w-full max-w-[460px] [transform:rotateY(-5deg)_rotateX(2deg)]">
          <div className="overflow-hidden rounded-xl border border-border/70 bg-surface shadow-[0_40px_80px_-24px_rgb(0_0_0/0.35)]">
            {/* Chrome del navegador */}
            <div className="flex items-center gap-1.5 border-b border-border bg-background px-4 py-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-danger/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-accent/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-success/70" />
              <span className="ml-3 h-4 flex-1 rounded-md bg-primary-soft/60" />
            </div>

            {/* Mini panel ERP */}
            <div className="flex">
              {/* Mini sidebar */}
              <div className="flex w-12 flex-col items-center gap-3 border-r border-border bg-background px-2 py-4">
                <span className="h-6 w-6 rounded-md bg-primary" />
                <span className="h-1.5 w-6 rounded-full bg-muted-foreground/25" />
                <span className="h-1.5 w-6 rounded-full bg-muted-foreground/15" />
                <span className="h-1.5 w-6 rounded-full bg-muted-foreground/15" />
                <span className="h-1.5 w-6 rounded-full bg-muted-foreground/15" />
              </div>

              {/* Contenido */}
              <div className="flex-1 space-y-3 p-4">
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { bar: "bg-primary", w: "w-3/4" },
                    { bar: "bg-accent", w: "w-2/3" },
                    { bar: "bg-muted-foreground/40", w: "w-1/2" },
                  ].map((chip, i) => (
                    <div key={i} className="rounded-lg border border-border bg-background p-2.5">
                      <span className="block h-1.5 w-8 rounded-full bg-muted-foreground/25" />
                      <span className={`tabular mt-2 block h-2 ${chip.w} rounded-full ${chip.bar}`} />
                    </div>
                  ))}
                </div>

                {/* Gráfico de barras */}
                <div className="rounded-lg border border-border bg-background p-3">
                  <div className="flex h-20 items-end gap-1.5">
                    {[38, 55, 30, 68, 46, 84, 60, 95, 52, 74, 44, 88].map((h, i) => (
                      <div
                        key={i}
                        className={`flex-1 rounded-t-sm ${i % 3 === 1 ? "bg-accent/70" : "bg-primary/80"}`}
                        style={{ height: `${h}%` }}
                      />
                    ))}
                  </div>
                </div>

                {/* Filas de tabla */}
                <div className="space-y-1.5">
                  {[90, 70, 80].map((w, i) => (
                    <div key={i} className="flex items-center gap-2 rounded-md border border-border bg-background px-2.5 py-1.5">
                      <span className="h-3.5 w-3.5 rounded-full bg-primary-soft" />
                      <span className="h-1.5 rounded-full bg-muted-foreground/20" style={{ width: `${w}%` }} />
                      <span className="ml-auto h-1.5 w-10 rounded-full bg-primary/60" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Texto decorativo */}
      <p className="absolute bottom-6 right-8 text-right font-light tracking-wide text-foreground/55">
        Facturación clara para tu negocio.
        <span className="block text-xs opacity-80">Hecho en Chile.</span>
      </p>
    </div>
  );
}
