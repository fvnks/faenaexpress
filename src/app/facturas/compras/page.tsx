import Link from "next/link";

import { bulkSetPurchaseStatus, deletePurchase } from "@/app/actions/purchases";
import { ActionsDropdown } from "@/components/actions-dropdown";
import { BulkSelectAll } from "@/components/bulk-select";
import { FilterBar, type FilterField } from "@/components/filter-bar";
import { Pagination } from "@/components/pagination";
import { PurchaseStatusBadge } from "@/components/purchase-status-badge";
import { XmlBadge } from "@/components/xml-badge";
import { SortableHeader } from "@/components/sortable-header";
import { SyncSiiMenu } from "@/components/sync-sii-menu";
import { canWrite, requireContext } from "@/lib/auth";
import { listCategories } from "@/lib/catalogs";
import { documentTypeLabel } from "@/lib/labels";
import { formatCLP, formatDate, todayDate } from "@/lib/money";
import { listSuppliers } from "@/lib/partners";
import { listPurchases, parsePurchaseFilters } from "@/lib/purchases";
import { parseSortDir, sortHref } from "@/lib/sort";
import { cardClass, primaryButtonClass, secondaryButtonClass } from "@/lib/ui";
import { documentTypeValues } from "@/lib/validation";

const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

// Fecha de vencimiento: en rojo si ya pasó y sigue pendiente, en acento si vence
// dentro de la semana. Lo ya pagado no alarma.
function dueTone(dueDate: Date, status: string, today: Date): string {
  if (status !== "PENDING") return "text-muted-foreground";
  const days = Math.round((dueDate.getTime() - today.getTime()) / 86_400_000);
  if (days < 0) return "text-danger font-semibold";
  if (days <= 7) return "text-accent font-semibold";
  return "text-muted-foreground";
}

