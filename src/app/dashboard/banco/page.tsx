import Link from "next/link";

import {
  conciliarMovimiento,
  conciliarSugerencias,
  eliminarCuenta,
  toggleMovimientoIgnorado,
} from "@/app/actions/banco";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { FilterBar, type FilterField } from "@/components/filter-bar";
import { Pagination } from "@/components/pagination";
import { canWrite, requireContext } from "@/lib/auth";
import {
  BANKS,
  bankName,
  BOARD_STATE_LABELS,
  loadReconciliationBoard,
  parseBoardFilters,
  type BoardBatch,
  type BoardFilters,
  type BoardState,
  type MovementReconciliation,
  type MovementWithMatch,
} from "@/lib/banco";
import { formatCLP, formatDate } from "@/lib/money";
import { cardClass, primaryButtonClass } from "@/lib/ui";

import { SyncForm } from "./sync-form";

// Movimientos de tarjeta: lo facturado es deuda del titular, no un cobro de
// la empresa; se etiquetan para que no se confundan con la cuenta corriente.
const SOURCE_LABELS: Record<string, string> = {
  account: "",
  credit_card_unbilled: "TC por facturar",
  credit_card_billed: "TC facturada",
};

const ESTADOS: BoardState[] = ["pendientes", "sugeridos", "sin_sugerencia", "ignorados", "conciliados"];

