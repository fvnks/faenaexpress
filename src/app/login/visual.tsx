import { PRODUCTOS_PUBLICOS } from "@/lib/modules";

/**
 * Columna visual de las pantallas de entrada.
 *
 * Antes dibujaba un panel de Facturas (gráfico de barras, filas de tabla,
 * tarjetas de montos): la puerta de entrada prometía un producto contable cuando
 * la plataforma ya tiene más de uno. Ahora muestra los módulos que la plataforma
 * ofrece, sacados del registro real, así que uno nuevo aparece solo.
 *
 * No muestra datos de ninguna cuenta: la ve cualquiera antes de entrar.
 */
export function PlatformVisual() {
  return (
    <div className="relative h-full w-full overflow-hidden" aria-hidden="true">
      {/* Gradiente mesh con los tonos de la marca */}
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

      <div className="relative flex h-full flex-col justify-center gap-10 px-8 py-10 lg:px-14">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Los sistemas de gestión
          </p>
          <p className="mt-2 max-w-sm text-2xl font-light leading-snug tracking-tight">
            Todo lo que tu empresa y tu colegio necesitan, en el mismo lugar.
          </p>
        </div>

        <ul className="grid max-w-md gap-3">
          {PRODUCTOS_PUBLICOS.map((producto) => (
            <li
              key={producto.code}
              className="float-soft motion-reduce:animate-none rounded-xl border border-border/70 bg-surface/95 p-4 shadow-[0_18px_40px_-24px_rgb(0_0_0/0.4)] backdrop-blur-sm"
            >
              <p className="text-sm font-semibold tracking-tight">{producto.name}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{producto.tagline}</p>
            </li>
          ))}
        </ul>

        <p className="max-w-sm text-sm font-light tracking-wide text-foreground/55">
          Hecho en Chile.
        </p>
      </div>
    </div>
  );
}