export default async function PurchasesPage(props: PageProps<"/facturas/compras">) {
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
    orden: one(searchParams.orden),
    dir: one(searchParams.dir),
    pagina: one(searchParams.pagina),
  };
  const filters = parsePurchaseFilters(raw);
  const sortKey = raw.orden ?? "fecha";
  // Sin parámetro, la lista abre por fecha descendente: lo más reciente arriba.
  const sortDir = parseSortDir(raw.dir ?? "desc");
  const proveedorSort = sortHref("/facturas/compras", searchParams, "proveedor", sortKey, sortDir);
  const folioSort = sortHref("/facturas/compras", searchParams, "folio", sortKey, sortDir);
  const fechaSort = sortHref("/facturas/compras", searchParams, "fecha", sortKey, sortDir);
  const estadoSort = sortHref("/facturas/compras", searchParams, "estado", sortKey, sortDir);
  const totalSort = sortHref("/facturas/compras", searchParams, "total", sortKey, sortDir);
  const [suppliers, categories] = await Promise.all([
    listSuppliers(ctx.company.id),
    listCategories(ctx.company.id),
  ]);
  const { items, totals, page, pageCount } = await listPurchases(ctx.company.id, filters);
  const hasFilters = Boolean(
    raw.estado || raw.q || raw.proveedor || raw.categoria || raw.tipo || raw.desde || raw.hasta,
  );
  const writable = canWrite(ctx, "compras");
  const today = todayDate();

  // Volver a la misma lista (con filtros y orden) tras una acción masiva.
  const currentQuery = (() => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams)) {
      if (Array.isArray(value)) value.forEach((item) => query.append(key, item));
      else if (value != null) query.append(key, value);
    }
    return query;
  })();
  const returnTo = currentQuery.toString()
    ? `/facturas/compras?${currentQuery}`
    : "/facturas/compras";

  // La exportación se lleva toda la lista filtrada, sin la página actual.
  const exportQuery = new URLSearchParams(currentQuery);
  exportQuery.delete("pagina");
  const exportHref = exportQuery.toString()
    ? `/facturas/compras/export?${exportQuery}`
    : "/facturas/compras/export";

  const filterFields: FilterField[] = [
    { kind: "text", name: "q", label: "Buscar", placeholder: "Razón social, RUT, Nº factura u observaciones", grow: true },
    {
      kind: "select",
      name: "proveedor",
      label: "Proveedor",
      emptyLabel: "Todos",
      width: "w-full sm:w-52",
      options: suppliers.map((supplier) => ({ value: supplier.id, label: supplier.name })),
    },
    {
      kind: "select",
      name: "categoria",
      label: "Categoría",
      emptyLabel: "Todas",
      width: "w-full sm:w-48",
      options: categories.map((category) => ({ value: category.id, label: category.name })),
    },
    {
      kind: "select",
      name: "tipo",
      label: "Tipo de documento",
      emptyLabel: "Todos",
      width: "w-full sm:w-52",
      options: documentTypeValues.map((value) => ({ value, label: documentTypeLabel(value) })),
    },
    {
      kind: "select",
      name: "estado",
      label: "Estado",
      emptyLabel: "Todas",
      width: "w-full sm:w-44",
      options: [
        { value: "pendientes", label: "Pendientes de pago" },
        { value: "parciales", label: "Pago parcial" },
        { value: "vencidas", label: "Vencidas" },
        { value: "pagadas", label: "Pagadas" },
      ],
    },
  ];

  return (
    <>
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Compras</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Facturas y boletas de proveedores, con su estado de pago.
            </p>
          </div>
        <div className="flex flex-wrap gap-2">
          {totals.count > 0 ? (
            <Link href={exportHref} className={secondaryButtonClass}>
              Exportar CSV
            </Link>
          ) : null}
          {writable ? (
            <>
              {canWrite(ctx, "importar") ? (
                <SyncSiiMenu side="COMPRA" buttonClass={secondaryButtonClass} />
              ) : null}
              <Link href="/facturas/compras/nueva" className={primaryButtonClass}>
                Nueva compra
              </Link>
            </>
          ) : null}
        </div>
      </div>

      <FilterBar fields={filterFields} />

      <div className={cardClass + " grid grid-cols-2 divide-border sm:grid-cols-3 sm:divide-x"}>
        <div className="p-4">
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-primary" aria-hidden="true">
              <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
            <p className="text-xs text-muted-foreground">Total comprado</p>
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
          {totals.overdue > 0 ? (
            <p className="mt-0.5 text-xs text-danger">
              Incluye {formatCLP(totals.overdue)} vencido
            </p>
          ) : null}
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
            <Link href="/facturas/compras/nueva" className={primaryButtonClass + " mt-4 inline-block"}>
              Nueva compra
            </Link>
          ) : null}
        </div>
      ) : (
        <form id="compras-bulk" action={bulkSetPurchaseStatus} className={cardClass}>
          <input type="hidden" name="returnTo" value={returnTo} />
          {writable ? (
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
              <BulkSelectAll formId="compras-bulk" total={items.length} />
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="submit"
                  data-bulk
                  disabled
                  name="status"
                  value="PAID"
                  className="btn-liquid btn-liquid-secondary rounded-control border border-border bg-transparent px-3 py-1.5 text-sm text-foreground disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Marcar pagadas
                </button>
                <button
                  type="submit"
                  data-bulk
                  disabled
                  name="status"
                  value="PENDING"
                  className="btn-liquid btn-liquid-secondary rounded-control border border-border bg-transparent px-3 py-1.5 text-sm text-foreground disabled:cursor-not-allowed disabled:opacity-60"
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
                  <SortableHeader label="Proveedor" href={proveedorSort.href} active={proveedorSort.active} dir={proveedorSort.dir} />
                  <SortableHeader label="Folio" href={folioSort.href} active={folioSort.active} dir={folioSort.dir} />
                  <SortableHeader label="Fecha" href={fechaSort.href} active={fechaSort.active} dir={fechaSort.dir} />
                  <th scope="col" className="px-3 py-2 font-medium">Vence</th>
                  <SortableHeader label="Estado" href={estadoSort.href} active={estadoSort.active} dir={estadoSort.dir} />
                  <SortableHeader label="Total" href={totalSort.href} active={totalSort.active} dir={totalSort.dir} align="right" />
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
                          data-amount={purchase.totalAmount}
                          aria-label={`Seleccionar compra ${purchase.documentNumber ?? purchase.partner.name}`}
                          className="h-4 w-4 accent-primary"
                        />
                      </td>
                    ) : null}
                    <td className="min-w-0 max-w-[14rem] px-3 py-2 align-top">
                      <Link
                        href={`/facturas/compras/${purchase.id}`}
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
                      <span className="block">{purchase.documentNumber ?? "—"}</span>
                      <XmlBadge tieneXml={Boolean(purchase.xmlContent)} />
                    </td>
                    <td className="tabular whitespace-nowrap px-3 py-2 align-top">{formatDate(purchase.date)}</td>
                    <td className="tabular whitespace-nowrap px-3 py-2 align-top">
                      {purchase.dueDate ? (
                        <>
                          <span className={dueTone(purchase.dueDate, purchase.status, today)}>
                            {formatDate(purchase.dueDate)}
                          </span>
                          {purchase.status === "PENDING" && purchase.dueDate < today ? (
                            <span className="mt-0.5 block text-xs font-semibold text-danger">Vencida</span>
                          ) : null}
                        </>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
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
                          editHref={`/facturas/compras/${purchase.id}/editar`}
                          pdfHref={`/facturas/compras/${purchase.id}/pdf`}
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
      <Pagination
        pathname="/facturas/compras"
        params={searchParams}
        page={page}
        pageCount={pageCount}
        total={totals.count}
      />
      </div>
    </>
  );
}