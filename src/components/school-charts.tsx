"use client";

import type { AsistenciaDia, RendimientoCurso } from "@/lib/school-panel";

/**
 * Gráfico de líneas (SVG, sin JS): evolución de la asistencia diaria.
 * Cada punto muestra el porcentaje de asistencia de ese día.
 */
export function AsistenciaLineChart({ data }: { data: AsistenciaDia[] }) {
  if (data.length === 0) {
    return (
      <div className="rounded-card border border-border p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Sin clases registradas en los últimos 14 días.
        </p>
      </div>
    );
  }

  const max = Math.max(100, ...data.map((d) => d.porcentaje));
  const width = 720;
  const height = 200;
  const padTop = 40;
  const padBottom = 40;
  const padLeft = 50;
  const padRight = 20;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;
  const stepX = plotW / Math.max(1, data.length - 1);

  const promedio = Math.round(
    data.reduce((acc, d) => acc + d.porcentaje, 0) / data.length,
  );

  const lineYs = ["0", "25", "50", "75", "100"];

  return (
    <figure className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-2 text-xs text-muted-foreground">
        <span>Asistencia diaria (últimos 14 días)</span>
        <span>Promedio: {promedio}%</span>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full"
        role="img"
        aria-label="Evolución de la asistencia diaria"
      >
        {/* Eje Y - líneas y etiquetas */}
        {lineYs.map((y) => (
          <React.Fragment key={y}>
            <line
              x1={padLeft}
              y1={padTop + plotH - (Number(y) / max) * plotH}
              x2={width - padRight}
              y2={padTop + plotH - (Number(y) / max) * plotH}
              className="stroke-border/40"
              strokeWidth="1"
            />
            <text
              x={padLeft - 8}
              y={padTop + plotH - (Number(y) / max) * plotH + 4}
              textAnchor="end"
              className="fill-muted-foreground"
              fontSize="10"
            >
              {y}%
            </text>
          </React.Fragment>
        ))}

        {/* Línea de asistencia */}
        <polyline
          points={data
            .map((d, i) => {
              const x = padLeft + i * stepX;
              const y = padTop + plotH - (d.porcentaje / max) * plotH;
              return `${x},${y}`;
            })
            .join(" ")}
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth="2"
        />

        {/* Puntos */}
        {data.map((d, i) => {
          const x = padLeft + i * stepX;
          const y = padTop + plotH - (d.porcentaje / max) * plotH;
          return (
            <circle
              key={d.fecha}
              cx={x}
              cy={y}
              r={3}
              fill="var(--color-primary)"
            >
              <title>
                {d.fecha}: {d.porcentaje}% ({d.alumnosRegistrados} de {d.alumnosEsperados})
              </title>
            </circle>
          );
        })}

        {/* Eje X - fechas */}
        {data.map((d, i) => {
          const x = padLeft + i * stepX;
          return (
            <text
              key={d.fecha}
              x={x}
              y={height - 8}
              textAnchor="middle"
              className="fill-muted-foreground"
              fontSize="10"
            >
              {d.fecha.slice(5)}
            </text>
          );
        })}
      </svg>
      <figcaption className="text-xs text-muted-foreground">
        Pasa el cursor sobre un punto para ver el detalle del día.
      </figcaption>
    </figure>
  );
}

/**
 * Gráfico de barras horizontales: rendimiento por curso (promedio de notas).
 */
export function RendimientoCursoBars({ data }: { data: RendimientoCurso[] }) {
  if (data.length === 0) {
    return (
      <div className="rounded-card border border-border p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Sin datos de notas disponibles.
        </p>
      </div>
    );
  }

  const max = Math.max(7, ...data.map((d) => d.promedio ?? 0));

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-medium text-muted-foreground">
        Promedio de notas finales por curso
      </p>
      <div className="flex flex-col gap-4">
        {data.map((curso) => {
          const promedio = curso.promedio ?? 0;
          const widthPct = Math.max(3, (promedio / max) * 100);
          const color = promedio >= 4.0 ? "bg-primary" : "bg-danger";
          return (
            <div key={curso.courseId} className="flex items-center gap-3">
              <span className="w-28 text-xs text-muted-foreground truncate">
                {curso.curso}
              </span>
              <div className="flex-1 h-6 bg-background rounded-full overflow-hidden border border-border/60">
                <div className={`h-full rounded-full ${color}`} style={{ width: `${widthPct}%` }} />
              </div>
              <span className="w-16 text-right tabular text-xs font-medium">
                {promedio.toFixed(1)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Tarjeta de distribución: aprobados / reprobados / sin nota.
 */
export function DistribucionNotasCard({ data }: { data: RendimientoCurso[] }) {
  const totalAprobados = data.reduce((acc, d) => acc + d.aprobados, 0);
  const totalReprobados = data.reduce((acc, d) => acc + d.reprobados, 0);
  const totalSinNota = data.reduce((acc, d) => acc + d.sinNota, 0);
  const total = totalAprobados + totalReprobados + totalSinNota;

  if (total === 0) {
    return (
      <div className="rounded-card border border-border p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Sin alumnos con notas registradas.
        </p>
      </div>
    );
  }

  const pctAprobados = Math.round((totalAprobados / total) * 100);
  const pctReprobados = Math.round((totalReprobados / total) * 100);
  const pctSinNota = Math.round((totalSinNota / total) * 100);

  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="rounded-card border border-success/50 bg-success-soft p-4">
        <p className="text-xs text-success/80 font-medium">Aprobados</p>
        <p className="text-2xl leading-none tracking-tight tabular-nums text-success">
          {totalAprobados}
        </p>
        <p className="text-xs text-success/80">{pctAprobados}% del total</p>
      </div>
      <div className="rounded-card border border-danger/50 bg-danger-soft p-4">
        <p className="text-xs text-danger/80 font-medium">Reprobados</p>
        <p className="text-2xl leading-none tracking-tight tabular-nums text-danger">
          {totalReprobados}
        </p>
        <p className="text-xs text-danger/80">{pctReprobados}% del total</p>
      </div>
      <div className="rounded-card border border-muted-foreground/20 bg-muted p-4">
        <p className="text-xs text-muted-foreground font-medium">Sin nota</p>
        <p className="text-2xl leading-none tracking-tight tabular-nums text-muted-foreground">
          {totalSinNota}
        </p>
        <p className="text-xs text-muted-foreground">{pctSinNota}% del total</p>
      </div>
    </div>
  );
}
