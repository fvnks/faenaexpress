"use client";

import React from "react";

import { formatCLP, formatCLPCompact } from "@/lib/money";
import type { MonthlyDocBucket } from "@/lib/reports";

const MES_ABREV = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

function etiquetaMes(month: string): string {
  const [, mes] = month.split("-");
  return MES_ABREV[Number(mes) - 1] ?? month;
}

/**
 * Gráfico de barras verticales mensuales para compras o ventas.
 *
 * Cada barra es un mes con su monto total (neto + IVA − retención). El mes
 * que está viendo la tabla de al lado se resalta, para que el gráfico y la
 * tabla se lean como la misma pantalla.
 *
 * Debajo del gráfico hay una tabla con los números exactos: el gráfico sirve
 * para ver la forma, la tabla para leer el monto.
 */
export function MonthlyDocBars({
  data,
  kind,
  highlightMonth,
}: {
  data: MonthlyDocBucket[];
  /** "compras" o "ventas" — cambia el título y el texto de la serie. */
  kind: "compras" | "ventas";
  /** Mes destacado ("YYYY-MM"), normalmente el período abierto en la URL. */
  highlightMonth?: string | null;
}) {
  const etiqueta = kind === "ventas" ? "Ventas" : "Compras";

  // Una línea de tiempo sin nada en ella no dice nada: mejor el vacío.
  const sinMovimiento = data.every((d) => d.total === 0);

  if (data.length === 0 || sinMovimiento) {
    return (
      <div className="rounded-card border border-border p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Sin documentos en los últimos 12 meses.
        </p>
      </div>
    );
  }

  const max = Math.max(1, ...data.map((d) => d.total));
  const promedio = data.reduce((acc, d) => acc + d.total, 0) / data.length;

  // El mes destacado es el que muestra la tabla. La serie termina en ese mes,
  // así que siempre está; si por lo que sea no está, se resalta el último.
  const indiceEncontrado = highlightMonth
    ? data.findIndex((d) => d.month === highlightMonth)
    : -1;
  const indiceDestacado = indiceEncontrado >= 0 ? indiceEncontrado : data.length - 1;
  const destacado = data[indiceDestacado];
  const anterior = indiceDestacado > 0 ? data[indiceDestacado - 1] : null;

  const width = 720;
  const height = 200;
  const padTop = 30;
  const padBottom = 34;
  const padLeft = 62;
  const padRight = 20;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;
  const groupW = plotW / Math.max(1, data.length);
  const barW = Math.min(30, groupW * 0.6);

  const yDe = (valor: number) => padTop + plotH - (valor / max) * plotH;

  return (
    <figure className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="text-xs text-muted-foreground">
          {etiqueta} por mes · últimos {data.length} meses
        </span>
        <span className="flex items-baseline gap-2">
          <span className="tabular text-base font-semibold text-foreground">
            {formatCLP(destacado.total)}
          </span>
          {anterior && anterior.total !== 0 ? (
            <span className="tabular text-xs text-muted-foreground">
              {destacado.total >= anterior.total ? "▲" : "▼"}{" "}
              {Math.abs(
                Math.round(((destacado.total - anterior.total) / Math.abs(anterior.total)) * 100),
              )}
              % vs {etiquetaMes(anterior.month).toLowerCase()}
            </span>
          ) : null}
        </span>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full"
        role="img"
        aria-label={`Evolución mensual de ${etiqueta.toLowerCase()} en los últimos ${data.length} meses`}
      >
        {/* Eje Y: cuatro líneas con el monto compacto de cada nivel */}
        {[0, 25, 50, 75, 100].map((pct) => {
          const y = padTop + plotH - (pct / 100) * plotH;
          return (
            <React.Fragment key={pct}>
              <line
                x1={padLeft}
                y1={y}
                x2={width - padRight}
                y2={y}
                className="stroke-border/60"
                strokeWidth="1"
              />
              <text
                x={padLeft - 10}
                y={y + 4}
                textAnchor="end"
                className="fill-muted-foreground"
                fontSize="11"
              >
                {formatCLPCompact((max * pct) / 100)}
              </text>
            </React.Fragment>
          );
        })}

        {/* Línea de promedio: el mes contra el promedio de la serie */}
        {promedio > 0 ? (
          <g>
            <line
              x1={padLeft}
              y1={yDe(promedio)}
              x2={width - padRight}
              y2={yDe(promedio)}
              stroke="var(--color-muted-foreground)"
              strokeWidth="1"
              strokeDasharray="4 4"
              opacity="0.6"
            />
            <text
              x={width - padRight}
              y={yDe(promedio) - 6}
              textAnchor="end"
              className="fill-muted-foreground"
              fontSize="10"
            >
              Promedio {formatCLPCompact(promedio)}
            </text>
          </g>
        ) : null}

        {/* Barras */}
        {data.map((bucket, i) => {
          const x = padLeft + i * groupW + (groupW - barW) / 2;
          const barH = Math.max(bucket.total > 0 ? 2 : 0, Math.round((bucket.total / max) * plotH));
          const y = padTop + plotH - barH;
          const esDestacado = i === indiceDestacado;

          return (
            <g key={bucket.month} className="group" tabIndex={0} role="listitem">
              <title>
                {bucket.month}: {formatCLP(bucket.total)} ({bucket.count} documentos)
              </title>
              <rect
                x={x}
                y={y}
                width={barW}
                height={barH}
                rx="3"
                fill="var(--color-primary)"
                opacity={esDestacado ? 1 : 0.35}
                className="transition-opacity group-hover:opacity-90 group-focus-visible:opacity-90"
              />
              {/* El monto aparece al pasar el cursor o al enfocar la barra */}
              {barH > 0 ? (
                <text
                  x={x + barW / 2}
                  y={y - 7}
                  textAnchor="middle"
                  className="fill-foreground text-[11px] font-medium opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
                >
                  {formatCLPCompact(bucket.total)}
                </text>
              ) : null}
              <text
                x={x + barW / 2}
                y={height - 16}
                textAnchor="middle"
                fontSize="11"
                className={
                  esDestacado
                    ? "fill-foreground font-semibold"
                    : "fill-muted-foreground"
                }
              >
                {etiquetaMes(bucket.month)}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Los números exactos: el gráfico es para ver la forma, la tabla para leer el monto */}
      <details className="rounded-control border border-border">
        <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
          Ver los números mes a mes
        </summary>
        <table className="w-full border-t border-border text-sm">
          <thead>
            <tr className="text-left text-xs text-muted-foreground">
              <th scope="col" className="px-3 py-2 font-medium">Mes</th>
              <th scope="col" className="px-3 py-2 text-right font-medium">Documentos</th>
              <th scope="col" className="px-3 py-2 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.map((bucket) => (
              <tr key={bucket.month} className={bucket.month === destacado.month ? "bg-primary-soft/40" : ""}>
                <td className="px-3 py-2">{bucket.month}</td>
                <td className="px-3 py-2 text-right tabular">{bucket.count}</td>
                <td className="px-3 py-2 text-right tabular">{formatCLP(bucket.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}

/**
 * Barras horizontales de participación: qué parte del total lleva cada uno.
 *
 * Se usa para las ventas por área y sus variantes. La fila es una tabla real:
 * el nombre, el monto y el porcentaje están escritos, así que el color no es
 * el único canal y la pantalla se lee sin gráfico.
 */
export type ShareRow = {
  id: string | null;
  name: string;
  total: number;
  count: number;
};

export function ShareRankingBars({
  rows,
  total,
  etiqueta,
  columnaConteo = "Documentos",
}: {
  rows: ShareRow[];
  /** Total del período: la barra muestra la participación de cada fila. */
  total: number;
  /** Qué se está desglosando ("Área", "Cliente"…). */
  etiqueta: string;
  /** Encabezado de la columna de conteo. */
  columnaConteo?: string;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-card border border-border p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Sin datos para desglosar.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted-foreground">
            <th scope="col" className="px-4 py-2.5 font-medium">{etiqueta}</th>
            <th scope="col" className="px-4 py-2.5 text-right font-medium">{columnaConteo}</th>
            <th scope="col" className="px-4 py-2.5 text-right font-medium">Total</th>
            <th scope="col" className="px-4 py-2.5 text-right font-medium">Participación</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row) => {
            const share = total > 0 ? (row.total / total) * 100 : 0;
            // La barra mide lo mismo que el porcentaje: la participación de la
            // fila sobre el total. Si midiera otra cosa, el número y la barra
            // contarían historias distintas.
            const ancho = Math.max(1, share);
            return (
              <tr key={row.id ?? row.name} className="transition-colors hover:bg-primary-soft/30">
                <td className="px-4 py-2.5 font-medium">
                  <span className="block truncate">{row.name}</span>
                </td>
                <td className="px-4 py-2.5 text-right tabular text-muted-foreground">{row.count}</td>
                <td className="px-4 py-2.5 text-right tabular font-semibold">{formatCLP(row.total)}</td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center justify-end gap-2">
                    <span className="h-2 w-20 overflow-hidden rounded-full bg-surface sm:w-28">
                      <span
                        className="block h-full rounded-full bg-primary"
                        style={{ width: `${ancho}%` }}
                      />
                    </span>
                    <span className="w-14 text-right tabular text-xs text-muted-foreground">
                      {share.toFixed(1)}%
                    </span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t border-border bg-surface/60">
            <td className="px-4 py-2.5 font-semibold text-muted-foreground">Total</td>
            <td className="px-4 py-2.5 text-right tabular font-semibold text-muted-foreground">
              {rows.reduce((acc, row) => acc + row.count, 0)}
            </td>
            <td className="px-4 py-2.5 text-right tabular font-semibold text-primary">
              {formatCLP(total)}
            </td>
            <td className="px-4 py-2.5 text-right tabular text-xs text-muted-foreground">100%</td>
          </tr>
        </tfoot>
      </table>
    </div>
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
