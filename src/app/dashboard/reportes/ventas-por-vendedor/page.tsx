import { requireContext } from "@/lib/auth";
import { formatCLP, formatPeriod, currentPeriod, monthRange } from "@/lib/money";
import { salesBySalesperson } from "@/lib/reports";
import { cardClass } from "@/lib/ui";
import { PeriodFilter, ReportNav } from "../report-shell";

export default async function VentasPorVendedorPage(props: PageProps<"/dashboard/reportes/ventas-por-vendedor">) {
  const ctx = await requireContext("reportes");
  const searchParams = await props.searchParams;
  const raw = Array.isArray(searchParams.periodo) ? searchParams.periodo[0] : searchParams.periodo;
  const period = raw && monthRange(raw) ? raw : currentPeriod();
  const range = monthRange(period) ?? { from: new Date(), to: new Date() };

  const data = await salesBySalesperson(ctx.company.id, range);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Ventas por vendedor</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cuánto vendió cada vendedor en {formatPeriod(period)}. Las notas de crédito restan.
        </p>
      </div>

      <ReportNav active="/dashboard/reportes/ventas-por-vendedor" />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <PeriodFilter period={period} />
        <a
          href={`/dashboard/reportes/ventas-por-vendedor/export?periodo=${period}`}
          className="btn-liquid btn-liquid-secondary rounded-control border border-border bg-transparent px-3 py-2 text-sm text-foreground"
        >
          Exportar CSV
        </a>
      </div>

      <section className={cardClass + " overflow-x-auto"}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th scope="col" className="px-4 py-3 font-medium">Vendedor</th>
              <th scope="col" className="px-4 py-3 text-right font-medium">Doc.</th>
              <th scope="col" className="px-4 py-3 text-right font-medium">Total</th>
              <th scope="col" className="px-4 py-3 text-right font-medium">Part.</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row) => {
              const share = data.total !== 0 ? Math.round((row.total / data.total) * 100) : 0;
              return (
                <tr key={row.id ?? row.name} className="border-b border-border last:border-0">
                  <td className="px-4 py-2.5">
                    {row.id ? (
                      <a href={`/dashboard/ventas?vendedor=${row.id}`} className="text-primary underline-offset-2 hover:underline">
                        {row.name}
                      </a>
                    ) : (
                      row.name
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular">{row.count}</td>
                  <td className="px-4 py-2.5 text-right tabular">{formatCLP(row.total)}</td>
                  <td className="px-4 py-2.5 text-right tabular">{share}%</td>
                </tr>
              );
            })}
            <tr className="border-t border-border font-semibold">
              <td className="px-4 py-2.5">Total</td>
              <td className="px-4 py-2.5 text-right tabular">{data.rows.reduce((a, r) => a + r.count, 0)}</td>
              <td className="px-4 py-2.5 text-right tabular">{formatCLP(data.total)}</td>
              <td className="px-4 py-2.5 text-right tabular">100%</td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  );
}
