import { requireContext } from "@/lib/auth";
import { formatCLP, formatPeriod, currentPeriod, monthRange } from "@/lib/money";
import { expensesBreakdown, expensesMonthlyByCategory, purchasesBreakdown } from "@/lib/reports";
import { AnnualExpenseBars } from "@/components/annual-expense-bars";
import { ExpenseHeatmap } from "@/components/expense-heatmap";
import { cardClass } from "@/lib/ui";
import { PeriodFilter, ReportNav } from "../report-shell";

/**
 * Gastos por categoría y área — rediseño.
 *
 * Muestra dos vistas en una sola página:
 *   1. Barras anuales por categoría (qué tanto se gasta en cada categoría al año)
 *   2. Heatmap mensual × categoría (cómo varía el gasto mes a mes)
 *
 * Ambas responden a "¿en qué categorías se gasta y cómo cambia cada mes?".
 */
export default async function ExpensesReportPage(props: PageProps<"/facturas/reportes/gastos">) {
  const ctx = await requireContext("reportes");
  const searchParams = await props.searchParams;
  const raw = Array.isArray(searchParams.periodo) ? searchParams.periodo[0] : searchParams.periodo;
  const period = raw && monthRange(raw) ? raw : currentPeriod();
  const range = monthRange(period) ?? { from: new Date(), to: new Date() };

  const [data, compras, monthly] = await Promise.all([
    expensesBreakdown(ctx.company.id, range),
    purchasesBreakdown(ctx.company.id, range),
    expensesMonthlyByCategory(ctx.company.id, 12),
  ]);

  const topCategory = monthly.rows[0];
  const hasData = monthly.rows.length > 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Gastos por categoría y área
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Evolución mensual y gasto anual por categoría de {formatPeriod(period)} en{" "}
          <span className="font-medium">{ctx.company.name}</span>.
        </p>
      </div>

      <ReportNav active="/facturas/reportes/gastos" />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <PeriodFilter period={period} />
        <a
          href={`/facturas/reportes/gastos/export?periodo=${period}`}
          className="rounded-control border border-primary bg-transparent px-3 py-2 text-sm font-semibold text-primary hover:bg-primary/5"
        >
          Exportar Excel
        </a>
      </div>

      {/* ---------------- KPIs del período ---------------- */}
      <section className={cardClass + " p-5"}>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <dt className="text-[11px] font-medium text-muted-foreground tracking-tight uppercase">
              Total del período
            </dt>
            <dd className="mt-1 text-2xl font-semibold tabular text-primary">
              {formatCLP(data.total)}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] font-medium text-muted-foreground tracking-tight uppercase">
              Promedio mensual (12m)
            </dt>
            <dd className="mt-1 text-2xl font-semibold tabular">
              {formatCLP(monthly.grandMonthlyAverage)}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] font-medium text-muted-foreground tracking-tight uppercase">
              Categorías activas
            </dt>
            <dd className="mt-1 text-2xl font-semibold tabular">
              {monthly.rows.length}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] font-medium text-muted-foreground tracking-tight uppercase">
              Mes con mayor gasto
            </dt>
            <dd className="mt-1 text-2xl font-semibold tabular text-primary">
              {topCategory?.peakMonth ? topCategory.peakMonth.month : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] font-medium text-muted-foreground tracking-tight uppercase">
              Compras (centro de costo)
            </dt>
            <dd className="mt-1 text-2xl font-semibold tabular">
              {formatCLP(compras.total)}
            </dd>
          </div>
        </dl>
      </section>

      {/* ---------------- Barras anuales por categoría ---------------- */}
      <section className={cardClass + " overflow-hidden"}>
        <div className="border-b border-border px-4 py-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-semibold">Gasto anual por categoría</h2>
          <span className="text-xs text-muted-foreground">
            {monthly.rows.length} categoría{monthly.rows.length !== 1 ? "s" : ""}
          </span>
        </div>

        {monthly.rows.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">
            Sin gastos registrados en los últimos 12 meses.
          </p>
        ) : (
          <AnnualExpenseBars rows={monthly.rows} grandTotal={monthly.grandTotal} />
        )}
      </section>

      {/* ---------------- Heatmap mensual × categoría ---------------- */}
      <section className={cardClass + " overflow-hidden"}>
        <div className="border-b border-border px-4 py-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-semibold">Evolución mensual por categoría</h2>
          <span className="text-xs text-muted-foreground">
            Últimos 12 meses · intensidad de color = monto gastado
          </span>
        </div>

        {hasData ? (
          <ExpenseHeatmap data={monthly} />
        ) : (
          <p className="px-4 py-6 text-sm text-muted-foreground">
            Sin gastos registrados en los últimos 12 meses.
          </p>
        )}
      </section>

      {/* ---------------- Detalle por área y trabajador ---------------- */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={cardClass + " overflow-hidden"}>
          <div className="border-b border-border px-4 py-3 flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="font-semibold">Por área</h3>
          </div>
        {data.byArea.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">
            Sin gastos asignados a áreas en este período.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th scope="col" className="px-4 py-3 font-medium">Área</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">N°</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.byArea.map((row) => {
                const share = data.total > 0 ? Math.round((row.total / data.total) * 100) : 0;
                return (
                  <tr key={row.id ?? row.name} className="border-b border-border last:border-0">
                    <td className="px-4 py-2.5">{row.name}</td>
                    <td className="px-4 py-2.5 text-right tabular">{row.count}</td>
                    <td className="px-4 py-2.5 text-right tabular">
                      {formatCLP(row.total)}
                    </td>
                    <td className="px-4 py-2.5 text-right text-xs text-muted-foreground">
                      {share}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        </div>

        <div className={cardClass + " overflow-hidden"}>
          <div className="border-b border-border px-4 py-3 flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="font-semibold">Por trabajador</h3>
          <span className="text-xs text-muted-foreground">
            Personal: {formatCLP(data.totalPersonal)}
          </span>
        </div>
        {data.byWorker.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">
            Ningún gasto de este período tiene trabajador asociado. Al registrar sueldos o
            aguinaldos, elige el trabajador en el formulario de gasto.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th scope="col" className="px-4 py-3 font-medium">Trabajador</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">N°</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.byWorker.map((row) => {
                const share = data.totalPersonal > 0 ? Math.round((row.total / data.totalPersonal) * 100) : 0;
                return (
                  <tr key={row.id ?? row.name} className="border-b border-border last:border-0">
                    <td className="px-4 py-2.5">{row.name}</td>
                    <td className="px-4 py-2.5 text-right tabular">{row.count}</td>
                    <td className="px-4 py-2.5 text-right tabular">
                      {formatCLP(row.total)}
                    </td>
                    <td className="px-4 py-2.5 text-right text-xs text-muted-foreground">
                      {share}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        </div>
      </section>
    </div>
  );
}
