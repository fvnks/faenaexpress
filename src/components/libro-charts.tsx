"use client";

import React from "react";

import { formatCLP } from "@/lib/money";
import type { MonthlyDocBucket } from "@/lib/reports";

/**
 * Gráfico de barras verticales mensuales para compras o ventas.
 *
 * Cada barra representa un mes con su monto total (neto + IVA − retención).
 * Las barras en azul (ventas) o ámbar (compras) según el tipo.
 */
export function MonthlyDocBars({
  data,
  kind,
}: {
  data: MonthlyDocBucket[];
  /** "compras" o "ventas" — afecta el color y el label del eje Y. */
  kind: "compras" | "ventas";
}) {
  if (data.length === 0) {
    return (
      <div className="rounded-card border border-border p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Sin documentos en los últimos {12} meses.
        </p>
      </div>
    );
  }

  const max = Math.max(1, ...data.map((d) => d.total));
  const width = 720;
  const height = 160;
  const padTop = 24;
  const padBottom = 32;
  const padLeft = 56;
  const padRight = 24;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;
  const groupW = plotW / Math.max(1, data.length);
  const barW = Math.min(14, (groupW - 8) / 2);

  const isSales = kind === "ventas";
  const barColor = isSales ? "var(--color-primary)" : "var(--color-accent)";
  const labelY = isSales ? "Ventas" : "Compras";

  // Etiquetas de mes abreviadas (Ene, Feb, Mar…)
  const monthShort = data.map((d) => {
    const [, mes] = d.month.split("-");
    const names = [
      "Ene", "Feb", "Mar", "Abr", "May", "Jun",
      "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
    ];
    return names[Number(mes) - 1];
  });

  return (
    <figure className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-2 text-xs text-muted-foreground">
        <span>{labelY} por mes (últimos {data.length} meses)</span>
        <span className="tabular font-semibold">
          {formatCLP(data.reduce((acc, d) => acc + d.total, 0))}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full"
        role="img"
        aria-label={`Evolución mensual de ${labelY.toLowerCase()}`}
      >
        {/* Eje Y — 4 líneas horizontales sutiles */}
        {[0, 25, 50, 75, 100].map((pct) => {
          const y = padTop + plotH - (pct / 100) * plotH;
          return (
            <React.Fragment key={pct}>
              <line
                x1={padLeft}
                y1={y}
                x2={width - padRight}
                y2={y}
                className="stroke-border/30"
                strokeWidth="1"
              />
              <text
                x={padLeft - 8}
                y={y + 4}
                textAnchor="end"
                className="fill-muted-foreground"
                fontSize="10"
              >
                {(max * (pct / 100)) / 1e6}M
              </text>
            </React.Fragment>
          );
        })}

        {/* Barras */}
        {data.map((bucket, i) => {
          const x = padLeft + i * groupW + (groupW - barW) / 2;
          const barH = Math.round((bucket.total / max) * plotH);
          const y = padTop + plotH - barH;

          return (
            <g key={bucket.month}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={barH}
                rx="2"
                fill={barColor}
                className="hover:opacity-90 transition-opacity"
              >
                <title>
                  {bucket.month}: {formatCLP(bucket.total)} ({bucket.count} documentos)
                </title>
              </rect>
              <text
                x={x + barW / 2}
                y={height - 16}
                textAnchor="middle"
                className="fill-muted-foreground"
                fontSize="10"
                fill="var(--color-muted-foreground)"
              >
                {monthShort[i]}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption className="text-xs text-muted-foreground">
        Cada barra es un mes. Pasa el cursor para ver el monto y cantidad de documentos.
      </figcaption>
    </figure>
  );
}

/**
 * Sparklines: línea pequeña que muestra la tendencia de un documento
 * a través de los meses (para poner al lado de cada fila del libro).
 */
export function DocSparkline({
  values,
  label,
}: {
  /** Valores mensuales (pueden ser negativos para notas de crédito). */
  values: number[];
  /** Etiqueta para el tooltip. */
  label: string;
}) {
  if (values.length === 0 || values.every((v) => v === 0)) {
    return (
      <span className="flex items-center gap-1">
        <span className="w-16 h-2 bg-surface rounded-full" />
        <span className="text-[10px] text-muted-foreground">—</span>
      </span>
    );
  }

  const width = 56;
  const height = 14;
  const pad = 2;
  const plotW = width - pad * 2;
  const plotH = height - pad * 2;

  const maxAbs = Math.max(...values.map((v) => Math.abs(v)));
  const centerY = pad + plotH / 2;

  const points = values
    .map((v, i) => {
      const x = pad + (i / Math.max(1, values.length - 1)) * plotW;
      const y = centerY - (v / maxAbs) * (plotH / 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const total = values.reduce((acc, v) => acc + v, 0);

  return (
    <span className="flex items-center gap-1.5">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-16 h-4"
        role="img"
        aria-label={label}
      >
        <polyline
          points={points}
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth="1.5"
          className="drop-shadow-[0_1px_1px_rgba(0,0,0,0.1)]"
        />
        <title>
          {label}
          {values.map((v, i) => `\nMes ${i + 1}: ${formatCLP(v)}`).join("")}
          Total: {formatCLP(total)}
        </title>
      </svg>
      <span className="text-[10px] text-muted-foreground tabular">
        {formatCLP(total)}
      </span>
    </span>
  );
}
