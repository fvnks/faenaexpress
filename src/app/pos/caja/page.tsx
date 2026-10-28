import Link from "next/link";

import { FormattedTime } from "@/components/formatted-time";
import { requireContext } from "@/lib/auth";
import { formatCLP, formatDate } from "@/lib/money";
import {
  getOpenPosSession,
  getPosSession,
  listPosSessions,
  listPosTerminals,
} from "@/lib/pos";
import { listWarehouses } from "@/lib/inventory";
import { cardClass, secondaryButtonClass } from "@/lib/ui";
import { CloseSessionForm } from "@/app/pos/caja/close-session-form";
import { OpenSessionForm } from "@/app/pos/caja/open-session-form";

export default async function PosCajaPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const ctx = await requireContext();
  const open = await getOpenPosSession(ctx.company.id, ctx.user.id);
  const session = open ? await getPosSession(ctx.company.id, open.id) : null;
  const params = await searchParams;
  const terminalId = (params.terminalId as string | undefined) ?? "";
  const history = await listPosSessions(ctx.company.id, 30, terminalId || undefined);
  const terminals = await listPosTerminals(ctx.company.id);
  const warehouses = await listWarehouses(ctx.company.id);

  const sales = session?.sales ?? [];
  const cashSales = sales.reduce(
    (sum: number, sale: { payments: { method: string; amount: number }[]; total: number }) =>
      sum +
      sale.payments
        .filter((payment: { method: string; amount: number }) => payment.method.toLowerCase().includes("efectivo"))
        .reduce((inner: number, payment: { method: string; amount: number }) => inner + payment.amount, 0),
    0,
  );
  const totalSales = sales.reduce((sum: number, sale: { total: number }) => sum + sale.total, 0);
  const expected = (session?.openingAmount ?? 0) + cashSales;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Caja</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Apertura, cierre y arqueo del turno.
          </p>
        </div>
        <Link href="/pos/venta" className={secondaryButtonClass}>
          Ir a vender
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <section className={cardClass + " p-5"}>
          {session ? (
            <>
              <h2 className="text-sm font-semibold">Tu caja está abierta</h2>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Apertura</dt>
                  <dd className="tabular">{formatCLP(session.openingAmount)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Desde</dt>
                  <dd>
                    <FormattedTime iso={session.openedAt.toISOString()} />{" "}
                    · {formatDate(session.openedAt)}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Ventas</dt>
                  <dd className="tabular">{sales.length}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Total vendido</dt>
                  <dd className="tabular font-medium">{formatCLP(totalSales)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Ventas en efectivo</dt>
                  <dd className="tabular">{formatCLP(cashSales)}</dd>
                </div>
                <div className="flex justify-between gap-4 border-t border-border pt-2">
                  <dt className="font-medium">Efectivo esperado</dt>
                  <dd className="tabular font-semibold">{formatCLP(expected)}</dd>
                </div>
              </dl>

              <div className="mt-5 border-t border-border pt-4">
                <h3 className="text-sm font-semibold">Cerrar caja</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Cuenta el efectivo físico e ingresa el monto. La diferencia queda registrada.
                </p>
                <div className="mt-3">
                  <CloseSessionForm sessionId={session.id} expected={expected} />
                </div>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-sm font-semibold">Abrir caja</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Necesitas una caja abierta para registrar ventas.
              </p>
              <div className="mt-4">
                <OpenSessionForm terminals={terminals} warehouses={warehouses} />
              </div>
            </>
          )}
        </section>

        <section className={cardClass + " p-5"}>
          <h2 className="text-sm font-semibold">Movimientos de la caja</h2>
          {sales.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Todavía no hay ventas en esta caja.
            </p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full divide-y divide-border text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="py-2 pr-3">Ticket</th>
                    <th className="py-2 pr-3">Hora</th>
                    <th className="py-2 pr-3">Cliente</th>
                    <th className="py-2 pr-3 text-right">Total</th>
                    <th className="py-2 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {sales.map((sale: { id: string; saleNumber: string; createdAt: Date; partner: { name: string } | null; total: number }) => (
                    <tr key={sale.id} className="tabular">
                      <td className="py-2 pr-3 font-mono text-xs">{sale.saleNumber}</td>
                      <td className="py-2 pr-3 text-muted-foreground">
                        <FormattedTime iso={sale.createdAt.toISOString()} />
                      </td>
                      <td className="py-2 pr-3">{sale.partner?.name ?? "Consumidor final"}</td>
                      <td className="py-2 pr-3 text-right">{formatCLP(sale.total)}</td>
                      <td className="py-2 text-right">
                        <Link
                          href={`/pos/ventas/${sale.id}`}
                          className="text-primary hover:underline"
                        >
                          Ver
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <section className={cardClass + " overflow-x-auto"}>
        <div className="border-b border-border px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">Historial de cajas</h2>
          <form method="get" className="flex items-center gap-2">
            <label htmlFor="pos-history-terminal" className="text-xs text-muted-foreground">
              Terminal
            </label>
            <select
              id="pos-history-terminal"
              name="terminalId"
              defaultValue={terminalId}
              className="rounded-control border border-border bg-surface px-3 py-1.5 text-sm"
              onChange={(event) => {
                const form = (event.target as HTMLSelectElement).form;
                if (form) form.requestSubmit();
              }}
            >
              <option value="">Todas</option>
              {terminals.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </form>
        </div>
        {history.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            Todavía no hay cajas registradas.
          </p>
        ) : (
          <table className="min-w-full divide-y divide-border text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="px-4 py-2">Apertura</th>
                <th className="px-4 py-2">Cajero</th>
                <th className="px-4 py-2">Terminal</th>
                <th className="px-4 py-2">Bodega</th>
                <th className="px-4 py-2 text-right">Monto inicial</th>
                <th className="px-4 py-2 text-right">Ventas</th>
                <th className="px-4 py-2 text-right">Total</th>
                <th className="px-4 py-2 text-right">Contado</th>
                <th className="px-4 py-2">Estado</th>
                <th className="px-4 py-2 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {history.map((row: { id: string; openedAt: Date; openedByName: string; openingAmount: number; count: number; cash: number; total: number; closingAmount: number | null; status: string; terminal: { name: string } | null; warehouse: { name: string } | null }) => {
                // El arqueo: lo que debía haber en la caja contra lo que se contó.
                const expectedCash = row.openingAmount + row.cash;
                const difference = row.closingAmount === null ? null : row.closingAmount - expectedCash;

                return (
                <tr key={row.id} className="tabular">
                  <td className="px-4 py-2">
                    {formatDate(row.openedAt)} <FormattedTime iso={row.openedAt.toISOString()} />
                  </td>
                  <td className="px-4 py-2">{row.openedByName}</td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {row.terminal?.name ?? "—"}
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {row.warehouse?.name ?? "—"}
                  </td>
                  <td className="px-4 py-2 text-right">{formatCLP(row.openingAmount)}</td>
                  <td className="px-4 py-2 text-right">{row.count}</td>
                  <td className="px-4 py-2 text-right">{formatCLP(row.total)}</td>
                  <td className="px-4 py-2 text-right">
                    {row.closingAmount === null ? "—" : formatCLP(row.closingAmount)}
                  </td>
                  <td className="px-4 py-2">
                    {row.status === "OPEN" || difference === null ? (
                      <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent">
                        Abierta
                      </span>
                    ) : difference === 0 ? (
                      <span className="rounded-full bg-success-soft px-2 py-0.5 text-xs font-medium text-success">
                        Cuadrada
                      </span>
                    ) : difference < 0 ? (
                      <span className="rounded-full bg-danger-soft px-2 py-0.5 text-xs font-medium text-danger">
                        Faltan {formatCLP(-difference)}
                      </span>
                    ) : (
                      <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent">
                        Sobran {formatCLP(difference)}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Link
                      href={`/pos/caja/${row.id}`}
                      className="text-primary hover:underline"
                    >
                      Ver cierre
                    </Link>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
