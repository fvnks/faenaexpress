import Link from "next/link";

import { bulkSetSaleStatus, deleteSale } from "@/app/actions/sales";
import { ActionsDropdown } from "@/components/actions-dropdown";
import { BulkSelectAll } from "@/components/bulk-select";
import { DateRangeFilter } from "@/components/date-range-filter";
import { SaleStatusBadge } from "@/components/sale-status-badge";
import { SelectDropdown } from "@/components/select-dropdown";
import { SyncSiiMenu } from "@/components/sync-sii-menu";
import { canWrite, requireContext } from "@/lib/auth";
import { listCategories, listSalespeople } from "@/lib/catalogs";
import { documentTypeLabel } from "@/lib/labels";
import { formatCLP, formatDate } from "@/lib/money";
import { listCustomers } from "@/lib/partners";
import { listSales, parseSaleFilters } from "@/lib/sales";
import { cardClass, controlClass, labelClass, primaryButtonClass, secondaryButtonClass } from "@/lib/ui";
import { documentTypeValues } from "@/lib/validation";

const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

const fieldRow = "flex min-w-[6rem] flex-1 flex-col gap-1";

export default async function SalesPage(props: PageProps<"/dashboard/ventas">) {
  const ctx = await requireContext("ventas");
  const searchParams = await props.searchParams;

  const raw = {
    estado: one(searchParams.estado),
    q: one(searchParams.q),
    cliente: one(searchParams.cliente),
    categoria: one(searchParams.categoria),
    vendedor: one(searchParams.vendedor),
    tipo: one(searchParams.tipo),
    desde: one(searchParams.desde),
    hasta: one(searchParams.hasta),
  };
  const filters = parseSaleFilters(raw);
  const [customers, categories, salespeople] = await Promise.all([
    listCustomers(ctx.company.id),
    listCategories(ctx.company.id),
    listSalespeople(ctx.company.id),
  ]);
  const { items, totals } = await listSales(ctx.company.id, filters);
  const hasFilters = Boolean(
    raw.estado || raw.q || raw.cliente || raw.categoria || raw.vendedor || raw.tipo || raw.desde || raw.hasta,
  );
  const writable = canWrite(ctx, "ventas");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ventas</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Facturas emitidas a clientes, con su estado de cobro.
          </p>
        </div>
        {writable ? (
          <div className="flex flex-wrap gap-2">
            {canWrite(ctx, "importar") ? (
              <>
                <SyncSiiMenu side="VENTA" buttonClass={secondaryButtonClass} />
                <Link href="/dashboard/importar#xml" className={secondaryButtonClass}>
                  Cargar XML
                </Link>
              </>
            ) : null}
            <Link href="/dashboard/ventas/nueva" className={primaryButtonClass}>
              Nueva venta
            </Link>
          </div>
        ) : null}
      </div>

      <form method="get" className={cardClass + " flex flex-wrap items-end gap-3 p-4"}>
        <div className={fieldRow + " sm:min-w-[14rem]"}>
          <label htmlFor="q" className={labelClass}>
            Buscar
          </label>
          <input
            id="q"
            name="q"
            defaultValue={raw.q ?? ""}
            placeholder="Cliente, N° factura, OC, guía…"
            className={controlClass}
          />
        </div>

        <div className={fieldRow + " sm:w-52"}>
          <label htmlFor="cliente" className={labelClass}>
            Cliente
          </label>
          <SelectDropdown
            id="cliente"
            name="cliente"
            value={raw.cliente ?? ""}
            emptyLabel="Todos"
            options={customers.map((customer) => ({ value: customer.id, label: customer.name }))}
          />
        </div>

        <div className={fieldRow + " sm:w-48"}>
          <label htmlFor="categoria" className={labelClass}>
            Categoría
          </label>
          <SelectDropdown
            id="categoria"
            name="categoria"
            value={raw.categoria ?? ""}
            emptyLabel="Todas"
            options={categories.map((category) => ({ value: category.id, label: category.name }))}
          />
        </div>

        <div className={fieldRow + " sm:w-48"}>
          <label htmlFor="vendedor" className={labelClass}>
            Vendedor
          </label>
          <SelectDropdown
            id="vendedor"
            name="vendedor"
            value={raw.vendedor ?? ""}
            emptyLabel="Todos"
            options={salespeople.map((salesperson) => ({ value: salesperson.id, label: salesperson.name }))}
          />
        </div>

        <div className={fieldRow + " sm:w-48"}>
          <label htmlFor="tipo" className={labelClass}>
            Tipo de documento
          </label>
          <SelectDropdown
            id="tipo"
            name="tipo"
            value={raw.tipo ?? ""}
            emptyLabel="Todos"
            options={documentTypeValues.map((value) => ({ value, label: documentTypeLabel(value) }))}
          />
        </div>

        <div className={fieldRow + " sm:w-44"}>
          <label htmlFor="estado" className={labelClass}>
            Estado
          </label>
          <SelectDropdown
            id="estado"
            name="estado"
            value={raw.estado ?? ""}
            emptyLabel="Todas"
            options={[
              { value: "pendientes", label: "Por cobrar" },
              { value: "cobradas", label: "Cobradas" },
              { value: "parciales", label: "Parciales" },
              { value: "vencidas", label: "Vencidas" },
              { value: "anuladas", label: "Anuladas" },
            ]}
          />
        </div>

        <DateRangeFilter from={raw.desde} to={raw.hasta} />

        <div className="flex items-center gap-2">
          <button type="submit" className={primaryButtonClass}>
            Filtrar
          </button>
          {hasFilters ? (
            <Link href="/dashboard/ventas" className={secondaryButtonClass}>
              Limpiar
            </Link>
          ) : null}
        </div>
      </form>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className={cardClass + " p-4"}>
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-primary" aria-hidden="true">
              <path d="M12 1v22" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
            <p className="text-xs text-muted-foreground">Total facturado (filtro)</p>
          </div>
          <p className="tabular mt-1 text-2xl font-bold">{formatCLP(totals.total)}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {totals.count} {totals.count === 1 ? "documento" : "documentos"}
          </p>
        </div>
        <div className={cardClass + " p-4"}>
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-success" aria-hidden="true">
              <path d="M20 6L9 17l-5-5" />
            </svg>
            <p className="text-xs text-muted-foreground">Cobrado</p>
          </div>
          <p className="tabular mt-1 text-2xl font-bold text-success">{formatCLP(totals.paid)}</p>
        </div>
        <div className={cardClass + " p-4"}>
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-accent" aria-hidden="true">
              <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
            </svg>
            <p className="text-xs text-muted-foreground">Por cobrar</p>
          </div>
          <p className="tabular mt-1 text-2xl font-bold text-accent">{formatCLP(totals.pending)}</p>
        </div>
      </div>

      {items.length === 0 ? (
        <div className={cardClass + " px-4 py-10 text-center"}>
          <p className="font-medium">
            {hasFilters ? "No hay ventas que coincidan con el filtro." : "Aún no registras ventas."}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {hasFilters
              ? "Prueba con otro cliente, vendedor, categoría, tipo o fecha."
              : "Registra la primera factura a un cliente."}
          </p>
          {!hasFilters && writable ? (
            <Link href="/dashboard/ventas/nueva" className={primaryButtonClass + " mt-4 inline-block"}>
              Nueva venta
            </Link>
          ) : null}
        </div>
      ) : (
        <form id="ventas-bulk" action={bulkSetSaleStatus} className={cardClass}>
          {writable ? (
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
              <BulkSelectAll formId="ventas-bulk" total={items.length} />
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="submit"
                  name="status"
                  value="PAID"
                  className="btn-liquid btn-liquid-secondary rounded-control border border-border bg-transparent px-3 py-1.5 text-sm text-foreground"
                >
                  Marcar cobradas
                </button>
                <button
                  type="submit"
                  name="status"
                  value="PENDING"
                  className="btn-liquid btn-liquid-secondary rounded-control border border-border bg-transparent px-3 py-1.5 text-sm text-foreground"
                >
                  Marcar por cobrar
                </button>
                <button
                  type="submit"
                  name="status"
                  value="PARTIAL"
                  className="btn-liquid btn-liquid-secondary rounded-control border border-border bg-transparent px-3 py-1.5 text-sm text-foreground"
                >
                  Marcar parciales
                </button>
                <button
                  type="submit"
                  name="status"
                  value="OVERDUE"
                  className="btn-liquid btn-liquid-secondary rounded-control border border-border bg-transparent px-3 py-1.5 text-sm text-foreground"
                >
                  Marcar vencidas
                </button>
                <button
                  type="submit"
                  name="status"
                  value="CANCELLED"
                  className="btn-liquid btn-liquid-secondary rounded-control border border-border bg-transparent px-3 py-1.5 text-sm text-foreground"
                >
                  Marcar anuladas
                </button>
              </div>
            </div>
          ) : null}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  {writable ? <th className="w-8 px-2 py-2" /> : null}
                  <th className="px-3 py-2 font-medium">Cliente</th>
                  <th className="px-3 py-2 font-medium">Folio</th>
                  <th className="px-3 py-2 font-medium">Fecha</th>
                  <th className="px-3 py-2 font-medium">OC</th>
                  <th className="px-3 py-2 font-medium">HES</th>
                  <th className="px-3 py-2 font-medium">Estado</th>
                  <th className="px-3 py-2 text-right font-medium">Total</th>
                  {writable ? <th className="w-12 px-2 py-2" /> : null}
                </tr>
              </thead>
              <tbody>
                {items.map((sale) => (
                  <tr key={sale.id} className="border-b border-border last:border-0 hover:bg-primary-soft/30 transition-colors">
                    {writable ? (
                      <td className="px-2 py-2 align-top">
                        <input
                          type="checkbox"
                          name="ids"
                          value={sale.id}
                          aria-label={`Seleccionar venta ${sale.documentNumber ?? sale.partner.name}`}
                          className="h-4 w-4 accent-primary"
                        />
                      </td>
                    ) : null}
                    <td className="min-w-0 max-w-[14rem] px-3 py-2 align-top">
                      <Link
                        href={`/dashboard/ventas/${sale.id}`}
                        className="block truncate font-medium text-foreground underline-offset-2 hover:underline"
                      >
                        {sale.partner.name}
                      </Link>
                      <span className="block truncate text-xs text-muted-foreground">
                        {sale.partner.rut ?? "—"}
                        {sale.salesperson?.name ? ` · ${sale.salesperson.name}` : ""}
                      </span>
                    </td>
                    <td className="tabular whitespace-nowrap px-3 py-2 align-top">
                      {sale.documentNumber ?? "—"}
                    </td>
                    <td className="tabular whitespace-nowrap px-3 py-2 align-top">{formatDate(sale.date)}</td>
                    <td className="tabular whitespace-nowrap px-3 py-2 align-top text-muted-foreground">
                      {sale.purchaseOrder ?? "—"}
                    </td>
                    <td className="tabular whitespace-nowrap px-3 py-2 align-top text-muted-foreground">
                      {sale.hesNumber ?? "—"}
                    </td>
                    <td className="px-3 py-2 align-top">
                      <SaleStatusBadge status={sale.status} />
                      {sale.paymentDate ? (
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {formatDate(sale.paymentDate)}
                        </span>
                      ) : null}
                    </td>
                    <td className="tabular whitespace-nowrap px-3 py-2 text-right align-top font-semibold">
                      {formatCLP(sale.totalAmount)}
                    </td>
                    {writable ? (
                      <td className="px-2 py-2 align-top text-right">
                        <ActionsDropdown
                          editHref={`/dashboard/ventas/${sale.id}/editar`}
                          pdfHref={`/dashboard/ventas/${sale.id}/pdf`}
                          deleteAction={deleteSale}
                          deleteId={sale.id}
                          deleteMessage="¿Eliminar esta venta? Esta acción no se puede deshacer."
                        />
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </form>
      )}
    </div>
  );
}