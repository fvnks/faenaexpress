import type { PuntoCurvaS } from "@/lib/obra-budget";

/** Gráfico de líneas de la curva S: obligado planificado vs. avance valorizado. */
export function ObraCurvaS({ puntos }: { puntos: PuntoCurvaS[] }) {
  if (puntos.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Sin datos para la curva.</p>;
  }

  const width = 720;
  const height = 220;
  const padLeft = 56;
  const padRight = 12;
  const padTop = 12;
  const padBottom = 28;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;
  const max = Math.max(1, ...puntos.flatMap((p) => [p.planificado, p.real]));
  const stepX = puntos.length > 1 ? plotW / (puntos.length - 1) : 0;
  const y = (value: number) => padTop + plotH - (Math.max(0, value) / max) * plotH;
  const x = (index: number) => padLeft + index * stepX;
  const line = (key: "planificado" | "real") =>
    puntos.map((p, i) => `${x(i).toFixed(1)},${y(p[key]).toFixed(1)}`).join(" ");

  const fmt = (v: number) =>
    new Intl.NumberFormat("es-CL", { notation: "compact", maximumFractionDigits: 1 }).format(v);

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-56 w-full min-w-[560px]" role="img" aria-label="Curva S: avance planificado versus real">
        {/* Eje Y: 4 líneas de referencia */}
        {[0, 1, 2, 3, 4].map((i) => {
          const value = (max / 4) * i;
          return (
            <g key={i}>
              <line x1={padLeft} y1={y(value)} x2={width - padRight} y2={y(value)} stroke="currentColor" className="text-border" strokeWidth="1" />
              <text x={padLeft - 8} y={y(value) + 4} textAnchor="end" className="fill-muted-foreground text-[10px]">{fmt(value)}</text>
            </g>
          );
        })}

        {/* Plan (cobre punteado) y real (verde) */}
        <polyline points={line("planificado")} fill="none" stroke="var(--primary)" strokeWidth="2" strokeDasharray="6 4" />
        <polyline points={line("real")} fill="none" stroke="var(--success)" strokeWidth="2.5" />

        {puntos.map((p, i) => (
          <g key={p.mes}>
            <circle cx={x(i)} cy={y(p.real)} r="3.5" fill="var(--success)">
              <title>{`${p.mes}: plan ${fmt(p.planificado)} · real ${fmt(p.real)}`}</title>
            </circle>
            <text x={x(i)} y={height - 8} textAnchor="middle" className="fill-muted-foreground text-[9px]">
              {p.mes.slice(5)}/{p.mes.slice(2, 4)}
            </text>
          </g>
        ))}
      </svg>
      <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="inline-block h-0.5 w-4 border-t-2 border-dashed" style={{ borderColor: "var(--primary)" }} /> Planificado</span>
        <span className="flex items-center gap-1.5"><span className="inline-block h-0.5 w-4" style={{ backgroundColor: "var(--success)" }} /> Avance real</span>
      </div>
    </div>
  );
}
