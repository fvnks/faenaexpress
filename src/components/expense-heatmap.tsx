"use client";

import type { MonthlyCategoryRow, MonthlyCategoryResult } from "@/lib/reports";
import { formatCLP } from "@/lib/money";

/**
 * Fila del heatmap: una categoría con sus gastos por mes y el total anual.
 */
type HeatmapRow = MonthlyCategoryRow;

/**
 * Celda individual del heatmap: monto gastado en un mes por una categoría.
 */
function HeatmapCell({ value, isEmpty }: { value: number; isEmpty?: boolean }) {
  if (isEmpty || value === 0) {
    return (
      <td className="px-2 py-1.5 text-right tabular text-xs text-muted-foreground">
        —
      </td>
    );
  }

  // Intensidad de color según el monto: de gris claro a azul intenso.
  const intensity = Math.min(value / 1000000, 1); // normalizar a 1M CLP como máximo visual
  const bgOpacity = Math.round(50 + intensity * 150); // 50% a 200%

  return (
    <td
      className="px-2 py-1.5 text-right tabular text-xs"
      style={{
        backgroundColor: `rgba(27, 95, 168, ${bgOpacity / 1000})`,
      }}
      title={formatCLP(value)}
    >
      {formatCLP(value)}
    </td>
  );
}

/**
 * Heatmap de gastos: filas = categorías, columnas = meses.
 *
 * Cada celda muestra el monto gastado con un fondo de intensidad proporcional.
 * La última columna es el total anual. La última fila es el total mensual.
 */
export function ExpenseHeatmap({
  data,
}: {
  data: MonthlyCategoryResult;
}) {
  if (data.rows.length === 0) {
    return (
      <div className="rounded-card border border-border p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Sin gastos registrados en los últimos {data.months.length} meses.
        </p>
      </div>
    );
  }

  const maxMonthly = Math.max(
    ...data.rows.map((r) => r.annualTotal),
    data.grandTotal / data.months.length,
  );

  return (
    <div className="rounded-card border border-border overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted-foreground sticky top-0 bg-surface/95 backdrop-blur z-10">
            <th scope="col" className="px-3 py-2.5 font-medium w-40">
              Categoría
            </th>
            {data.months.map((month) => {
              const [year, mes] = month.split("-");
              const monthNames = [
                "Ene", "Feb", "Mar", "Abr", "May", "Jun",
                "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
              ];
              return (
                <th
                  key={month}
                  scope="col"
                  className="px-2 py-2.5 text-right font-medium w-16"
                >
                  {monthNames[Number(mes) - 1]} {year.slice(2)}
                </th>
              );
            })}
            <th scope="col" className="px-3 py-2.5 text-right font-medium w-20 border-l border-border">
              Anual
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {data.rows.map((row) => {
            const share = data.grandTotal > 0 ? (row.annualTotal / data.grandTotal) * 100 : 0;
            const isPeak = row.annualTotal === data.rows[0]?.annualTotal;

            return (
              <tr key={row.categoryId ?? row.categoryName} className="group hover:bg-surface/30 transition-colors">
                <td className="px-3 py-2.5 font-medium">
                  <div className="flex items-center gap-2">
                    <span className="truncate">{row.categoryName}</span>
                    {isPeak && (
                      <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {share.toFixed(1)}% del anual
                  </p>
                </td>
                {data.months.map((month) => (
                  <td key={month} className="px-2 py-2.5 text-right tabular">
                    <HeatmapCell
                      value={row.byMonth[month] ?? 0}
                      isEmpty={!(month in row.byMonth)}
                    />
                  </td>
                ))}
                <td className="px-3 py-2.5 text-right tabular font-semibold border-l border-border bg-surface/50">
                  {formatCLP(row.annualTotal)}
                </td>
              </tr>
            );
          })}

          {/* Fila de totales mensuales */}
          <tr className="border-t border-border/50 bg-surface">
            <td className="px-3 py-2.5 font-semibold text-muted-foreground">
              Total mensual
            </td>
            {data.months.map((month) => {
              const monthlyTotal = data.rows.reduce(
                (acc, row) => acc + (row.byMonth[month] ?? 0),
                0,
              );
              const isPeak =
                monthlyTotal ===
                Math.max(
                  ...data.months.map(
                    (m) =>
                      data.rows.reduce(
                        (acc, row) => acc + (row.byMonth[m] ?? 0),
                        0,
                      ),
                  ),
                );
              return (
                <td
                  key={month}
                  className={`px-2 py-2.5 text-right tabular font-semibold ${
                    isPeak ? "text-primary" : ""
                  }`}
                >
                  {formatCLP(monthlyTotal)}
                </td>
              );
            })}
            <td className="px-3 py-2.5 text-right tabular font-semibold text-primary border-l border-border">
              {formatCLP(data.grandTotal)}
            </td>
          </tr>
        </tbody>
      </table>

      <div className="mt-3 flex items-center justify-between px-3 pb-3 text-xs text-muted-foreground">
        <span>
          Filas ordenadas por gasto anual (mayor a menor). Punto azul = categoría con mayor gasto anual.
        </span>
        <span>
          Mes pico:{" "}
          {data.rows[0]?.peakMonth ? (
            <span className="font-medium">
              {data.rows[0].peakMonth.month} ({formatCLP(data.rows[0].peakMonth.total)})
            </span>
          ) : (
            "—"
          )}
        </span>
      </div>
    </div>
  );
}
