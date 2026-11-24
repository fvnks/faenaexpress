import Link from "next/link";

import { listSavedViews } from "@/app/actions/saved-views";
import { deleteExpense } from "@/app/actions/expenses";
import { ActionsDropdown } from "@/components/actions-dropdown";
import { FilterBar, type FilterField } from "@/components/filter-bar";
import { Pagination } from "@/components/pagination";
import { ReimbursementBadge } from "@/components/reimbursement-badge";
import { SavedViewsMenu } from "@/components/saved-views-menu";
import { SortableHeader } from "@/components/sortable-header";
import { canWrite, requireContext } from "@/lib/auth";
import { listCategories, listPayers, listWorkers } from "@/lib/catalogs";
import { listExpenses, parseExpenseFilters } from "@/lib/expenses";
import { paymentMethodLabel } from "@/lib/labels";
import { formatCLP, formatDate } from "@/lib/money";
import { parseSortDir, sortHref } from "@/lib/sort";
import { cardClass, primaryButtonClass, secondaryButtonClass } from "@/lib/ui";

const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export default async function ExpensesPage(props: PageProps<"/facturas/gastos">) {
  const ctx = await requireContext("gastos");
  const searchParams = await props.searchParams;

  const raw = {
    q: one(searchParams.q),
    categoria: one(searchParams.categoria),
    pagador: one(searchParams.pagador),
    trabajador: one(searchParams.trabajador),
    reembolso: one(searchParams.reembolso),
    desde: one(searchParams.desde),
    hasta: one(searchParams.hasta),
    orden: one(searchParams.orden),
    dir: one(searchParams.dir),
    pagina: one(searchParams.pagina),
  };
  const filters = parseExpenseFilters(raw);
  const sortKey = raw.orden ?? "fecha";
  const sortDir = parseSortDir(raw.dir ?? "desc");
  const fechaSort = sortHref("/facturas/gastos", searchParams, "fecha", sortKey, sortDir);
  const descSort = sortHref("/facturas/gastos", searchParams, "descripcion", sortKey, sortDir);
  const pagadorSort = sortHref("/facturas/gastos", searchParams, "pagador", sortKey, sortDir);
  const reembolsoSort = sortHref("/facturas/gastos", searchParams, "reembolso", sortKey, sortDir);
  const totalSort = sortHref("/facturas/gastos", searchParams, "total", sortKey, sortDir);

  const [{ items, totals, page, pageCount }, categories, payers, workers, savedViews] = await Promise.all([
    listExpenses(ctx.company.id, filters),
    listCategories(ctx.company.id),
    listPayers(ctx.company.id),
    listWorkers(ctx.company.id),
    listSavedViews("gastos"),
  ]);

  const hasFilters = Boolean(
    raw.q || raw.categoria || raw.pagador || raw.trabajador || raw.reembolso || raw.desde || raw.hasta,
  );
  const writable = canWrite(ctx, "gastos");

  // CSV de toda la lista filtrada (no solo la página actual).
  const exportQuery = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (key === "pagina") continue;
    if (Array.isArray(value)) value.forEach((item) => exportQuery.append(key, item));
    else if (value != null && value !== "") exportQuery.set(key, value);
  }
  const exportHref = exportQuery.toString()
    ? `/facturas/gastos/export?${exportQuery}`
    : "/facturas/gastos/export";

  const filterFields: FilterField[] = [
    { kind: "text", name: "q", label: "Buscar", placeholder: "Descripción, N° documento, pagador…", grow: true },
    {
      kind: "select",
      name: "categoria",
      label: "Categoría",
      emptyLabel: "Todas",
      width: "w-full sm:w-44",
      options: categories.map((category) => ({ value: category.id, label: category.name })),
    },
    {
      kind: "select",
      name: "pagador",
      label: "Pagador",
      emptyLabel: "Todos",
      width: "w-full sm:w-44",
      options: payers.map((payer) => ({ value: payer.id, label: payer.name })),
    },
    {
      kind: "select",
      name: "trabajador",
      label: "Trabajador",
      emptyLabel: "Todos",
      width: "w-full sm:w-44",
      options: workers.map((worker) => ({ value: worker.id, label: worker.name })),
    },
    {
      kind: "select",
      name: "reembolso",
      label: "Reembolso",
      emptyLabel: "Todos",
      width: "w-full sm:w-44",
      options: [
        { value: "si", label: "Reembolsados" },
        { value: "no", label: "Por reembolsar" },
      ],
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gastos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gastos de la empresa, con quién pagó cada uno y su reembolso.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {totals.count > 0 ? (
            <Link href={exportHref} className={secondaryButtonClass}>Exportar CSV</Link>
          ) : null}
          {writable ? (
            <>
              <Link href="/facturas/importar" className={secondaryButtonClass}>Importar</Link>
              <Link href="/facturas/gastos/nueva" className={primaryButtonClass}>Nuevo gasto</Link>
            </>
          ) : null}
        </div>
      </div>

      <FilterBar
        fields={filterFields}
        leading={<SavedViewsMenu section="gastos" views={savedViews} canSave={writable} />}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <div className={cardClass + " p-4"}>
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-primary" aria-hidden="true">
              <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
              <path d="M8 7h8" /><path d="M8 11h8" /><path d="M8 15h5" />
            </svg>
            <p className="text-xs text-muted-foreground">Total de gastos (filtro)</p>
          </div>
          <p className="tabular mt-1 text-2xl font-bold">{formatCLP(totals.total)}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {totals.count} {totals.count === 1 ? "gasto" : "gastos"}
          </p>
        </div>
        <div className={cardClass + " p-4"}>
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-success" aria-hidden="true">
              <path d="M20 6L9 17l-5-5" />
            </svg>
            <p className="text-xs text-muted-foreground">Reembolsado</p>
          </div>
          <p className="tabular mt-1 text-2xl font-bold text-success">{formatCLP(totals.reimbursed)}</p>
        </div>
        <div className={cardClass + " p-4"}>
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-accent" aria-hidden="true">
              <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
            </svg>
            <p className="text-xs text-muted-foreground">Por reembolsar</p>
          </div>
          <p className="tabular mt-1 text-2xl font-bold text-accent">{formatCLP(totals.pending)}</p>
        </div>
      </div>

      {items.length === 0 ? (
        <div className={cardClass + " px-4 py-10 text-center"}>
          <p className="font-medium">
            {hasFilters ? "No hay gastos que coincidan con el filtro." : "Aún no registras gastos."}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {hasFilters
              ? "Prueba con otro filtro o búsqueda."
              : "Registra el primer gasto de la empresa."}
          </p>
          {!hasFilters && writable ? (
            <Link href="/facturas/gastos/nueva" className={primaryButtonClass + " mt-4 inline-block"}>
              Nuevo gasto
            </Link>
          ) : null}
        </div>
      ) : (
        <>
          <div className={cardClass + " overflow-x-auto"}>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <SortableHeader label="Fecha" href={fechaSort.href} active={fechaSort.active} dir={fechaSort.dir} />
                  <SortableHeader label="Descripción" href={descSort.href} active={descSort.active} dir={descSort.dir} />
                  <SortableHeader label="Pagado por" href={pagadorSort.href} active={pagadorSort.active} dir={pagadorSort.dir} />
                  <SortableHeader label="Total" href={totalSort.href} active={totalSort.active} dir={totalSort.dir} align="right" />
                  <SortableHeader label="Estado" href={reembolsoSort.href} active={reembolsoSort.active} dir={reembolsoSort.dir} />
                  {writable ? <th className="w-12 px-2 py-2" /> : null}
                </tr>
              </thead>
              <tbody>
                {items.map((expense) => (
                  <tr key={expense.id} className="border-b border-border last:border-0 hover:bg-primary-soft/30 transition-colors">
                    <td className="tabular whitespace-nowrap px-3 py-2 align-top">{formatDate(expense.date)}</td>
                    <td className="min-w-0 max-w-[16rem] px-3 py-2 align-top">
                      <Link
                        href={`/facturas/gastos/${expense.id}`}
                        className="block truncate font-medium text-foreground underline-offset-2 hover:underline"
                      >
                        {expense.description}
                      </Link>
                      <span className="block truncate text-xs text-muted-foreground">
                        {[
                          expense.category?.name,
                          expense.area?.name,
                          expense.documentNumber,
                          expense.worker?.name,
                        ]
                          .filter(Boolean)
                          .join(" · ") || "—"}
                      </span>
                    </td>
                    <td className="px-3 py-2 align-top">
                      <span className="block text-sm">{expense.paidBy.name}</span>
                      <span className="block text-xs text-muted-foreground">
                        {paymentMethodLabel(expense.paymentMethod)}
                      </span>
                    </td>
                    <td className="tabular whitespace-nowrap px-3 py-2 text-right align-top font-semibold">
                      {formatCLP(expense.totalAmount)}
                    </td>
                    <td className="px-3 py-2 align-top">
                      <ReimbursementBadge reimbursed={expense.reimbursed} />
                      {expense.reimbursedAt ? (
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {formatDate(expense.reimbursedAt)}
                        </span>
                      ) : null}
                    </td>
                    {writable ? (
                      <td className="px-2 py-2 align-top text-right">
                        <ActionsDropdown
                          editHref={`/facturas/gastos/${expense.id}/editar`}
                          deleteAction={deleteExpense}
                          deleteId={expense.id}
                          deleteMessage="¿Eliminar este gasto? Esta acción no se puede deshacer."
                        />
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            pathname="/facturas/gastos"
            params={searchParams}
            page={page}
            pageCount={pageCount}
            total={totals.count}
          />
        </>
      )}
    </div>
  );
}
