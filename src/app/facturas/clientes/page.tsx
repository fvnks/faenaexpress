import Link from "next/link";

import { FilterBar, type FilterField } from "@/components/filter-bar";
import { Pagination } from "@/components/pagination";
import { PartnerList } from "@/components/partner-list";
import { canWrite, requireContext } from "@/lib/auth";
import { PAGE_SIZE } from "@/lib/pagination";
import { listPartners } from "@/lib/partners";
import { cardClass, primaryButtonClass } from "@/lib/ui";

const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

type PageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function CustomersPage(props: PageProps) {
  const ctx = await requireContext("clientes");
  const searchParams = await props.searchParams;

  const q = one(searchParams.q);
  const activeRaw = one(searchParams.estado);
  const activo = activeRaw === "activos" ? true : activeRaw === "inactivos" ? false : undefined;
  const pagina = Number(one(searchParams.pagina) ?? 1);

  const writable = canWrite(ctx, "clientes");

  const { partners, page, pageCount, total } = await listPartners(ctx.company.id, "customers", {
    q,
    active: activo,
    page: pagina,
    pageSize: PAGE_SIZE,
  });

  const hasFilters = Boolean(q || activeRaw);

  // Volver a la misma lista (con filtros) tras navegar de página.
  const currentQuery = (() => {
    const query = new URLSearchParams();
    if (q) query.set("q", q);
    if (activeRaw) query.set("estado", activeRaw);
    return query;
  })();
  const returnTo = currentQuery.toString() ? `/facturas/clientes?${currentQuery}` : "/facturas/clientes";

  const filterFields: FilterField[] = [
    {
      kind: "text",
      name: "q",
      label: "Buscar",
      placeholder: "Nombre o RUT",
      grow: true,
    },
    {
      kind: "select",
      name: "estado",
      label: "Estado",
      emptyLabel: "Todos",
      width: "w-full sm:w-48",
      options: [
        { value: "activos", label: "Activos" },
        { value: "inactivos", label: "Inactivos" },
      ],
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clientes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            A quién le facturas y con quién registras las ventas.
          </p>
        </div>
        {writable ? (
          <Link href="/facturas/clientes/nuevo" className={primaryButtonClass}>
            Nuevo cliente
          </Link>
        ) : null}
      </div>

      <FilterBar fields={filterFields} showDateRange={false} />

      {partners.length === 0 ? (
        <div className={cardClass + " px-4 py-10 text-center"}>
          <p className="font-medium">
            {hasFilters ? "No hay clientes que coincidan con el filtro." : "Aún no registras clientes."}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {hasFilters
              ? "Prueba con otro nombre, RUT o estado."
              : "Agrega clientes para asociarlos a las ventas."}
          </p>
          {!hasFilters && writable ? (
            <Link
              href="/facturas/clientes/nuevo"
              className={primaryButtonClass + " mt-4 inline-block"}
            >
              Nuevo cliente
            </Link>
          ) : null}
        </div>
      ) : (
        <>
          <PartnerList
            partners={partners}
            basePath="/facturas/clientes"
            writable={writable}
            title="Clientes"
            subtitle="A quién le facturas y con quién registras las ventas."
            newLabel="Nuevo cliente"
            emptyTitle="Aún no registras clientes."
            emptyBody="Agrega clientes para asociarlos a las ventas."
          />
          <Pagination
            pathname="/facturas/clientes"
            params={searchParams}
            page={page}
            pageCount={pageCount}
            total={total}
          />
        </>
      )}
    </div>
  );
}
