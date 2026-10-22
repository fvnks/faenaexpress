import Link from "next/link";

import { FilterBar, type FilterField } from "@/components/filter-bar";
import { Pagination } from "@/components/pagination";
import { SyncSiiMenu } from "@/components/sync-sii-menu";
import { GuideSaleLink } from "@/app/facturas/ventas/guias/guide-sale-link";
import { canWrite, requireContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { listCustomers } from "@/lib/partners";
import { listSalespeople } from "@/lib/catalogs";
import { listGuides, listGuidePeriods, parseGuideFilters } from "@/lib/dispatch-guides";
import { formatCLP, formatDate, formatPeriod } from "@/lib/money";
import { cardClass, primaryButtonClass, secondaryButtonClass } from "@/lib/ui";

const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export default async function GuiasPage(props: PageProps<"/facturas/ventas/guias">) {
  const ctx = await requireContext("ventas");
  const searchParams = await props.searchParams;

  const raw = {
    q: one(searchParams.q),
    cliente: one(searchParams.cliente),
    vendedor: one(searchParams.vendedor),
    mes: one(searchParams.mes),
    asignacion: one(searchParams.asignacion),
    orden: one(searchParams.orden),
    dir: one(searchParams.dir),
    pagina: one(searchParams.pagina),
  };
  const filters = parseGuideFilters(raw);

  const [customers, salespeople, periodos, listado] = await Promise.all([
    listCustomers(ctx.company.id),
    listSalespeople(ctx.company.id),
    listGuidePeriods(ctx.company.id),
    listGuides(ctx.company.id, filters),
  ]);
  const { items, totals, page, pageCount } = listado;

  const hasFilters = Boolean(raw.q || raw.cliente || raw.vendedor || raw.mes || raw.asignacion);
  const writable = canWrite(ctx, "ventas");

  // Las facturas candidatas para relacionar cada guía: las del mismo cliente.
  const ventasPorCliente = await Promise.all(
    [...new Set(items.map((g) => g.partnerId))].map(async (partnerId) => {
      const ventas = await db.sale.findMany({
        where: {
          companyId: ctx.company.id,
          partnerId,
          documentType: { in: ["INVOICE", "RECEIPT"] },
        },
        select: { id: true, documentNumber: true, date: true },
        orderBy: { date: "desc" },
        take: 25,
      });
      return [
        partnerId,
        ventas.map((v: { id: string; documentNumber: string | null; date: Date }) => ({
          id: v.id,
          etiqueta: `N° ${v.documentNumber ?? "—"} · ${formatDate(v.date)}`,
        })),
      ] as const;
    }),
  );
  const candidatas = new Map(ventasPorCliente);

  const filterFields: FilterField[] = [
    {
      kind: "text",
      name: "q",
      label: "Buscar",
      placeholder: "N° guía, cliente, RUT, N° factura…",
      grow: true,
    },
    {
      kind: "select",
      name: "cliente",
      label: "Cliente",
      emptyLabel: "Todos",
      width: "w-full sm:w-52",
      options: customers.map((c) => ({ value: c.id, label: c.name })),
    },
    {
      kind: "select",
      name: "vendedor",
      label: "Vendedor",
      emptyLabel: "Todos",
      width: "w-full sm:w-48",
      options: salespeople.map((s) => ({ value: s.id, label: s.name })),
    },
    {
      kind: "select",
      name: "mes",
      label: "Mes",
      emptyLabel: "Todos los meses",
      width: "w-full sm:w-44",
      options: periodos.map((p) => ({ value: p, label: formatPeriod(p) })),
    },
    {
      kind: "select",
      name: "asignacion",
      label: "Comisión",
      emptyLabel: "Todas",
      width: "w-full sm:w-48",
      options: [
        { value: "asignadas", label: "Con mes de comisión" },
        { value: "sin_asignar", label: "Sin mes de comisión" },
      ],
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Guías de Despacho</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Guías de despacho electrónicas, con la factura de venta que despachan.
            {raw.mes ? ` Mes de ${formatPeriod(raw.mes)}.` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {writable ? (
            <>
              {canWrite(ctx, "importar") ? (
                <SyncSiiMenu
                  side="VENTA"
                  buttonClass={secondaryButtonClass}
                  tipos="50"
                  destino="/facturas/ventas/guias"
                  etiqueta="Sincronizar SII"
                />
              ) : null}
              <Link href="/facturas/ventas/guias/nueva" className={primaryButtonClass}>
                Nueva guía
              </Link>
            </>
          ) : null}
        </div>
      </div>

      <FilterBar fields={filterFields} />

      <div className={cardClass + " grid grid-cols-2 divide-border sm:grid-cols-4 sm:divide-x"}>
        <div className="p-4">
          <p className="text-xs text-muted-foreground">Neto despachado</p>
          <p className="tabular mt-1 text-2xl font-bold">{formatCLP(totals.total)}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {totals.count} {totals.count === 1 ? "guía" : "guías"}
          </p>
        </div>
        <div className="border-l border-border p-4 sm:border-l-0">
          <p className="text-xs text-muted-foreground">Con factura</p>
          <p className="tabular mt-1 text-2xl font-bold text-success">{totals.conFactura}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {totals.sinFactura} sin factura relacionada
          </p>
        </div>
        <div className="border-l border-border p-4 sm:border-l-0">
          <p className="text-xs text-muted-foreground">Sin factura</p>
          <p className="tabular mt-1 text-2xl font-bold text-accent">{totals.sinFactura}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">sin relacionar todavía</p>
        </div>
        <div className="col-span-2 border-t border-border p-4 sm:col-span-1 sm:border-t-0">
          <p className="text-xs text-muted-foreground">Con vendedor</p>
          <p className="tabular mt-1 text-2xl font-bold">{totals.conVendedor}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            las demás no comisionan por fecha
          </p>
        </div>
      </div>

      {items.length === 0 ? (
        <div className={cardClass + " px-4 py-10 text-center"}>
          <p className="font-medium">
            {hasFilters ? "No hay guías que coincidan con el filtro." : "Aún no registra guías de despacho."}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {hasFilters
              ? "Prueba con otro cliente, vendedor, mes o búsqueda."
              : "Las guías se traen del SII con la sincronización, o se registran a mano."}
          </p>
          {!hasFilters && writable ? (
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {canWrite(ctx, "importar") ? (
                <SyncSiiMenu
                  side="VENTA"
                  buttonClass={secondaryButtonClass}
                  tipos="50"
                  destino="/facturas/ventas/guias"
                  etiqueta="Sincronizar SII"
                />
              ) : null}
              <Link href="/facturas/ventas/guias/nueva" className={primaryButtonClass}>
                Nueva guía
              </Link>
            </div>
          ) : null}
        </div>
      ) : (
        <div className={cardClass + " overflow-x-auto"}>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th scope="col" className="px-3 py-2 font-medium">
                  Fecha
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  N° guía
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Cliente
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Vendedor
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Factura que despacha
                </th>
                <th scope="col" className="px-3 py-2 text-right font-medium">
                  Neto
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((g) => (
                <tr
                  key={g.id}
                  className="border-b border-border last:border-0 hover:bg-primary-soft/30 transition-colors"
                >
                  <td className="tabular whitespace-nowrap px-3 py-2 align-top">
                    {formatDate(g.date)}
                  </td>
                  <td className="tabular px-3 py-2 align-top">{g.guideNumber}</td>
                  <td className="px-3 py-2 align-top">{g.partnerName}</td>
                  <td className="px-3 py-2 align-top">{g.salespersonName ?? "—"}</td>
                  <td className="px-3 py-2 align-top">
                    {g.saleId ? (
                      <Link
                        href={`/facturas/ventas/${g.saleId}`}
                        className="text-primary underline underline-offset-2 hover:text-primary/80"
                      >
                        N° {g.saleNumber ?? "—"}
                      </Link>
                    ) : null}
                    <GuideSaleLink
                      guideId={g.id}
                      ventaId={g.saleId}
                      ventas={candidatas.get(g.partnerId) ?? []}
                      puedeEditar={writable}
                    />
                  </td>
                  <td className="tabular whitespace-nowrap px-3 py-2 text-right align-top font-semibold">
                    {formatCLP(g.netAmount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination
        pathname="/facturas/ventas/guias"
        params={searchParams}
        page={page}
        pageCount={pageCount}
        total={totals.count}
      />
    </div>
  );
}
