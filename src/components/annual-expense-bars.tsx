"use client";

import type { MonthlyCategoryRow } from "@/lib/reports";
import { formatCLP } from "@/lib/money";

/**
 * Barras horizontales: gasto anual por categoría, ordenado de mayor a menor.
 *
 * Cada barra muestra el monto anual, la participación % del total y una
 * etiqueta con el monto. Es la respuesta a "¿en qué categorías se gasta más
 * al año?".
 */
export function AnnualExpenseBars({
  rows,
  grandTotal,
}: {
  rows: MonthlyCategoryRow[];
  grandTotal: number;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-card border border-border p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Sin gastos anuales registrados.
        </p>
      </div>
    );
  }

  const max = Math.max(...rows.map((r) => r.annualTotal));

  return (
    <div className="rounded-card border border-border overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted-foreground sticky top-0 bg-surface/90 backdrop-blur z-10">
            <th scope="col" className="px-3 py-2.5 font-medium w-40">
              Categoría
            </th>
            <th scope="col" className="px-3 py-2.5 w-1/3">
              Gasto anual
            </th>
            <th scope="col" className="px-3 py-2.5 text-right font-medium w-16">
              % del total
            </th>
            <th scope="col" className="px-3 py-2.5 text-right font-medium w-20">
              Mensual promedio
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row, index) => {
            const share = grandTotal > 0 ? (row.annualTotal / grandTotal) * 100 : 0;
            const widthPct = Math.max(3, (row.annualTotal / max) * 100);
            const isTop = index === 0;

            return (
              <tr key={row.categoryId ?? row.categoryName} className="group hover:bg-surface/30 transition-colors">
                <td className="px-3 py-2.5 font-medium">
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        isTop ? "bg-primary" : "bg-muted-foreground/30"
                      }`}
                    />
                    <span className="truncate">{row.categoryName}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {isTop ? "Categoría con mayor gasto anual" : ""}
                  </p>
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold tabular text-right w-20">
                      {formatCLP(row.annualTotal)}
                    </span>
                    <div className="flex-1 h-2 bg-surface rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2.5 text-right tabular text-xs">
                  {share.toFixed(1)}%
                </td>
                <td className="px-3 py-2.5 text-right tabular text-xs">
                  {row.monthlyAverage > 0 ? formatCLP(row.monthlyAverage) : "—"}
                </td>
              </tr>
            );
          })}
          <tr className="border-t border-border/50 bg-surface">
            <td className="px-3 py-2.5 font-semibold text-muted-foreground">
              Total anual
            </td>
            <td className="px-3 py-2.5">
              <span className="font-semibold tabular text-primary">
                {formatCLP(grandTotal)}
              </span>
            </td>
            <td className="px-3 py-2.5 text-right tabular font-semibold text-primary">
              100%
            </td>
            <td className="px-3 py-2.5 text-right tabular font-semibold text-primary">
              {formatCLP(grandTotal / rows.length)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
