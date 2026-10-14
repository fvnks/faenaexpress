import Link from "next/link";

import { bulkSetPurchaseStatus, deletePurchase } from "@/app/actions/purchases";
import { ActionsDropdown } from "@/components/actions-dropdown";
import { BulkSelectAll } from "@/components/bulk-select";
import { DateRangeFilter } from "@/components/date-range-filter";
import { FilterPersist } from "@/components/filter-persist";
import { PurchaseStatusBadge } from "@/components/purchase-status-badge";
import { SelectDropdown } from "@/components/select-dropdown";
import { SubmitButton } from "@/components/submit-button";
import { SyncSiiMenu } from "@/components/sync-sii-menu";
import { downloadSiiXmlForPurchases } from "@/app/actions/sii-download";
import { canWrite, requireContext } from "@/lib/auth";
import { listCategories } from "@/lib/catalogs";
import { documentTypeLabel } from "@/lib/labels";
import { formatCLP, formatDate, currentPeriod } from "@/lib/money";
import { listSuppliers } from "@/lib/partners";
import { listPurchases, parsePurchaseFilters } from "@/lib/purchases";
import { cardClass, controlClass, labelClass, primaryButtonClass, secondaryButtonClass } from "@/lib/ui";
import { documentTypeValues } from "@/lib/validation";

