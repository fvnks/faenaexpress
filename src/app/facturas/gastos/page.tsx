import Link from "next/link";

import { deleteExpense } from "@/app/actions/expenses";
import { ActionsDropdown } from "@/components/actions-dropdown";
import { DateRangeFilter } from "@/components/date-range-filter";
import { ReimbursementBadge } from "@/components/reimbursement-badge";
import { SelectDropdown } from "@/components/select-dropdown";
import { canWrite, requireContext } from "@/lib/auth";
import { listCategories, listPayers, listWorkers } from "@/lib/catalogs";
import { listExpenses, parseExpenseFilters } from "@/lib/expenses";
import { paymentMethodLabel } from "@/lib/labels";
import { formatCLP, formatDate } from "@/lib/money";
import { cardClass, controlClass, labelClass, primaryButtonClass, secondaryButtonClass } from "@/lib/ui";

const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
const fieldRow = "flex min-w-[9rem] flex-1 flex-col gap-1.5";

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
  };
  const filters = parseExpenseFilters(raw);

  const [{ items, totals }, categories, payers, workers] = await Promise.all([
    listExpenses(ctx.company.id, filters),
    listCategories(ctx.company.id),
    listPayers(ctx.company.id),
    listWorkers(ctx.company.id),
  ]);

  const hasFilters = Boolean(
    raw.q || raw.categoria || raw.pagador || raw.trabajador || raw.reembolso || raw.desde || raw.hasta,
  );
  const writable = canWrite(ctx, "gastos");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gastos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gastos de la empresa, con quién pagó cada uno y su reembolso.
          </p>
        </div>
        {writable ? (
          <div className="flex flex-wrap gap-2">
            <Link href="/facturas/importar" className={secondaryButtonClass}>
              Importar
            </Link>
            <Link href="/facturas/gastos/nueva" className={primaryButtonClass}>
              Nuevo gasto
            </Link>
          </div>
        ) : null}
      </div>

      <form method="get" className={cardClass + " flex flex-wrap items-end gap-3 p-4"}>
        <div className={fieldRow}>
          <label htmlFor="q" className={labelClass}>
            Buscar
          </label>
          <input
            id="q"
            name="q"
            defaultValue={raw.q ?? ""}
            placeholder="Descripción, N° documento, pagador…"
            className={controlClass}
          />
        </div>
        <div className={fieldRow + " sm:w-44"}>
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
        <div className={fieldRow + " sm:w-44"}>
          <label htmlFor="pagador" className={labelClass}>
            Pagador
          </label>
          <SelectDropdown
            id="pagador"
            name="pagador"
            value={raw.pagador ?? ""}
            emptyLabel="Todos"
            options={payers.map((payer) => ({ value: payer.id, label: payer.name }))}
          />
        </div>
        <div className={fieldRow + " sm:w-44"}>
          <label htmlFor="trabajador" className={labelClass}>
            Trabajador
          </label>
          <SelectDropdown
            id="trabajador"
            name="trabajador"
            value={raw.trabajador ?? ""}
            emptyLabel="Todos"
            options={workers.map((worker) => ({ value: worker.id, label: worker.name }))}
          />
        </div>
        <div className={fieldRow + " sm:w-44"}>
          <label htmlFor="reembolso" className={labelClass}>
            Reembolso
          </label>
          <SelectDropdown
            id="reembolso"
            name="reembolso"
            value={raw.reembolso ?? ""}
            emptyLabel="Todos"
            options={[
              { value: "si", label: "Reembolsados" },
              { value: "no", label: "Por reembolsar" },
            ]}
          />
        </div>
        <DateRangeFilter from={raw.desde} to={raw.hasta} />

        <div className="flex items-center gap-2">
          <button type="submit" className={primaryButtonClass}>
            Filtrar
          </button>
          {hasFilters ? (
            <Link href="/facturas/gastos" className={secondaryButtonClass}>
              Limpiar
            </Link>
          ) : null}
        </div>
      </form>

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
        <div className={cardClass + " overflow-x-auto"}>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-3 py-2 font-medium">Fecha</th>
                <th className="px-3 py-2 font-medium">Descripción</th>
                <th className="px-3 py-2 font-medium">Pagado por</th>
                <th className="px-3 py-2 text-right font-medium">Total</th>
                <th className="px-3 py-2 font-medium">Estado</th>
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
      )}
    </div>
  );
}