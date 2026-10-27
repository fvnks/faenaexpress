import Link from "next/link";

import { requireContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatCLP } from "@/lib/money";
import { cardClass, secondaryButtonClass } from "@/lib/ui";

export default async function PosCreditoPage() {
  const ctx = await requireContext();

  const ventasPendientes = await db.posSale.findMany({
    where: {
      companyId: ctx.company.id,
      balanceDue: { gt: 0 },
    },
    include: {
      partner: { select: { name: true, rut: true } },
      user: { select: { name: true } },
      session: { select: { id: true, openedAt: true } },
      payments: { select: { method: true, amount: true, createdAt: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const totalPendiente = ventasPendientes.reduce(
    (sum, s) => sum + Number(s.balanceDue),
    0,
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cuenta corriente</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Ventas del POS con saldo pendiente por cobrar.
          </p>
        </div>
        <Link href="/pos/venta" className={secondaryButtonClass}>
          Nueva venta
        </Link>
      </div>

      <section className={cardClass + " p-4"}>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="p-3 rounded-card border border-border bg-surface">
            <p className="text-sm text-muted-foreground">Clientes con deuda</p>
            <p className="mt-1 tabular text-2xl font-semibold">
              {[...new Set(ventasPendientes.map((v) => v.partnerId))].length}
            </p>
          </div>
          <div className="p-3 rounded-card border border-border bg-surface">
            <p className="text-sm text-muted-foreground">Total pendiente</p>
            <p className="mt-1 tabular text-2xl font-semibold text-danger">
              {formatCLP(totalPendiente)}
            </p>
          </div>
        </div>
      </section>

      {ventasPendientes.length === 0 ? (
        <section className={cardClass + " p-8"}>
          <p className="text-center text-sm text-muted-foreground">
            No hay ventas con saldo pendiente.
          </p>
        </section>
      ) : (
        <section className={cardClass + " p-4 overflow-x-auto"}>
          <table className="min-w-full divide-y divide-border text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="px-4 py-2">Ticket</th>
                <th className="px-4 py-2">Fecha</th>
                <th className="px-4 py-2">Cliente</th>
                <th className="px-4 py-2">Cajero</th>
                <th className="px-4 py-2 text-right">Total</th>
                <th className="px-4 py-2 text-right">Pagado</th>
                <th className="px-4 py-2 text-right">Pendiente</th>
                <th className="px-4 py-2 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {ventasPendientes.map((sale) => {
                const amountPaid = Number(sale.amountPaid);
                const balanceDue = Number(sale.balanceDue);
                return (
                  <tr key={sale.id} className="tabular">
                    <td className="px-4 py-2 font-mono text-xs">{sale.saleNumber}</td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {new Date(sale.createdAt).toLocaleString("es-CL", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-2">
                      <span className="block max-w-[14rem] truncate">
                        {sale.partner?.name ?? "Consumidor final"}
                      </span>
                      {sale.partner?.rut ? (
                        <span className="tabular block text-xs text-muted-foreground">
                          RUT {sale.partner.rut}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {sale.user.name}
                    </td>
                    <td className="px-4 py-2 text-right tabular">
                      {formatCLP(Number(sale.total))}
                    </td>
                    <td className="px-4 py-2 text-right tabular">
                      {formatCLP(amountPaid)}
                    </td>
                    <td className="px-4 py-2 text-right tabular font-medium text-danger">
                      {formatCLP(balanceDue)}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <Link
                        href={`/pos/ventas/${sale.id}`}
                        className="text-primary hover:underline"
                      >
                        Ver
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
