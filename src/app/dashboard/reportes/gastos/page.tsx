import { requireContext } from "@/lib/auth";
import { formatCLP, formatPeriod, currentPeriod, monthRange } from "@/lib/money";
import type { Breakdown } from "@/lib/reports";
import { expensesBreakdown, purchasesBreakdown } from "@/lib/reports";
import { cardClass } from "@/lib/ui";
import { PeriodFilter, ReportNav } from "../report-shell";

function BreakdownTable({ rows, total, label }: { rows: Breakdown[]; total: number; label: string }) {
  if (rows.length === 0) {
    return <p className="px-4 py-6 text-sm text-muted-foreground">No hay gastos en este período.</p>;
  }

  return (
    <table className="w-full text-sm">
      <caption className="sr-only">{label}</caption>
      <thead>
        <tr className="border-b border-border text-left text-muted-foreground">
          <th scope="col" className="px-4 py-3 font-medium">
            {label}
          </th>
          <th scope="col" className="px-4 py-3 text-right font-medium">
            N°
          </th>
          <th scope="col" className="px-4 py-3 text-right font-medium">
            Total
          </th>
          <th scope="col" className="px-4 py-3 text-right font-medium">
            Participación
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          const share = total > 0 ? Math.round((row.total / total) * 100) : 0;
          return (
            <tr key={row.id ?? row.name} className="border-b border-border last:border-0">
              <td className="px-4 py-2.5">{row.name}</td>
              <td className="px-4 py-2.5 text-right tabular">{row.count}</td>
              <td className="px-4 py-2.5 text-right tabular">{formatCLP(row.total)}</td>
              <td className="px-4 py-2.5 text-right">
                <div className="flex items-center justify-end gap-2">
                  <span className="w-24">
                    <span className="block h-2 overflow-hidden rounded-full bg-border">
                      <span
                        className="block h-full rounded-full bg-primary"
                        style={{ width: `${share}%` }}
                      />
                    </span>
                  </span>
                  <span className="w-10 text-right tabular">{share}%</span>
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export default async function ExpensesReportPage(props: PageProps<"/dashboard/reportes/gastos">) {
  const ctx = await requireContext("reportes");
  const searchParams = await props.searchParams;
  const raw = Array.isArray(searchParams.periodo) ? searchParams.periodo[0] : searchParams.periodo;
  const period = raw && monthRange(raw) ? raw : currentPeriod();
  const range = monthRange(period) ?? { from: new Date(), to: new Date() };

  const data = await expensesBreakdown(ctx.company.id, range);
  const compras = await purchasesBreakdown(ctx.company.id, range);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Gastos por categoría, área y trabajador</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Distribución de los gastos de {formatPeriod(period)}. Las compras (facturas de
          proveedor) se muestran aparte como centro de costo.
        </p>
      </div>

      <ReportNav active="/dashboard/reportes/gastos" />

      <PeriodFilter period={period} />

      <section className={cardClass + " p-5"}>
        <div className="text-sm text-muted-foreground">Total del período</div>
        <div className="mt-1 text-2xl font-semibold tabular">{formatCLP(data.total)}</div>
      </section>

      {/* ---------------- Compras por categoría (centro de costo) ---------------- */}
      <section className={cardClass + " overflow-hidden"}>
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border px-4 py-3">
          <h2 className="font-semibold">Compras por categoría</h2>
          <span className="text-xs text-muted-foreground">{compras.count} documento(s)</span>
        </div>
        {compras.count === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">
            No hay compras en este período. Las facturas de proveedor se ven acá agrupadas
            por categoría, para saber cuánto se gasta en cada una.
          </p>
        ) : (
          <div className="flex flex-col gap-4 p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-sm text-muted-foreground">Total compras</span>
              <span className="tabular text-lg font-semibold">{formatCLP(compras.total)}</span>
            </div>
            <BreakdownTable rows={compras.byCategory} total={compras.total} label="Categoría" />
            <div className="border-t border-border pt-3">
              <div className="mb-2 text-sm font-medium">Por área</div>
              <BreakdownTable rows={compras.byArea} total={compras.total} label="Área" />
            </div>
          </div>
        )}
      </section>

      <section className={cardClass + " overflow-hidden"}>
        <h2 className="border-b border-border px-4 py-3 font-semibold">Por categoría</h2>
        <BreakdownTable rows={data.byCategory} total={data.total} label="Categoría" />
      </section>

      <section className={cardClass + " overflow-hidden"}>
        <h2 className="border-b border-border px-4 py-3 font-semibold">Por área</h2>
        <BreakdownTable rows={data.byArea} total={data.total} label="Área" />
      </section>

      <section className={cardClass + " overflow-hidden"}>
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border px-4 py-3">
          <h2 className="font-semibold">Por trabajador</h2>
          <span className="tabular text-sm text-muted-foreground">
            Personal: {formatCLP(data.totalPersonal)}
            {data.total > 0
              ? ` (${Math.round((data.totalPersonal / data.total) * 100)}% del total)`
              : ""}
          </span>
        </div>
        {data.byWorker.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">
            Ningún gasto de este período tiene trabajador asociado. Al registrar sueldos o
            aguinaldos, elige el trabajador en el formulario de gasto.
          </p>
        ) : (
          <BreakdownTable rows={data.byWorker} total={data.totalPersonal} label="Trabajador" />
        )}
      </section>
    </div>
  );
}
