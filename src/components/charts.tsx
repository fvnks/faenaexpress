import { formatCLP } from "@/lib/money";
import type { MonthlyBucket } from "@/lib/reports";

/**
 * Gráfico de barras agrupadas (SVG, sin JS): evolución mensual de
 * ventas, compras y gastos. Los montos van en <title> (tooltip nativo).
 */
export function MonthlyBarsChart({ data }: { data: MonthlyBucket[] }) {
  const max = Math.max(1, ...data.flatMap((d) => [d.ventas, d.compras, d.gastos]));
  const width = 720;
  const height = 190;
  const padTop = 8;
  const padBottom = 24;
  const plotH = height - padTop - padBottom;
  const groupW = width / Math.max(1, data.length);
  const barW = Math.min(12, (groupW - 10) / 3);

  const series = [
    { key: "ventas" as const, label: "Ventas", fill: "var(--color-primary)" },
    { key: "compras" as const, label: "Compras", fill: "var(--color-accent)" },
    { key: "gastos" as const, label: "Gastos", fill: "var(--color-muted-foreground)" },
  ];

  return (
    <figure className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        {series.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: s.fill }} aria-hidden="true" />
            {s.label}
          </span>
        ))}
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full"
        role="img"
        aria-label="Evolución mensual de ventas, compras y gastos"
      >
        <line x1="0" y1={padTop + plotH} x2={width} y2={padTop + plotH} className="stroke-border" strokeWidth="1" />
        {data.map((bucket, i) => {
          const groupX = i * groupW + (groupW - barW * 3 - 8) / 2;
          return (
            <g key={bucket.key}>
              {series.map((s, j) => {
                const value = Math.max(0, bucket[s.key]);
                const barH = Math.round((value / max) * plotH);
                return (
                  <rect
                    key={s.key}
                    x={groupX + j * (barW + 4)}
                    y={padTop + plotH - barH}
                    width={barW}
                    height={barH}
                    rx="2"
                    fill={s.fill}
                  >
                    <title>{`${s.label} ${bucket.label}: ${formatCLP(bucket[s.key])}`}</title>
                  </rect>
                );
              })}
              <text
                x={i * groupW + groupW / 2}
                y={height - 6}
                textAnchor="middle"
                className="fill-muted-foreground"
                fontSize="11"
              >
                {bucket.label}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption className="text-xs text-muted-foreground">
        Máximo del período: {formatCLP(max)}. Pasa el cursor sobre una barra para ver el monto.
      </figcaption>
    </figure>
  );
}

/**
 * Ranking horizontal (HTML puro): top clientes, categorías, etc.
 */
export function RankBars({
  items,
  emptyLabel = "Sin datos en este período.",
}: {
  items: { label: string; total: number }[];
  emptyLabel?: string;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>;
  }
  const max = Math.max(1, ...items.map((item) => item.total));

  return (
    <ul className="flex flex-col gap-2.5">
      {items.map((item) => (
        <li key={item.label} className="flex flex-col gap-1">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 flex-1 truncate font-medium">{item.label}</span>
            <span className="tabular shrink-0 text-muted-foreground">{formatCLP(item.total)}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-background">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${Math.max(3, Math.round((item.total / max) * 100))}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
