import Link from "next/link";
import { ShoppingBag } from "lucide-react";

import { Chart01 } from "@/components/ui/studio-blocks/chart-01";
import { Kpi01 } from "@/components/ui/studio-blocks/kpi-01";
import { Kpi04 } from "@/components/ui/studio-blocks/kpi-04";
import { requireContext } from "@/lib/auth";
import { dayStartUtc, formatCLP, formatDate, nextDayISO, todayISO } from "@/lib/money";
import { getOpenPosSession, listPosSales, posTodaySummary } from "@/lib/pos";
import { cardClass, primaryButtonClass, secondaryButtonClass } from "@/lib/ui";

export default async function PosHomePage() {
  const ctx = await requireContext();
  const [session, summary] = await Promise.all([
    getOpenPosSession(ctx.company.id, ctx.user.id),
    posTodaySummary(ctx.company.id),
  ]);

  // Ventas de hoy: fronteras de medianoche chilena en UTC.
  const hoyISO = todayISO();
  const from = dayStartUtc(hoyISO);
  const to = dayStartUtc(nextDayISO(hoyISO));
  const recent = await listPosSales(ctx.company.id, { q: "", from, to });

  // Ventas por medio de pago, para el gráfico del día.
  const chartItems = summary.byMethod
    .filter((row) => row.amount > 0)
    .map((row) => ({
      label: row.method,
      amount: row.amount,
      color: ["violet", "blue", "emerald", "amber", "rose", "rose"][
        summary.byMethod.indexOf(row) % 6
      ] as "violet" | "blue" | "emerald" | "amber" | "rose",
    }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Punto de venta</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatDate(from)} · {ctx.company.name}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {session ? (
            <Link href="/pos/venta" className={primaryButtonClass}>
              Nueva venta
            </Link>
          ) : (
            <Link href="/pos/caja" className={primaryButtonClass}>
              Abrir caja
            </Link>
          )}
          <Link href="/pos/ventas" className={secondaryButtonClass}>
            Ver ventas
          </Link>
        </div>
      </div>

      {/* Caja status */}
      {session ? (
        <section className={cardClass + " flex flex-wrap items-center justify-between gap-4 p-4"}>
          <div>
            <p className="text-sm font-semibold text-foreground">Caja abierta</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Desde {session.openedAt.toLocaleTimeString("es-CL", { timeZone: "America/Santiago", hour: "2-digit", minute: "2-digit" })} · Monto inicial{" "}
              <span className="tabular">{formatCLP(session.openingAmount)}</span>
            </p>
          </div>
          <Link href="/pos/caja" className={secondaryButtonClass}>
            Ver caja
          </Link>
        </section>
      ) : (
        <section className="rounded-card border border-accent/50 bg-accent-soft p-4">
          <p className="text-sm font-semibold text-foreground">No tienes una caja abierta.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Abre la caja para registrar ventas y llevar el control del efectivo del turno.
          </p>
          <Link href="/pos/caja" className={primaryButtonClass + " mt-3 inline-block"}>
            Abrir caja
          </Link>
        </section>
      )}

      {/* KPI Cards Grid */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi04
          title="Ventas de hoy"
          value={summary.count}
          format="number"
          footer="Tickets emitidos hoy"
        />
        <Kpi01
          title="Total vendido"
          value={summary.total}
          icon={<ShoppingBag aria-hidden="true" className="size-4" />}
          footer={`IVA incluido: ${formatCLP(summary.tax)}`}
        />
        <Kpi04 title="Neto" value={summary.net} footer="Sin IVA" />
        <Kpi04 title="IVA del día" value={summary.tax} footer="Débito fiscal de hoy" />
      </section>

      {/* Gráfico de ventas por medio de pago */}
      <section className="grid gap-4 lg:grid-cols-2">
        <Chart01
          items={chartItems}
          currency="CLP"
          locale="es-CL"
          title="Ventas por medio de pago"
          emptyLabel="Todavía no hay pagos registrados hoy."
          className="lg:col-span-2"
        />

        <section className={cardClass + " p-4"}>
          <h2 className="text-sm font-semibold">Por medio de pago</h2>
          {summary.byMethod.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">Todavía no hay pagos registrados hoy.</p>
          ) : (
            <dl className="mt-3 space-y-2">
              {summary.byMethod.map((row) => (
                <div key={row.method} className="flex items-baseline justify-between gap-4 text-sm">
                  <dt className="text-muted-foreground">{row.method}</dt>
                  <dd className="tabular font-medium">{formatCLP(row.amount)}</dd>
                </div>
              ))}
            </dl>
          )}
        </section>
      </section>

      {/* Últimas ventas */}
      <section className={cardClass + " overflow-x-auto"}>
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold">Últimas ventas de hoy</h2>
          <Link href="/pos/ventas" className="text-sm text-primary hover:underline">
            Ver todas
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            Todavía no hay ventas hoy.
          </p>
        ) : (
          <table className="min-w-full divide-y divide-border text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="px-4 py-2">Ticket</th>
                <th className="px-4 py-2">Cliente</th>
                <th className="px-4 py-2 text-right">Ítems</th>
                <th className="px-4 py-2 text-right">Total</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {recent.slice(0, 8).map((sale) => (
                <tr key={sale.id} className="tabular">
                  <td className="px-4 py-2 font-mono text-xs">{sale.saleNumber}</td>
                  <td className="px-4 py-2">{sale.partnerName}</td>
                  <td className="px-4 py-2 text-right">{sale.items}</td>
                  <td className="px-4 py-2 text-right font-medium">{formatCLP(sale.total)}</td>
                  <td className="px-4 py-2 text-right">
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
        )}
      </section>
    </div>
  );
}
