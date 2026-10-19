import { requireContext } from "@/lib/auth";
import { formatCLP, formatPeriod, currentPeriod, monthRange } from "@/lib/money";
import { ivaSummary, libroVentas, libroCompras, expensesBreakdown } from "@/lib/reports";
import { cardClass } from "@/lib/ui";
import { PeriodFilter, ReportNav } from "../report-shell";

const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export default async function IvaReportPage(props: PageProps<"/facturas/reportes/iva">) {
  const ctx = await requireContext("reportes");
  const searchParams = await props.searchParams;
  const raw = one(searchParams.periodo);
  const period = raw && monthRange(raw) ? raw : currentPeriod();
  const range = monthRange(period) ?? { from: new Date(), to: new Date() };

  const iva = await ivaSummary(ctx.company.id, range);
  const [libroV, libroC, gastos] = await Promise.all([
    libroVentas(ctx.company.id, range),
    libroCompras(ctx.company.id, range),
    expensesBreakdown(ctx.company.id, range),
  ]);

  const cuadreVentasNeto = iva.sales.net - libroV.totals.net;
  const cuadreComprasNeto = iva.purchases.net - libroC.totals.net;
  const cuadreGastosIva = iva.expenses.iva - gastos.total; // no IVA drill available; better 0 placeholder? Need reconsider.
  const cuadreOk = Math.abs(cuadreVentasNeto) < 1 && Math.abs(cuadreComprasNeto) < 1;

  const rows = [
    {
      label: "Ventas",
      net: iva.sales.net,
      iva: iva.sales.iva,
      total: iva.sales.total,
    },
    {
      label: "Compras",
      net: iva.purchases.net,
      iva: iva.purchases.iva,
      total: iva.purchases.total,
    },
    {
      label: "Gastos",
      net: iva.expenses.net,
      iva: iva.expenses.iva,
      total: iva.expenses.total,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">IVA mensual</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Preparación del F29: débito, crédito y resultado de {formatPeriod(period)}. Las notas de
          crédito restan.
        </p>
      </div>

      <ReportNav active="/facturas/reportes/iva" />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <PeriodFilter period={period} />
        <a
          href={`/facturas/reportes/iva/export?periodo=${period}`}
          className="btn-liquid btn-liquid-secondary rounded-control border border-border bg-transparent px-3 py-2 text-sm text-foreground"
        >
          Exportar Excel
        </a>
      </div>

      <section className={cardClass + " p-5"}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="text-sm text-muted-foreground">IVA débito fiscal</div>
            <div className="mt-1 text-xl font-semibold tabular">{formatCLP(iva.debitoFiscal)}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">IVA crédito fiscal</div>
            <div className="mt-1 text-xl font-semibold tabular">{formatCLP(iva.creditoFiscal)}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">
              {iva.ivaResultado >= 0 ? "IVA a pagar" : "Remanente de crédito"}
            </div>
            <div className="mt-1 text-xl font-semibold tabular">
              {formatCLP(Math.abs(iva.ivaResultado))}
            </div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Retención (ventas)</div>
            <div className="mt-1 text-xl font-semibold tabular">
              {formatCLP(iva.sales.retention)}
            </div>
          </div>
        </div>
      </section>

      <section className={cardClass + " overflow-x-auto"}>
        <table className="w-full min-w-[32rem] text-sm">
          <caption className="sr-only">Resumen de neto, IVA y total por tipo</caption>
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th scope="col" className="px-4 py-3 font-medium">
                Concepto
              </th>
              <th scope="col" className="px-4 py-3 text-right font-medium">
                Neto
              </th>
              <th scope="col" className="px-4 py-3 text-right font-medium">
                IVA
              </th>
              <th scope="col" className="px-4 py-3 text-right font-medium">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-b border-border last:border-0">
                <th scope="row" className="px-4 py-3 text-left font-medium">
                  {row.label}
                </th>
                <td className="px-4 py-3 text-right tabular">{formatCLP(row.net)}</td>
                <td className="px-4 py-3 text-right tabular">{formatCLP(row.iva)}</td>
                <td className="px-4 py-3 text-right tabular">{formatCLP(row.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <p className="text-xs text-muted-foreground">
        El IVA crédito incluye las compras y los gastos registrados con IVA. Si algún gasto no da
        derecho a crédito, ajústalo al declarar.
      </p>

      <section className={cardClass + " p-5"}>
        <h2 className="font-semibold">Cuadre libros ↔ IVA</h2>
        <dl className="mt-3 grid gap-3 sm:grid-cols-3">
          <div>
            <dt className="text-sm text-muted-foreground">Diferencia neto ventas</dt>
            <dd className={"text-lg font-semibold tabular " + (cuadreVentasNeto === 0 ? "text-success" : "text-danger")}>
              {formatCLP(cuadreVentasNeto)}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Diferencia neto compras</dt>
            <dd className={"text-lg font-semibold tabular " + (cuadreComprasNeto === 0 ? "text-success" : "text-danger")}>
              {formatCLP(cuadreComprasNeto)}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Estado</dt>
            <dd className={"text-lg font-semibold " + (cuadreOk ? "text-success" : "text-danger")}>
              {cuadreOk ? "Cuadrado" : "Descuadre"}
            </dd>
          </div>
        </dl>
        <p className="mt-2 text-xs text-muted-foreground">
          El cuadre compara los totales del Libro de ventas y del Libro de compras contra el resumen de IVA del mismo período. Un valor distinto de cero indica documentos sin importar o con diferencia de montos.
        </p>
      </section>
    </div>
  );
}
