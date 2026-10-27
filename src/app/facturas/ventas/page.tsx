import Link from "next/link";

import { FilterBar, type FilterField } from "@/components/filter-bar";
import { Pagination } from "@/components/pagination";
import { SyncSiiMenu } from "@/components/sync-sii-menu";
import { canWrite, requireContext } from "@/lib/auth";
import { listCategories, listSalespeople } from "@/lib/catalogs";
import { documentTypeLabel } from "@/lib/labels";
import { formatCLP } from "@/lib/money";
import { listCustomers } from "@/lib/partners";
import { canAccess } from "@/lib/permissions";
import { listSales, parseSaleFilters } from "@/lib/sales";
import { parseSortDir } from "@/lib/sort";
import { cardClass, primaryButtonClass, secondaryButtonClass } from "@/lib/ui";
import { documentTypeValues } from "@/lib/validation";
import { SalesTable } from "./sales-table";
import { fetchSaleXmlAction } from "@/app/actions/defontana";

const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export default async function SalesPage(props: PageProps<"/facturas/ventas">) {
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
    orden: one(searchParams.orden),
    dir: one(searchParams.dir),
    pagina: one(searchParams.pagina),
  };
  const filters = parseSaleFilters(raw);
  const sortKey = raw.orden ?? "fecha";
  // Sin parámetro, la lista abre por fecha descendente: lo más reciente arriba.
  const sortDir = parseSortDir(raw.dir ?? "desc");
  const [customers, categories, salespeople] = await Promise.all([
    listCustomers(ctx.company.id),
    listCategories(ctx.company.id),
    listSalespeople(ctx.company.id),
  ]);
  const { items, totals, page, pageCount } = await listSales(ctx.company.id, filters);
  const hasFilters = Boolean(
    raw.estado || raw.q || raw.cliente || raw.categoria || raw.vendedor || raw.tipo || raw.desde || raw.hasta,
  );
  const writable = canWrite(ctx, "ventas");
  // Quien no administra catálogos no puede crear vendedores: el aviso lo manda
  // a pedírselos a administración en vez de a una pantalla que lo rebotaría.
  const canManageSalespeople = canAccess(ctx.role, "catalogos");

  // La exportación se lleva toda la lista filtrada, sin la página actual.
  const exportQuery = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (key === "pagina") continue;
    if (Array.isArray(value)) value.forEach((item) => exportQuery.append(key, item));
    else if (value != null && value !== "") exportQuery.set(key, value);
  }
  const exportHref = exportQuery.toString()
    ? `/facturas/ventas/export?${exportQuery}`
    : "/facturas/ventas/export";

  const filterFields: FilterField[] = [
    { kind: "text", name: "q", label: "Buscar", placeholder: "Cliente, RUT, N° factura, OC, guía…", grow: true },
    {
      kind: "select",
      name: "cliente",
      label: "Cliente",
      emptyLabel: "Todos",
      width: "w-full sm:w-52",
      options: customers.map((customer) => ({ value: customer.id, label: customer.name })),
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
      name: "vendedor",
      label: "Vendedor",
      emptyLabel: "Todos",
      width: "w-full sm:w-48",
      options: salespeople.map((salesperson) => ({ value: salesperson.id, label: salesperson.name })),
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
        { value: "pendientes", label: "Por cobrar" },
        { value: "confirming", label: "En confirming" },
        { value: "cobradas", label: "Cobradas" },
        { value: "parciales", label: "Parciales" },
        { value: "vencidas", label: "Vencidas" },
        { value: "anuladas", label: "Anuladas" },
      ],
    },
  ];

  return (
    <>
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Ventas</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Facturas emitidas a clientes, con su estado de cobro.
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
                <>
                  <SyncSiiMenu side="VENTA" buttonClass={secondaryButtonClass} />
                  <Link href="/facturas/importar#xml" className={secondaryButtonClass}>
                    Cargar XML
                  </Link>
                </>
              ) : null}
              <Link href="/facturas/ventas/nueva" className={primaryButtonClass}>
                Nueva venta
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
              <path d="M12 1v22" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
            <p className="text-xs text-muted-foreground">Total facturado</p>
          </div>
          <p className="tabular mt-1 text-2xl font-bold">{formatCLP(totals.total)}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {totals.count} {totals.count === 1 ? "documento" : "documentos"}
          </p>
          {totals.notasCreditoCantidad > 0 ? (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {totals.notasCreditoCantidad}{" "}
              {totals.notasCreditoCantidad === 1 ? "nota de crédito" : "notas de crédito"}:{" "}
              {formatCLP(totals.notasCredito)}
            </p>
          ) : null}
          {totals.anulados > 0 ? (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {totals.anulados} anuladas no se cuentan
            </p>
          ) : null}
        </div>
        <div className="border-l border-border p-4 sm:border-l-0">
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-success" aria-hidden="true">
              <path d="M20 6L9 17l-5-5" />
            </svg>
            <p className="text-xs text-muted-foreground">Cobrado</p>
          </div>
          <p className="tabular mt-1 text-2xl font-bold text-success">{formatCLP(totals.paid)}</p>
          {totals.confirming > 0 ? (
            <p className="mt-0.5 text-xs text-muted-foreground">
              Incluye {formatCLP(totals.confirming)} en confirming
            </p>
          ) : null}
        </div>
        <div className="col-span-2 border-t border-border p-4 sm:col-span-1 sm:border-t-0">
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-accent" aria-hidden="true">
              <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
            </svg>
            <p className="text-xs text-muted-foreground">Por cobrar</p>
          </div>
          <p className="tabular mt-1 text-2xl font-bold text-accent">{formatCLP(totals.pending)}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Cobrado {formatCLP(totals.paid)} + por cobrar {formatCLP(totals.pending)} ={" "}
            {formatCLP(totals.paid + totals.pending)}
          </p>
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
            <Link href="/facturas/ventas/nueva" className={primaryButtonClass + " mt-4 inline-block"}>
              Nueva venta
            </Link>
          ) : null}
        </div>
      ) : (
        <SalesTable
          items={items}
          writable={writable}
          salespeople={salespeople}
          canManageSalespeople={canManageSalespeople}
          params={searchParams}
          sortKey={sortKey}
          sortDir={sortDir}
          fetchSaleXmlAction={fetchSaleXmlAction}
        />
      )}
      <Pagination
        pathname="/facturas/ventas"
        params={searchParams}
        page={page}
        pageCount={pageCount}
        total={totals.count}
      />
      </div>
    </>
  );
}