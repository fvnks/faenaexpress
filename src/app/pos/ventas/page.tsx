import Link from "next/link";

import { formatPosDateTime } from "@/app/pos/fecha";
import { FilterBar, type FilterField } from "@/components/filter-bar";
import { requireContext } from "@/lib/auth";
import { formatCLP } from "@/lib/money";
import { listPosSales, parsePosSaleFilters } from "@/lib/pos";
import { cardClass, primaryButtonClass, secondaryButtonClass } from "@/lib/ui";

const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Borrador",
  COMPLETED: "Completada",
  VOIDED: "Anulada",
};

export default async function PosVentasPage(props: PageProps<"/pos/ventas">) {
  const ctx = await requireContext();
  const searchParams = await props.searchParams;

  const raw = {
    q: one(searchParams.q),
    desde: one(searchParams.desde),
    hasta: one(searchParams.hasta),
  };
  const filters = parsePosSaleFilters(raw);
  const sales = await listPosSales(ctx.company.id, filters);

  const completed = sales.filter((sale: { status: string }) => sale.status === "COMPLETED");
  const totals = completed.reduce(
    (acc: { net: number; tax: number; total: number }, sale: { subtotal: number; tax: number; total: number }) => ({
      net: acc.net + sale.subtotal,
      tax: acc.tax + sale.tax,
      total: acc.total + sale.total,
    }),
    { net: 0, tax: 0, total: 0 },
  );

  const hasFilters = Boolean(raw.q || raw.desde || raw.hasta);

  const filterFields: FilterField[] = [
    {
      kind: "text",
      name: "q",
      label: "Buscar",
      placeholder: "Ticket o cliente",
      grow: true,
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ventas</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tickets del punto de venta. Sin fechas se muestran los últimos 30 días.
          </p>
        </div>
        <Link href="/pos/venta" className={primaryButtonClass}>
          Nueva venta
        </Link>
      </div>

      <FilterBar fields={filterFields} />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className={cardClass + " p-4"}>
          <p className="text-sm text-muted-foreground">Tickets</p>
          <p className="tabular mt-1 text-2xl font-semibold">{completed.length}</p>
        </div>
        <div className={cardClass + " p-4"}>
          <p className="text-sm text-muted-foreground">Neto</p>
          <p className="tabular mt-1 text-2xl font-semibold">{formatCLP(totals.net)}</p>
        </div>
        <div className={cardClass + " p-4"}>
          <p className="text-sm text-muted-foreground">IVA</p>
          <p className="tabular mt-1 text-2xl font-semibold">{formatCLP(totals.tax)}</p>
        </div>
        <div className={cardClass + " p-4"}>
          <p className="text-sm text-muted-foreground">Total vendido</p>
          <p className="tabular mt-1 text-2xl font-semibold">{formatCLP(totals.total)}</p>
        </div>
      </section>

      <section className={cardClass + " overflow-x-auto"}>
        {sales.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <p className="text-sm font-medium">
              {hasFilters ? "Ningún ticket coincide con el filtro." : "Todavía no hay ventas."}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {hasFilters
                ? "Prueba con otro rango de fechas o limpia los filtros."
                : "Las ventas del punto de venta aparecen acá apenas se registran."}
            </p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-border text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="px-4 py-2">Ticket</th>
                <th className="px-4 py-2">Fecha</th>
                <th className="px-4 py-2">Cliente</th>
                <th className="px-4 py-2">Cajero</th>
                <th className="px-4 py-2 text-right">Ítems</th>
                <th className="px-4 py-2">Pago</th>
                <th className="px-4 py-2">Estado</th>
                <th className="px-4 py-2 text-right">Total</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sales.map((sale: { id: string; saleNumber: string; createdAt: Date; partnerName: string; partnerRut: string | null; userName: string; items: number; payments: string[]; status: string; total: number }) => (
                <tr key={sale.id} className="align-top">
                  <td className="px-4 py-2 font-mono text-xs">{sale.saleNumber}</td>
                  <td className="tabular px-4 py-2 text-muted-foreground">
                    {formatPosDateTime(sale.createdAt)}
                  </td>
                  <td className="px-4 py-2">
                    <span className="block max-w-[14rem] truncate">{sale.partnerName}</span>
                    {sale.partnerRut ? (
                      <span className="tabular block text-xs text-muted-foreground">
                        {sale.partnerRut}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">{sale.userName}</td>
                  <td className="tabular px-4 py-2 text-right">{sale.items}</td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">
                    {sale.payments.length === 0
                      ? "—"
                      : [...new Set(sale.payments)].join(" + ")}
                  </td>
                  <td className="px-4 py-2">
                    {sale.status === "COMPLETED" && sale.total < 0 ? (
                      <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent">
                        Devolución
                      </span>
                    ) : sale.status === "COMPLETED" ? (
                      <span className="rounded-full bg-success-soft px-2 py-0.5 text-xs font-medium text-success">
                        {STATUS_LABEL[sale.status]}
                      </span>
                    ) : sale.status === "VOIDED" ? (
                      <span className="rounded-full bg-danger-soft px-2 py-0.5 text-xs font-medium text-danger">
                        {STATUS_LABEL[sale.status]}
                      </span>
                    ) : (
                      <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent">
                        {STATUS_LABEL[sale.status]}
                      </span>
                    )}
                  </td>
                  <td className="tabular px-4 py-2 text-right font-medium">
                    {formatCLP(sale.total)}
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
              ))}
            </tbody>
          </table>
        )}
      </section>

      {sales.length === 200 ? (
        <p className="text-xs text-muted-foreground">
          Se muestran los 200 tickets más recientes. Acota el rango de fechas para ver otros.
        </p>
      ) : null}

      <div>
        <Link href="/pos" className={secondaryButtonClass}>
          Volver al resumen
        </Link>
      </div>
    </div>
  );
}
