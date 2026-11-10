"use client";

import type { MonthlyMatrixResult } from "@/lib/reports";
import { formatCLP } from "@/lib/money";

const MES_ABREV = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

/**
 * Celda individual del heatmap: monto del mes para la fila.
 *
 * La intensidad se calcula contra el monto más alto de la matriz, no contra
 * una cifra fija: una empresa que gasta 50 millones y otra que gasta 200 mil
 * tienen que ver el mismo rango de tonos.
 */
function HeatmapCell({
  value,
  isEmpty,
  maximo,
}: {
  value: number;
  isEmpty?: boolean;
  maximo: number;
}) {
  if (isEmpty || value === 0) {
    return (
      <td className="px-2 py-1.5 text-right tabular text-xs text-muted-foreground">—</td>
    );
  }

  const intensity = maximo > 0 ? Math.min(value / maximo, 1) : 0;
  // El tinte se mantiene suave para que el número se siga leyendo en claro y
  // en oscuro: el color acompaña al dato, no lo reemplaza.
  const mezcla = Math.round(8 + intensity * 30);

  return (
    <td
      className="px-2 py-1.5 text-right tabular text-xs"
      style={{
        backgroundColor: `color-mix(in oklab, var(--color-primary) ${mezcla}%, transparent)`,
      }}
      title={formatCLP(value)}
    >
      {formatCLP(value)}
    </td>
  );
}

/**
 * Heatmap de la matriz filas × meses.
 *
 * Responde "¿en qué fila se juntó el movimiento y en qué mes?": el color
 * marca la intensidad y el número está escrito en cada celda, así que se lee
 * sin depender del color.
 */
export function ReportHeatmap({
  data,
  etiquetaFila,
  etiquetaTotal = "Total",
}: {
  data: MonthlyMatrixResult;
  /** Qué es cada fila ("Categoría", "Área"…). */
  etiquetaFila: string;
  /** Encabezado de la última columna. */
  etiquetaTotal?: string;
}) {
  if (data.rows.length === 0) {
    return (
      <div className="rounded-card border border-border p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Sin datos en los últimos {data.months.length} meses.
        </p>
      </div>
    );
  }

  const maximoCelda = Math.max(
    1,
    ...data.rows.flatMap((row) => data.months.map((month) => row.byMonth[month] ?? 0)),
  );

  const totalPorMes = data.months.map((month) =>
    data.rows.reduce((acc, row) => acc + (row.byMonth[month] ?? 0), 0),
  );
  const mesPico = totalPorMes.reduce(
    (mejor, total, indice) => (total > (mejor?.total ?? -1) ? { indice, total } : mejor),
    null as { indice: number; total: number } | null,
  );

  return (
    <div className="rounded-card border border-border overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted-foreground sticky top-0 bg-surface/95 backdrop-blur z-10">
            <th scope="col" className="px-3 py-2.5 font-medium w-40">
              {etiquetaFila}
            </th>
            {data.months.map((month) => {
              const [, mes] = month.split("-");
              const [, anio] = month.split("-");
              return (
                <th
                  key={month}
                  scope="col"
                  className="px-2 py-2.5 text-right font-medium w-16"
                >
                  {MES_ABREV[Number(mes) - 1]} {anio.slice(2)}
                </th>
              );
            })}
            <th
              scope="col"
              className="px-3 py-2.5 text-right font-medium w-20 border-l border-border"
            >
              {etiquetaTotal}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {data.rows.map((row) => {
            const share = data.grandTotal > 0 ? (row.periodTotal / data.grandTotal) * 100 : 0;
            const esPrincipal = row.periodTotal === data.rows[0]?.periodTotal;

            return (
              <tr
                key={row.id ?? row.name}
                className="group hover:bg-surface/30 transition-colors"
              >
                <td className="px-3 py-2.5 font-medium">
                  <div className="flex items-center gap-2">
                    <span className="truncate">{row.name}</span>
                    {esPrincipal ? (
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    ) : null}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {share.toFixed(1)}% del total
                  </p>
                </td>
                {data.months.map((month) => (
                  <td key={month} className="px-2 py-2.5 text-right tabular">
                    <HeatmapCell
                      value={row.byMonth[month] ?? 0}
                      isEmpty={!(month in row.byMonth)}
                      maximo={maximoCelda}
                    />
                  </td>
                ))}
                <td className="px-3 py-2.5 text-right tabular font-semibold border-l border-border bg-surface/50">
                  {formatCLP(row.periodTotal)}
                </td>
              </tr>
            );
          })}

          {/* Fila de totales mensuales */}
          <tr className="border-t border-border/50 bg-surface">
            <td className="px-3 py-2.5 font-semibold text-muted-foreground">Total mensual</td>
            {data.months.map((month, indice) => (
              <td
                key={month}
                className={
                  "px-2 py-2.5 text-right tabular font-semibold " +
                  (mesPico?.indice === indice ? "text-primary" : "")
                }
              >
                {formatCLP(totalPorMes[indice])}
              </td>
            ))}
            <td className="px-3 py-2.5 text-right tabular font-semibold text-primary border-l border-border">
              {formatCLP(data.grandTotal)}
            </td>
          </tr>
        </tbody>
      </table>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 px-3 pb-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <span>Menor</span>
          <span
            aria-hidden="true"
            className="h-2.5 w-24 rounded-full"
            style={{
              background:
                "linear-gradient(to right, color-mix(in oklab, var(--color-primary) 8%, transparent), color-mix(in oklab, var(--color-primary) 38%, transparent))",
            }}
          />
          <span>Mayor</span>
          <span className="tabular">({formatCLP(maximoCelda)} en el mes más alto)</span>
        </div>
        <span>
          Mes pico:{" "}
          {mesPico ? (
            <span className="font-medium">
              {data.months[mesPico.indice]} ({formatCLP(mesPico.total)})
            </span>
          ) : (
            "—"
          )}
        </span>
      </div>
    </div>
  );
}

