import Link from "next/link";

import { requireContext } from "@/lib/auth";
import { formatCLP, formatPeriod, currentPeriod, monthRange } from "@/lib/money";
import { ivaSummary, pendingTotals, libroVentas, libroCompras, expensesBreakdown, topClients } from "@/lib/reports";
import { cardClass } from "@/lib/ui";
import { ReportNav } from "./report-shell";

export default async function ReportsPage() {
  const ctx = await requireContext("reportes");
  const period = currentPeriod();
  const range = monthRange(period) ?? { from: new Date(), to: new Date() };

  const [iva, pending, libroV, libroC, expenses, top5] = await Promise.all([
    ivaSummary(ctx.company.id, range),
    pendingTotals(ctx.company.id),
    libroVentas(ctx.company.id, range),
    libroCompras(ctx.company.id, range),
    expensesBreakdown(ctx.company.id, range),
    topClients(ctx.company.id, range, 5),
  ]);

  const ventasNetas = libroV.totals.net;
  const comprasNetas = libroC.totals.net;
  const gastosNetos = expenses.total;
  const margenBruto = ventasNetas - comprasNetas - gastosNetos;
  const ticketPromedioVenta = libroV.rows.length > 0 ? ventasNetas / libroV.rows.length : 0;
  const ticketPromedioCompra = libroC.rows.length > 0 ? comprasNetas / libroC.rows.length : 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reportes</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Resumen ejecutivo de {formatPeriod(period)} — fiscalidad chilena, pagos y gestión
          comercial de {ctx.company.name}.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <a
          href={`/facturas/reportes/export?periodo=${period}`}
          className="btn-liquid btn-liquid-secondary rounded-control border border-border bg-transparent px-3 py-2 text-sm text-foreground"
        >
          Exportar resumen (Excel)
        </a>
      </div>

      <ReportNav active="/facturas/reportes" />

      <section className={cardClass + " p-5"}>
        <h2 className="font-semibold">IVA del período</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-sm text-muted-foreground">IVA débito fiscal (ventas)</dt>
            <dd className="text-lg font-semibold tabular">{formatCLP(iva.debitoFiscal)}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">IVA crédito fiscal (compras y gastos)</dt>
            <dd className="text-lg font-semibold tabular">{formatCLP(iva.creditoFiscal)}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">
              {iva.ivaResultado >= 0 ? "IVA a pagar" : "Remanente de crédito"}
            </dt>
            <dd className="text-lg font-semibold tabular">{formatCLP(Math.abs(iva.ivaResultado))}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Retención de honorarios (ventas)</dt>
            <dd className="text-lg font-semibold tabular">{formatCLP(iva.sales.retention)}</dd>
          </div>
        </dl>
      </section>

      <section className={cardClass + " p-5"}>
        <h2 className="font-semibold">KPIs de gestión</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-sm text-muted-foreground">Ventas netas (firmadas)</dt>
            <dd className="text-lg font-semibold tabular">{formatCLP(ventasNetas)}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Compras netas</dt>
            <dd className="text-lg font-semibold tabular">{formatCLP(comprasNetas)}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Gastos totales</dt>
            <dd className="text-lg font-semibold tabular">{formatCLP(gastosNetos)}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Margen bruto</dt>
            <dd className={"text-lg font-semibold tabular " + (margenBruto >= 0 ? "text-success" : "text-danger")}>
              {formatCLP(margenBruto)}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Ticket promedio venta</dt>
            <dd className="text-lg font-semibold tabular">{formatCLP(ticketPromedioVenta)}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Ticket promedio compra</dt>
            <dd className="text-lg font-semibold tabular">{formatCLP(ticketPromedioCompra)}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Documentos de venta</dt>
            <dd className="text-lg font-semibold tabular">{libroV.rows.length}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Documentos de compra</dt>
            <dd className="text-lg font-semibold tabular">{libroC.rows.length}</dd>
          </div>
        </dl>
      </section>

      <section className={cardClass + " p-5"}>
        <h2 className="font-semibold">Estado de pagos</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <dt className="text-sm text-muted-foreground">Por cobrar</dt>
            <dd className="text-lg font-semibold tabular">{formatCLP(pending.porCobrar)}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Por pagar</dt>
            <dd className="text-lg font-semibold tabular">{formatCLP(pending.porPagar)}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Reembolsos pendientes</dt>
            <dd className="text-lg font-semibold tabular">{formatCLP(pending.reembolsosPendientes)}</dd>
          </div>
        </dl>
        <p className="mt-4 text-sm flex flex-wrap gap-x-4 gap-y-1">
          <Link href="/facturas/reportes/caja" className="text-primary underline-offset-2 hover:underline">
            Ver flujo de caja proyectado
          </Link>
          <Link href="/facturas/reportes/pagos" className="text-primary underline-offset-2 hover:underline">
            Ver detalle de lo pagado y lo adeudado
          </Link>
        </p>
      </section>

      <section className={cardClass + " overflow-x-auto"}>
        <h2 className="border-b border-border px-4 py-3 font-semibold">
          Top 5 clientes del período (por facturación)
        </h2>
        {top5.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">Sin ventas positivas en el período.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th scope="col" className="px-4 py-3 font-medium">Cliente</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {top5.map((item) => (
                <tr key={item.name} className="border-b border-border last:border-0">
                  <td className="px-4 py-2.5">{item.name}</td>
                  <td className="px-4 py-2.5 text-right tabular">{formatCLP(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