const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/** Filtros ocultos: la acción de lote se recalcula con la misma vista. */
function FilterInputs({ filters }: { filters: BoardFilters }) {
  const pairs: Array<[string, string]> = [
    ["estado", filters.estado],
    ["q", filters.q],
    ["desde", filters.desde],
    ["hasta", filters.hasta],
    ["montoMin", filters.montoMin],
    ["montoMax", filters.montoMax],
  ];
  return (
    <>
      {pairs
        .filter(([, value]) => value !== "")
        .map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
    </>
  );
}

function Amount({ amount }: { amount: number }) {
  const inflow = amount > 0;
  return (
    <span className={"tabular whitespace-nowrap font-medium " + (inflow ? "text-success" : "text-foreground")}>
      {inflow ? "+" : "−"}
      {formatCLP(Math.abs(amount))}
    </span>
  );
}

/** Sugerencias de conciliación. La misma pieza sirve en la tabla y en el destacado. */
function SuggestionForms({ movement, returnTo }: { movement: MovementWithMatch; returnTo: string }) {
  if (movement.suggestions.length === 0) {
    return (
      <span className="text-xs text-muted-foreground">
        {movement.amount > 0 ? "Sin ventas por cobrar con ese monto" : "Sin compras por pagar con ese monto"}
      </span>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      {movement.suggestions.map((suggestion) => (
        <form key={suggestion.targetId} action={conciliarMovimiento} className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="movementId" value={movement.id} />
          <input type="hidden" name="targetType" value={suggestion.targetType} />
          <input type="hidden" name="targetId" value={suggestion.targetId} />
          <input type="hidden" name="returnTo" value={returnTo} />
          <button
            type="submit"
            className="rounded-control border border-primary bg-primary-soft px-2 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
            title={
              suggestion.daysDiff >= 0
                ? `Factura del ${formatDate(suggestion.date)} (${suggestion.daysDiff} días después del depósito)`
                : `Factura del ${formatDate(suggestion.date)} (${Math.abs(suggestion.daysDiff)} días antes del movimiento)`
            }
          >
            {suggestion.targetType === "sale" ? "Cobrar" : "Pagar"}{" "}
            {suggestion.folio !== "sin folio" ? `N° ${suggestion.folio}` : suggestion.folio} · {suggestion.partner}
          </button>
        </form>
      ))}
    </div>
  );
}

function IgnoreForm({ movement, returnTo }: { movement: MovementWithMatch; returnTo: string }) {
  return (
    <form action={toggleMovimientoIgnorado}>
      <input type="hidden" name="movementId" value={movement.id} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <button type="submit" className="text-xs text-muted-foreground transition-colors hover:text-foreground">
        {movement.ignoredAt ? "Restituir" : "Ignorar"}
      </button>
    </form>
  );
}

function ReconciliationBlock({ reconciliation }: { reconciliation: MovementReconciliation }) {
  const isPurchase = reconciliation.purchaseId !== null;
  const href = isPurchase
    ? `/dashboard/compras/${reconciliation.purchaseId}`
    : `/dashboard/ventas/${reconciliation.saleId}`;
  const folio = reconciliation.purchaseFolio ?? reconciliation.saleFolio;

  return (
    <div className="text-sm">
      <p className="font-medium">
        {isPurchase ? "Compra" : "Venta"}
        {folio ? ` N° ${folio}` : " sin folio"}
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        {reconciliation.partner} · conciliado el {formatDate(reconciliation.createdAt)}
      </p>
      <Link
        href={href}
        className="mt-1 inline-block text-xs font-medium text-primary underline-offset-2 hover:underline"
      >
        Ver documento
      </Link>
    </div>
  );
}

/** Texto del diálogo de confirmación del lote: qué va a pasar, con montos. */
function batchDescription(batch: BoardBatch, scoped: boolean): string {
  const parts: string[] = [];
  if (batch.purchases.count > 0) {
    parts.push(
      `${batch.purchases.count} ${batch.purchases.count === 1 ? "compra" : "compras"} por ${formatCLP(batch.purchases.total)}`,
    );
  }
  if (batch.sales.count > 0) {
    parts.push(
      `${batch.sales.count} ${batch.sales.count === 1 ? "venta" : "ventas"} por ${formatCLP(batch.sales.total)}`,
    );
  }

  return (
    `Se marcarán ${parts.join(" y ")} como pagadas o cobradas, con la fecha de cada movimiento.` +
    (scoped ? " Se respetan los filtros activos." : "") +
    " Solo entran movimientos cuyo monto calza exacto con un único documento."
  );
}

export default async function BancoPage(props: PageProps<"/dashboard/banco">) {
  const ctx = await requireContext("banco");
  const searchParams = await props.searchParams;

  const filters = parseBoardFilters({
    estado: one(searchParams.estado),
    q: one(searchParams.q),
    desde: one(searchParams.desde),
    hasta: one(searchParams.hasta),
    montoMin: one(searchParams.montoMin),
    montoMax: one(searchParams.montoMax),
    movimiento: one(searchParams.movimiento),
    pagina: one(searchParams.pagina),
  });

  const board = await loadReconciliationBoard(ctx.company.id, filters);
  const writable = canWrite(ctx, "banco");

  // Volver a la misma vista (filtros incluidos) tras una acción.
  const currentQuery = (() => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams)) {
      if (Array.isArray(value)) value.forEach((item) => query.append(key, item));
      else if (value != null) query.append(key, value);
    }
    return query;
  })();
  const returnTo = currentQuery.toString() ? `/dashboard/banco?${currentQuery}` : "/dashboard/banco";

  const hasFilters = Boolean(
    filters.q ||
      filters.desde ||
      filters.hasta ||
      filters.montoMin ||
      filters.montoMax ||
      filters.estado !== "pendientes",
  );
  // El historial no se concilia: ahí no hay lote ni sugerencias que ofrecer.
  const pendingView = filters.estado !== "conciliados" && filters.estado !== "ignorados";
  const showHistory = filters.estado === "conciliados";
  const showBatch = writable && pendingView && board.batch.matches.length > 0;

  const filterFields: FilterField[] = [
    { kind: "text", name: "q", label: "Buscar", placeholder: "Glosa del movimiento", grow: true },
    {
      kind: "text",
      name: "montoMin",
      label: "Monto desde",
      placeholder: "379.972",
      width: "w-full sm:w-36",
    },
    {
      kind: "text",
      name: "montoMax",
      label: "Monto hasta",
      placeholder: "1.500.000",
      width: "w-full sm:w-36",
    },
    {
      kind: "select",
      name: "estado",
      label: "Estado",
      emptyLabel: BOARD_STATE_LABELS.pendientes,
      width: "w-full sm:w-52",
      options: ESTADOS.map((estado) => ({ value: estado, label: BOARD_STATE_LABELS[estado] })),
    },
  ];

  const highlight = board.highlight;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Banco</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Conciliación: importa los movimientos del banco y márcalos como el pago o cobro
          de una factura.
        </p>
      </div>

      {highlight ? (
        <section className={cardClass + " border-primary/40 p-4"}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Movimiento bancario
              </p>
              <p className="mt-1 break-words font-medium">{highlight.description}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {formatDate(highlight.date)} · {bankName(highlight.bankId)}
                {highlight.accountLabel ? ` · ${highlight.accountLabel}` : ""}
                {SOURCE_LABELS[highlight.source] ? ` · ${SOURCE_LABELS[highlight.source]}` : ""}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className="text-lg">
                <Amount amount={highlight.amount} />
              </span>
              <Link
                href="/dashboard/banco"
                className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
              >
                Ver toda la bandeja
              </Link>
            </div>
          </div>

          {highlight.reconciliation ? (
            <div className="mt-3 rounded-control bg-success-soft/60 px-3 py-2">
              <p className="text-sm font-medium text-foreground">Ya está conciliado</p>
              <div className="mt-1">
                <ReconciliationBlock reconciliation={highlight.reconciliation} />
              </div>
            </div>
          ) : (
            <div className="mt-3 border-t border-border pt-3">
              <SuggestionForms movement={highlight} returnTo={returnTo} />
              {writable ? (
                <div className="mt-2">
                  <IgnoreForm movement={highlight} returnTo={returnTo} />
                </div>
              ) : null}
            </div>
          )}
        </section>
      ) : null}

      {writable ? (
        <section className={cardClass + " p-4"}>
          <h2 className="text-base font-semibold">Sincronizar movimientos</h2>
          <p className="mb-3 mt-0.5 text-sm text-muted-foreground">
            Usa las mismas credenciales del portal del banco. El scraper es el proyecto
            open source <span className="font-medium text-foreground">open-banking-chile</span>.
          </p>
          <SyncForm banks={BANKS} />
        </section>
      ) : null}

      {board.accounts.length > 0 ? (
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {board.accounts.map((account) => (
            <div key={account.id} className={cardClass + " flex flex-col gap-1 p-4"}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{account.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {bankName(account.bankId)}
                    {account.kind === "credit_card" ? " · tarjeta" : ""}
                  </p>
                </div>
                {writable ? (
                  <form action={eliminarCuenta}>
                    <input type="hidden" name="id" value={account.id} />
                    <ConfirmSubmit
                      title="Eliminar cuenta"
                      description={`Se borrarán los movimientos de "${account.label}" y sus conciliaciones. Los documentos ya pagados no cambian de estado.`}
                      confirmLabel="Eliminar"
                      className="shrink-0 text-xs text-muted-foreground hover:text-danger"
                    >
                      Eliminar
                    </ConfirmSubmit>
                  </form>
                ) : null}
              </div>
              <p className="tabular mt-1 text-lg font-semibold">
                {account.balance === null ? "Sin saldo" : formatCLP(account.balance)}
              </p>
              <p className="text-xs text-muted-foreground">
                {account.movements} movimientos
                {account.lastSyncAt ? ` · última sync ${formatDate(account.lastSyncAt)}` : ""}
              </p>
            </div>
          ))}
        </section>
      ) : null}

      <section className={cardClass}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div>
            <h2 className="text-base font-semibold">Movimientos por conciliar</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {board.totals.unlinked} sin conciliar · {board.totals.linked} conciliados ·{" "}
              {board.totals.ignored} ignorados
            </p>
          </div>
          {showBatch ? (
            <form action={conciliarSugerencias}>
              <input type="hidden" name="returnTo" value={returnTo} />
              <FilterInputs filters={filters} />
              <ConfirmSubmit
                title="Conciliar coincidencias únicas"
                description={batchDescription(board.batch, hasFilters)}
                confirmLabel={`Conciliar ${board.batch.matches.length}`}
                confirmClassName={primaryButtonClass}
                className={primaryButtonClass}
              >
                Conciliar coincidencias únicas ({board.batch.matches.length})
              </ConfirmSubmit>
            </form>
          ) : null}
        </div>

        <FilterBar fields={filterFields} />

        {board.movements.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <p className="text-sm font-medium">
              {hasFilters
                ? "No hay movimientos en esta vista."
                : board.accounts.length === 0
                  ? "Sin movimientos"
                  : "Todo al día"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {hasFilters
                ? "Prueba con otro estado, monto o rango de fechas."
                : board.accounts.length === 0
                  ? "Sincroniza un banco para traer los movimientos y empezar a conciliar."
                  : "No hay movimientos pendientes: sincroniza de nuevo para traer los últimos."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[54rem] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-2 font-medium">Fecha</th>
                  <th className="px-4 py-2 font-medium">Descripción</th>
                  <th className="px-4 py-2 text-right font-medium">Monto</th>
                  <th className="px-4 py-2 font-medium">
                    {showHistory ? "Documento conciliado" : "Conciliación sugerida"}
                  </th>
                  <th className="px-4 py-2 font-medium sr-only">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {board.movements.map((movement) => {
                  const sourceLabel = SOURCE_LABELS[movement.source] ?? "";
                  const marked = movement.id === filters.movimiento;
                  return (
                    <tr
                      key={movement.id}
                      className={
                        "border-b border-border align-top last:border-0" +
                        (marked ? " bg-primary-soft/30" : "")
                      }
                    >
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                        {formatDate(movement.date)}
                      </td>
                      <td className="max-w-[22rem] px-4 py-3">
                        <p className="truncate" title={movement.description}>
                          {movement.description}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {movement.accountLabel}
                          {sourceLabel ? ` · ${sourceLabel}` : ""}
                          {movement.balance !== null ? ` · saldo ${formatCLP(movement.balance)}` : ""}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Amount amount={movement.amount} />
                      </td>
                      <td className="px-4 py-3">
                        {movement.reconciliation ? (
                          <ReconciliationBlock reconciliation={movement.reconciliation} />
                        ) : (
                          <SuggestionForms movement={movement} returnTo={returnTo} />
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        {writable && !movement.reconciliation ? (
                          <IgnoreForm movement={movement} returnTo={returnTo} />
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="px-4 py-3">
          <Pagination
            pathname="/dashboard/banco"
            params={searchParams}
            page={board.totals.page}
            pageCount={board.totals.pageCount}
            total={board.totals.filtered}
          />
        </div>
      </section>

      {board.lastSyncs.length > 0 ? (
        <section className={cardClass + " px-4 py-3"}>
          <h2 className="text-sm font-semibold">Últimas sincronizaciones</h2>
          <ul className="mt-2 flex flex-col gap-1">
            {board.lastSyncs.map((sync) => (
              <li key={sync.id} className="flex flex-wrap items-baseline gap-x-2 text-xs text-muted-foreground">
                <span className={sync.status === "success" ? "font-medium text-success" : sync.status === "error" ? "font-medium text-danger" : "font-medium"}>
                  {bankName(sync.bankId)}
                </span>
                <span>{formatDate(sync.startedAt)}</span>
                <span>
                  {sync.status === "success"
                    ? `${sync.imported} nuevos`
                    : sync.status === "running"
                      ? "en curso…"
                      : (sync.message ?? "error")}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
