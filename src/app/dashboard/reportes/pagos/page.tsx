import type { ReactNode } from "react";
import Link from "next/link";

import { requireContext } from "@/lib/auth";
import { formatCLP, formatDate, formatPeriod, currentPeriod, monthRange } from "@/lib/money";
import { paymentsSummary } from "@/lib/reports";
import { cardClass } from "@/lib/ui";
import { PeriodFilter, ReportNav } from "../report-shell";

function Money({ children }: { children: ReactNode }) {
  return <span className="tabular">{children}</span>;
}

export default async function PaymentsPage(props: PageProps<"/dashboard/reportes/pagos">) {
  const ctx = await requireContext("reportes");
  const searchParams = await props.searchParams;
  const raw = Array.isArray(searchParams.periodo) ? searchParams.periodo[0] : searchParams.periodo;
  const period = raw && monthRange(raw) ? raw : currentPeriod();
  const range = monthRange(period) ?? { from: new Date(), to: new Date() };

  const data = await paymentsSummary(ctx.company.id, range);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Pagos y deudas</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cuánto se ha pagado o cobrado y cuánto se debe en {formatPeriod(period)}.
        </p>
      </div>

      <ReportNav active="/dashboard/reportes/pagos" />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <PeriodFilter period={period} />
        <a
          href={`/dashboard/reportes/pagos/export?periodo=${period}`}
          className="btn-liquid btn-liquid-secondary rounded-control border border-border bg-transparent px-3 py-2 text-sm text-foreground"
        >
          Exportar Excel
        </a>
      </div>

      <section className={cardClass + " p-5"}>
        <h2 className="font-semibold">Resumen</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <div className="text-sm text-muted-foreground">Compras: pagado</div>
            <div className="mt-1 text-lg font-semibold">
              <Money>{formatCLP(data.purchases.paid)}</Money>
            </div>
            <div className="text-xs text-muted-foreground">
              de <Money>{formatCLP(data.purchases.total)}</Money> ({data.purchases.countPaid}/
              {data.purchases.count})
            </div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Ventas: cobrado</div>
            <div className="mt-1 text-lg font-semibold">
              <Money>{formatCLP(data.sales.collected)}</Money>
            </div>
            <div className="text-xs text-muted-foreground">
              de <Money>{formatCLP(data.sales.total)}</Money>
            </div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Gastos: reembolsado</div>
            <div className="mt-1 text-lg font-semibold">
              <Money>{formatCLP(data.expenses.reimbursed)}</Money>
            </div>
            <div className="text-xs text-muted-foreground">
              de <Money>{formatCLP(data.expenses.total)}</Money>
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-4 border-t border-border pt-5 sm:grid-cols-3">
          <div>
            <div className="text-sm text-muted-foreground">Por pagar (compras)</div>
            <div className="mt-1 text-lg font-semibold text-danger">
              <Money>{formatCLP(data.purchases.pending)}</Money>
            </div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Por cobrar (ventas)</div>
            <div className="mt-1 text-lg font-semibold text-success">
              <Money>{formatCLP(data.sales.pending)}</Money>
            </div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Reembolsos pendientes</div>
            <div className="mt-1 text-lg font-semibold">
              <Money>{formatCLP(data.expenses.pending)}</Money>
            </div>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <Detail title="Compras por pagar" count={data.purchases.pendingList.length} defaultOpen>
          {data.purchases.pendingList.length === 0 ? (
            <Empty>No hay compras pendientes de pago.</Empty>
          ) : (
            <Rows>
              {data.purchases.pendingList.map((item) => (
                <Row
                  key={item.id}
                  href={`/dashboard/compras/${item.id}`}
                  primary={item.partnerName}
                  secondary={`${item.documentNumber ? `N° ${item.documentNumber} · ` : ""}emitido ${formatDate(item.date)}${
                    item.dueDate ? ` · vence ${formatDate(item.dueDate)}` : ""
                  }`}
                  amount={item.total}
                />
              ))}
            </Rows>
          )}
        </Detail>

        <Detail title="Ventas por cobrar" count={data.sales.pendingList.length} defaultOpen>
          {data.sales.pendingList.length === 0 ? (
            <Empty>No hay ventas pendientes de cobro.</Empty>
          ) : (
            <Rows>
              {data.sales.pendingList.map((item) => (
                <Row
                  key={item.id}
                  href={`/dashboard/ventas/${item.id}`}
                  primary={item.partnerName}
                  secondary={`${item.documentNumber ? `N° ${item.documentNumber} · ` : ""}emitido ${formatDate(item.date)}${
                    item.dueDate ? ` · vence ${formatDate(item.dueDate)}` : ""
                  }`}
                  amount={item.total}
                />
              ))}
            </Rows>
          )}
        </Detail>

        <Detail title="Compras pagadas" count={data.purchases.paidList.length}>
          <Rows>
            {data.purchases.paidList.map((item) => (
              <Row
                key={item.id}
                href={`/dashboard/compras/${item.id}`}
                primary={item.partnerName}
                secondary={`${item.documentNumber ? `N° ${item.documentNumber} · ` : ""}${
                  item.paymentDate ? `pagada ${formatDate(item.paymentDate)}` : "pagada"
                }`}
                amount={item.total}
              />
            ))}
          </Rows>
        </Detail>

        <Detail title="Ventas cobradas" count={data.sales.collectedList.length}>
          <Rows>
            {data.sales.collectedList.map((item) => (
              <Row
                key={item.id}
                href={`/dashboard/ventas/${item.id}`}
                primary={item.partnerName}
                secondary={`${item.documentNumber ? `N° ${item.documentNumber} · ` : ""}${
                  item.paymentDate
                    ? `cobrada ${formatDate(item.paymentDate)}`
                    : item.confirmingAt
                      ? `en confirming ${formatDate(item.confirmingAt)}`
                      : "cobrada"
                }`}
                amount={item.total}
              />
            ))}
          </Rows>
        </Detail>

        <Detail title="Reembolsos pendientes por pagador" count={data.expenses.pendingList.length}>
          {data.expenses.pendingList.length === 0 ? (
            <Empty>No hay gastos pendientes de reembolso.</Empty>
          ) : (
            <Rows>
              {data.expenses.pendingList.map((item) => (
                <Row
                  key={item.id}
                  href={`/dashboard/gastos/${item.id}`}
                  primary={item.description}
                  secondary={`${item.paidByName} · ${formatDate(item.date)}`}
                  amount={item.total}
                />
              ))}
            </Rows>
          )}
        </Detail>

        <Detail title="Quién pagó los gastos" count={data.expenses.byPayer.length}>
          {data.expenses.byPayer.length === 0 ? (
            <Empty>No hay gastos en el período.</Empty>
          ) : (
            <Rows>
              {data.expenses.byPayer.map((payer) => (
                <div
                  key={payer.id}
                  className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3 last:border-0"
                >
                  <div>
                    <div className="font-medium">{payer.name}</div>
                    <div className="text-xs text-muted-foreground">
                      Reembolsado <Money>{formatCLP(payer.reimbursed)}</Money> · pendiente{" "}
                      <Money>{formatCLP(payer.pending)}</Money>
                    </div>
                  </div>
                  <div className="font-medium">
                    <Money>{formatCLP(payer.total)}</Money>
                  </div>
                </div>
              ))}
            </Rows>
          )}
        </Detail>
      </section>
    </div>
  );
}

function Detail({
  title,
  count,
  defaultOpen,
  children,
}: {
  title: string;
  count: number;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details className={cardClass + " overflow-hidden"} open={defaultOpen}>
      <summary className="flex cursor-pointer items-center justify-between gap-2 px-4 py-3 font-medium">
        <span>{title}</span>
        <span className="text-sm text-muted-foreground">{count}</span>
      </summary>
      <div className="border-t border-border">{children}</div>
    </details>
  );
}

function Rows({ children }: { children: ReactNode }) {
  return <div>{children}</div>;
}

function Row({
  href,
  primary,
  secondary,
  amount,
}: {
  href: string;
  primary: string;
  secondary: string;
  amount: number;
}) {
  return (
    <Link
      href={href}
      className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3 last:border-0 transition-colors hover:bg-primary-soft/30"
    >
      <div className="min-w-0">
        <div className="font-medium">{primary}</div>
        <div className="text-xs text-muted-foreground">{secondary}</div>
      </div>
      <div className="font-medium">
        <Money>{formatCLP(amount)}</Money>
      </div>
    </Link>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="px-4 py-4 text-sm text-muted-foreground">{children}</p>;
}
