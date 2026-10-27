import Link from "next/link";

import { requireContext } from "@/lib/auth";
import { cardClass, secondaryButtonClass } from "@/lib/ui";
import { formatCLP } from "@/lib/money";
import { posSalesReport, type PosSalesReport } from "@/lib/pos";

type ReportFilters = {
  desde?: string | null;
  hasta?: string | null;
  q?: string | null;
};

export default async function PosReportesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const desde = (params.desde as string | undefined) ?? "";
  const hasta = (params.hasta as string | undefined) ?? "";
  const q = (params.q as string | undefined) ?? "";

  const ctx = await requireContext("reportes");

  // Último mes por defecto.
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const desdeISO = desde || new Date(hoy.getTime() - 29 * 86_400_000).toISOString().slice(0, 10);
  const hastaISO = hasta || hoy.toISOString().slice(0, 10);

  const report = await posSalesReport(ctx.company.id, {
    from: new Date(`${desdeISO}T00:00:00.000Z`),
    to: new Date(`${hastaISO}T00:00:00.000Z`),
    ...(q ? { q } : {}),
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reportes del POS</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Ventas del punto de venta por período, producto, cajero y medio de pago.
          </p>
        </div>
        <Link
          href={`/pos/ventas/export?desde=${desdeISO}&hasta=${hastaISO}${q ? `&q=${q}` : ""}`}
          className={secondaryButtonClass}
        >
          Exportar CSV
        </Link>
      </div>

      {/* Filtros */}
      <section className={cardClass + " p-4"}>
        <form className="flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-1">
            <label htmlFor="pos-rep-desde" className="text-xs font-medium text-muted-foreground">
              Desde
            </label>
            <input
              id="pos-rep-desde"
              name="desde"
              type="date"
              defaultValue={desdeISO}
              className="rounded-control border border-border bg-surface px-3 py-1.5 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="pos-rep-hasta" className="text-xs font-medium text-muted-foreground">
              Hasta
            </label>
            <input
              id="pos-rep-hasta"
              name="hasta"
              type="date"
              defaultValue={hastaISO}
              className="rounded-control border border-border bg-surface px-3 py-1.5 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="pos-rep-q" className="text-xs font-medium text-muted-foreground">
              Buscar (ticket, cliente, cajero)
            </label>
            <input
              id="pos-rep-q"
              name="q"
              type="text"
              defaultValue={q}
              className="rounded-control border border-border bg-surface px-3 py-1.5 text-sm"
              placeholder="N° de ticket, nombre…"
            />
          </div>
          <button type="submit" className="flex items-center gap-2 px-4 py-1.5 rounded-control border border-border bg-surface text-sm hover:bg-background">
            Filtrar
          </button>
        </form>
      </section>

      {/* Tarjetas de totales */}
      <section className={cardClass + " p-4"}>
        <div className="grid gap-4 lg:grid-cols-4">
          <div className="p-3 rounded-card border border-border bg-surface">
            <div className="text-xs text-muted-foreground">Tickets vendidos</div>
            <div className="mt-1 tabular text-lg font-semibold">{report.totals.count}</div>
          </div>
          <div className="p-3 rounded-card border border-border bg-surface">
            <div className="text-xs text-muted-foreground">Neto</div>
            <div className="mt-1 tabular text-lg font-semibold">{formatCLP(report.totals.net)}</div>
          </div>
          <div className="p-3 rounded-card border border-border bg-surface">
            <div className="text-xs text-muted-foreground">IVA</div>
            <div className="mt-1 tabular text-lg font-semibold">{formatCLP(report.totals.tax)}</div>
          </div>
          <div className="p-3 rounded-card border border-border bg-surface">
            <div className="text-xs text-muted-foreground">Total</div>
            <div className="mt-1 tabular text-lg font-semibold">{formatCLP(report.totals.total)}</div>
          </div>
        </div>
      </section>

      {report.sales.length === 0 ? (
        <section className={cardClass + " p-8"}>
          <p className="text-center text-sm text-muted-foreground">
            No hay ventas en el período seleccionado.
          </p>
        </section>
      ) : (
        <>
          {/* Ventas por producto */}
          <section className={cardClass + " p-4"}>
            <h2 className="text-sm font-semibold mb-3">Ventas por producto</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="px-4 py-2">Producto</th>
                    <th className="px-4 py-2 text-right">Cantidad</th>
                    <th className="px-4 py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {report.byProduct.map((row) => (
                    <tr key={row.productId ?? row.name} className="tabular">
                      <td className="px-4 py-2">{row.name}</td>
                      <td className="px-4 py-2 text-right tabular">{row.quantity}</td>
                      <td className="px-4 py-2 text-right tabular">{formatCLP(row.total)}</td>
                    </tr>
                  ))}
                  <tr className="border-t border-border font-semibold">
                    <td className="px-4 py-2">Total</td>
                    <td className="px-4 py-2 text-right tabular">
                      {report.byProduct.reduce((sum, r) => sum + r.quantity, 0)}
                    </td>
                    <td className="px-4 py-2 text-right tabular">{formatCLP(report.totals.total)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Ventas por cajero */}
          <section className={cardClass + " p-4 mt-6"}>
            <h2 className="text-sm font-semibold mb-3">Ventas por cajero</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="px-4 py-2">Cajero</th>
                    <th className="px-4 py-2 text-right">Tickets</th>
                    <th className="px-4 py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {report.byCashier.map((row) => (
                    <tr key={row.userId} className="tabular">
                      <td className="px-4 py-2">{row.userName}</td>
                      <td className="px-4 py-2 text-right tabular">{row.count}</td>
                      <td className="px-4 py-2 text-right tabular">{formatCLP(row.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Ventas por medio de pago */}
          <section className={cardClass + " p-4 mt-6"}>
            <h2 className="text-sm font-semibold mb-3">Ventas por medio de pago</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="px-4 py-2">Medio de pago</th>
                    <th className="px-4 py-2 text-right">Tickets</th>
                    <th className="px-4 py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {report.byMethod.map((row) => (
                    <tr key={row.method} className="tabular">
                      <td className="px-4 py-2">{row.method}</td>
                      <td className="px-4 py-2 text-right tabular">{row.count}</td>
                      <td className="px-4 py-2 text-right tabular">{formatCLP(row.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