const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export default async function PurchasesPage(props: PageProps<"/dashboard/compras">) {
  const ctx = await requireContext("compras");
  const searchParams = await props.searchParams;

  const raw = {
    estado: one(searchParams.estado),
    q: one(searchParams.q),
    proveedor: one(searchParams.proveedor),
    categoria: one(searchParams.categoria),
    tipo: one(searchParams.tipo),
    desde: one(searchParams.desde),
    hasta: one(searchParams.hasta),
  };
  const filters = parsePurchaseFilters(raw);
  const [suppliers, categories] = await Promise.all([
    listSuppliers(ctx.company.id),
    listCategories(ctx.company.id),
  ]);
  const { items, totals } = await listPurchases(ctx.company.id, filters);
  const hasFilters = Boolean(
    raw.estado || raw.q || raw.proveedor || raw.categoria || raw.tipo || raw.desde || raw.hasta,
  );
  const writable = canWrite(ctx, "compras");

  return (
    <>
      <FilterPersist router="/dashboard/compras" />
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Compras</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Facturas y boletas de proveedores, con su estado de pago.
            </p>
          </div>
        {writable ? (
          <div className="flex flex-wrap gap-2">
            {canWrite(ctx, "importar") ? (
              <SyncSiiMenu side="COMPRA" buttonClass={secondaryButtonClass} />
            ) : null}
            <Link href="/dashboard/compras/nueva" className={primaryButtonClass}>
              Nueva compra
            </Link>
          </div>
        ) : null}
      </div>

      <form method="get" className={cardClass + " p-4"}>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="q" className={labelClass}>
              Buscar
            </label>
            <input
              id="q"
              name="q"
              type="search"
              defaultValue={raw.q ?? ""}
              placeholder="Razón social, Nº factura u observaciones"
              className={controlClass}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="proveedor" className={labelClass}>
              Proveedor
            </label>
            <SelectDropdown
              id="proveedor"
              name="proveedor"
              value={raw.proveedor ?? ""}
              emptyLabel="Todos"
              options={suppliers.map((supplier) => ({ value: supplier.id, label: supplier.name }))}
            />
          </div>

          <div className="flex flex-col gap-1">
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

          <div className="flex flex-col gap-1">
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

          <div className="flex flex-col gap-1">
            <label htmlFor="estado" className={labelClass}>
              Estado
            </label>
            <SelectDropdown
              id="estado"
              name="estado"
              value={raw.estado ?? ""}
              emptyLabel="Todas"
              options={[
                { value: "pendientes", label: "Pendientes de pago" },
                { value: "pagadas", label: "Pagadas" },
              ]}
            />
          </div>

          <DateRangeFilter from={raw.desde} to={raw.hasta} />

          <div className="flex items-end gap-2">
            <button type="submit" className={primaryButtonClass}>
              Filtrar
            </button>
            {hasFilters ? (
              <Link href="/dashboard/compras" className={secondaryButtonClass}>
                Limpiar
              </Link>
            ) : null}
          </div>
        </div>
      </form>

      <div className={cardClass + " grid grid-cols-2 divide-border sm:grid-cols-3 sm:divide-x"}>
        <div className="p-4">
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-primary" aria-hidden="true">
              <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
            <p className="text-xs text-muted-foreground">Total filtrado</p>
          </div>
          <p className="tabular mt-1 text-2xl font-bold">{formatCLP(totals.total)}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {totals.count} {totals.count === 1 ? "documento" : "documentos"}
          </p>
        </div>
        <div className="border-l border-border p-4 sm:border-l-0">
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-success" aria-hidden="true">
              <path d="M20 6L9 17l-5-5" />
            </svg>
            <p className="text-xs text-muted-foreground">Pagado</p>
          </div>
          <p className="tabular mt-1 text-2xl font-bold text-success">{formatCLP(totals.paid)}</p>
        </div>
        <div className="col-span-2 border-t border-border p-4 sm:col-span-1 sm:border-t-0">
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-accent" aria-hidden="true">
              <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
            </svg>
            <p className="text-xs text-muted-foreground">Pendiente de pago</p>
          </div>
          <p className="tabular mt-1 text-2xl font-bold text-accent">{formatCLP(totals.pending)}</p>
        </div>
      </div>

      {items.length === 0 ? (
        <div className={cardClass + " px-4 py-10 text-center"}>
          <p className="font-medium">
            {hasFilters ? "No hay compras que coincidan con el filtro." : "Aún no registras compras."}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {hasFilters
              ? "Prueba con otro proveedor, categoría, tipo o fecha."
              : "Registra la primera factura de un proveedor."}
          </p>
          {!hasFilters && writable ? (
            <Link href="/dashboard/compras/nueva" className={primaryButtonClass + " mt-4 inline-block"}>
              Nueva compra
            </Link>
          ) : null}
        </div>
      ) : (
        <form id="compras-bulk" action={bulkSetPurchaseStatus} className={cardClass}>
          {writable ? (
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
              <BulkSelectAll formId="compras-bulk" total={items.length} />
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="submit"
                  name="status"
                  value="PAID"
                  className="btn-liquid btn-liquid-secondary rounded-control border border-border bg-transparent px-3 py-1.5 text-sm text-foreground"
                >
                  Marcar pagadas
                </button>
                <button
                  type="submit"
                  name="status"
                  value="PENDING"
                  className="btn-liquid btn-liquid-secondary rounded-control border border-border bg-transparent px-3 py-1.5 text-sm text-foreground"
                >
                  Marcar pendientes
                </button>
              </div>
            </div>
          ) : null}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  {writable ? <th className="w-8 px-2 py-2" /> : null}
                  <th className="px-3 py-2 font-medium">Proveedor</th>
                  <th className="px-3 py-2 font-medium">Folio</th>
                  <th className="px-3 py-2 font-medium">Fecha</th>
                  <th className="px-3 py-2 font-medium">Estado</th>
                  <th className="px-3 py-2 text-right font-medium">Total</th>
                  {writable ? <th className="w-12 px-2 py-2" /> : null}
                </tr>
              </thead>
              <tbody>
                {items.map((purchase) => (
                  <tr key={purchase.id} className="border-b border-border last:border-0 hover:bg-primary-soft/30 transition-colors">
                    {writable ? (
                      <td className="px-2 py-2 align-top">
                        <input
                          type="checkbox"
                          name="ids"
                          value={purchase.id}
                          aria-label={`Seleccionar compra ${purchase.documentNumber ?? purchase.partner.name}`}
                          className="h-4 w-4 accent-primary"
                        />
                      </td>
                    ) : null}
                    <td className="min-w-0 max-w-[14rem] px-3 py-2 align-top">
                      <Link
                        href={`/dashboard/compras/${purchase.id}`}
                        className="block truncate font-medium text-foreground underline-offset-2 hover:underline"
                      >
                        {purchase.partner.name}
                      </Link>
                      <span className="block truncate text-xs text-muted-foreground">
                        {purchase.partner.rut ?? "—"}
                        {purchase.area?.name ? ` · ${purchase.area.name}` : ""}
                      </span>
                    </td>
                    <td className="tabular whitespace-nowrap px-3 py-2 align-top">
                      {purchase.documentNumber ?? "—"}
                    </td>
                    <td className="tabular whitespace-nowrap px-3 py-2 align-top">{formatDate(purchase.date)}</td>
                    <td className="px-3 py-2 align-top">
                      <PurchaseStatusBadge status={purchase.status} />
                      {purchase.paymentDate ? (
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {formatDate(purchase.paymentDate)}
                        </span>
                      ) : null}
                    </td>
                    <td className="tabular whitespace-nowrap px-3 py-2 text-right align-top font-semibold">
                      {formatCLP(purchase.totalAmount)}
                    </td>
                    {writable ? (
                      <td className="px-2 py-2 align-top text-right">
                        <ActionsDropdown
                          editHref={`/dashboard/compras/${purchase.id}/editar`}
                          pdfHref={`/dashboard/compras/${purchase.id}/pdf`}
                          deleteAction={deletePurchase}
                          deleteId={purchase.id}
                          deleteMessage="¿Eliminar esta compra? Esta acción no se puede deshacer."
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
    </>
  );
}