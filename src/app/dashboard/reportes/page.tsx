import Link from "next/link";

import { requireContext } from "@/lib/auth";
import { formatCLP, formatPeriod, currentPeriod, monthRange } from "@/lib/money";
import { ivaSummary, pendingTotals } from "@/lib/reports";
import { cardClass } from "@/lib/ui";
import { ReportNav } from "./report-shell";

export default async function ReportsPage() {
  const ctx = await requireContext("reportes");
  const period = currentPeriod();
  const range = monthRange(period) ?? { from: new Date(), to: new Date() };

  const [iva, pending] = await Promise.all([
    ivaSummary(ctx.company.id, range),
    pendingTotals(ctx.company.id),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reportes</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Fiscalidad chilena, estado de pagos y gastos de {ctx.company.name}.
        </p>
      </div>

      <ReportNav active="/dashboard/reportes" />

      <section className={cardClass + " p-5"}>
        <h2 className="font-semibold">Resumen de {formatPeriod(period)}</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
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
        <h2 className="font-semibold">Estado de pagos (histórico)</h2>
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
            <dd className="text-lg font-semibold tabular">
              {formatCLP(pending.reembolsosPendientes)}
            </dd>
          </div>
        </dl>
        <p className="mt-4 text-sm flex flex-wrap gap-x-4 gap-y-1">
          <Link
            href="/dashboard/reportes/caja"
            className="text-primary underline-offset-2 hover:underline"
          >
            Ver flujo de caja proyectado
          </Link>
          <Link
            href="/dashboard/reportes/pagos"
            className="text-primary underline-offset-2 hover:underline"
          >
            Ver detalle de lo pagado y lo adeudado
          </Link>
        </p>
      </section>
    </div>
  );
}