/**
 * Barras horizontales: total del período por fila, ordenado de mayor a menor.
 *
 * Cada fila lleva el nombre, el monto y la participación escrita: la barra
 * solo hace más rápida la comparación visual, no es el único dato.
 */
export function AnnualRankingBars({
  data,
  etiquetaFila,
}: {
  data: MonthlyMatrixResult;
  /** Qué es cada fila ("Categoría", "Área"…). */
  etiquetaFila: string;
}) {
  if (data.rows.length === 0) {
    return (
      <div className="rounded-card border border-border p-6 text-center">
        <p className="text-sm text-muted-foreground">Sin datos registrados.</p>
      </div>
    );
  }

  return (
    <div className="rounded-card border border-border overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted-foreground sticky top-0 bg-surface/90 backdrop-blur z-10">
            <th scope="col" className="px-3 py-2.5 font-medium w-40">
              {etiquetaFila}
            </th>
            <th scope="col" className="px-3 py-2.5 w-1/3">
              Total del período
            </th>
            <th scope="col" className="px-3 py-2.5 text-right font-medium w-16">
              % del total
            </th>
            <th scope="col" className="px-3 py-2.5 text-right font-medium w-20">
              Promedio mensual
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {data.rows.map((row, index) => {
            const share = data.grandTotal > 0 ? (row.periodTotal / data.grandTotal) * 100 : 0;
            // La barra mide la participación sobre el total, que es lo mismo
            // que dice el porcentaje al lado.
            const widthPct = Math.max(2, share);
            const esPrincipal = index === 0;

            return (
              <tr
                key={row.id ?? row.name}
                className="group hover:bg-surface/30 transition-colors"
              >
                <td className="px-3 py-2.5 font-medium">
                  <div className="flex items-center gap-2">
                    <span
                      className={
                        "h-2 w-2 shrink-0 rounded-full " +
                        (esPrincipal ? "bg-primary" : "bg-muted-foreground/30")
                      }
                    />
                    <span className="truncate">{row.name}</span>
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold tabular text-right w-24">
                      {formatCLP(row.periodTotal)}
                    </span>
                    <div className="flex-1 h-2 bg-surface rounded-full overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${widthPct}%` }} />
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2.5 text-right tabular text-xs">{share.toFixed(1)}%</td>
                <td className="px-3 py-2.5 text-right tabular text-xs">
                  {row.monthlyAverage > 0 ? formatCLP(row.monthlyAverage) : "—"}
                </td>
              </tr>
            );
          })}
          <tr className="border-t border-border/50 bg-surface">
            <td className="px-3 py-2.5 font-semibold text-muted-foreground">Total</td>
            <td className="px-3 py-2.5">
              <span className="font-semibold tabular text-primary">
                {formatCLP(data.grandTotal)}
              </span>
            </td>
            <td className="px-3 py-2.5 text-right tabular font-semibold text-primary">100%</td>
            <td className="px-3 py-2.5 text-right tabular font-semibold text-primary">
              {formatCLP(data.grandMonthlyAverage)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
