import Link from "next/link";

import {
  conciliarMovimiento,
  conciliarSugerencias,
  deshacerConciliacion,
  eliminarCuenta,
  marcarTraspasosInternos,
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
  looksLikeAccountTransfer,
  MOVEMENT_MARK_LABELS,
  parseBoardFilters,
  type BoardBatch,
  type BoardFilters,
  type BoardState,
  type MovementReconciliation,
  type MovementWithMatch,
} from "@/lib/banco";
import { formatCLP, formatDate } from "@/lib/money";
import { cardClass, primaryButtonClass, secondaryButtonClass } from "@/lib/ui";

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

/** Distancia entre el documento y el movimiento, en palabras. */
function distanceLabel(daysDiff: number): string {
  if (daysDiff === 0) return "el mismo día";
  return daysDiff > 0
    ? `${daysDiff} días antes del movimiento`
    : `${Math.abs(daysDiff)} días después del movimiento`;
}

function suggestionLabel(suggestion: MovementWithMatch["suggestions"][number]): string {
  if (suggestion.targetType === "expense") return `Pagar gasto · ${suggestion.partner}`;
  const folio = suggestion.folio !== "sin folio" ? `N° ${suggestion.folio}` : suggestion.folio;
  return `${suggestion.targetType === "sale" ? "Cobrar" : "Pagar"} ${folio} · ${suggestion.partner}`;
}

/** Sugerencias de conciliación. La misma pieza sirve en la tabla y en el destacado. */
function SuggestionForms({ movement, returnTo }: { movement: MovementWithMatch; returnTo: string }) {
  if (movement.suggestions.length === 0) {
    return (
      <span className="text-xs text-muted-foreground">
        {looksLikeAccountTransfer(movement.description)
          ? "Parece un traspaso entre cuentas propias"
          : movement.amount > 0
            ? "Sin ventas por cobrar con ese monto"
            : "Sin compras ni gastos pendientes con ese monto"}
      </span>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      {movement.suggestions.map((suggestion) => (
        <form
          key={`${suggestion.targetType}-${suggestion.targetId}`}
          action={conciliarMovimiento}
          className="flex flex-wrap items-center gap-2"
        >
          <input type="hidden" name="movementId" value={movement.id} />
          <input type="hidden" name="targetType" value={suggestion.targetType} />
          <input type="hidden" name="targetId" value={suggestion.targetId} />
          <input type="hidden" name="returnTo" value={returnTo} />
          <button
            type="submit"
            className="rounded-control border border-primary bg-primary-soft px-2 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
            title={`${suggestion.targetType === "expense" ? "Gasto" : "Factura"} del ${formatDate(suggestion.date)} (${distanceLabel(suggestion.daysDiff)})`}
          >
            {suggestionLabel(suggestion)}
          </button>
        </form>
      ))}
    </div>
  );
}

/**
 * Gasto nuevo a partir de un cargo: la glosa, la fecha y el monto viajan al
 * formulario de gastos, y al guardar se vuelve acá con el movimiento destacado,
 * donde el gasto recién creado aparece como sugerencia para conciliarlo.
 */
function newExpenseHref(movement: MovementWithMatch, returnTo: string): string {
  const [path, search] = returnTo.split("?");
  const back = new URLSearchParams(search ?? "");
  back.set("movimiento", movement.id);

  const query = new URLSearchParams({
    descripcion: movement.description,
    fecha: movement.date.toISOString().slice(0, 10),
    monto: String(Math.abs(movement.amount)),
    // Los movimientos de tarjeta vienen marcados con su origen: el gasto nace
    // con el mismo medio de pago.
    pago: movement.source.startsWith("credit_card") ? "CREDIT_CARD" : "TRANSFER",
    volver: `${path}?${back.toString()}`,
  });
  return `/facturas/gastos/nueva?${query.toString()}`;
}

/**
 * Qué hacer con un movimiento que no va a conciliarse: un traspaso entre
 * cuentas propias (no es cobro ni pago) o un descarte. Si ya está marcado, se
 * muestra el motivo y se ofrece restituirlo.
 *
 * En un cargo también se ofrece registrar el gasto: la mitad de los cargos de
 * una cuenta personal son gastos de la empresa que todavía no están en la
 * aplicación.
 */
function MovementActions({
  movement,
  returnTo,
  newExpenseHref,
  align = "end",
}: {
  movement: MovementWithMatch;
  returnTo: string;
  newExpenseHref?: string | null;
  align?: "start" | "end";
}) {
  const hidden = (
    <>
      <input type="hidden" name="movementId" value={movement.id} />
      <input type="hidden" name="returnTo" value={returnTo} />
    </>
  );
  const column = `flex flex-col ${align === "end" ? "items-end" : "items-start"} gap-1`;

  if (movement.ignoredAt) {
    return (
      <div className={column}>
        <span className="text-xs text-muted-foreground">
          {movement.ignoredReason ? MOVEMENT_MARK_LABELS[movement.ignoredReason] : "Ignorado"}
        </span>
        <form action={toggleMovimientoIgnorado}>
          {hidden}
          <button type="submit" className="text-xs text-muted-foreground transition-colors hover:text-foreground">
            Restituir
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className={column}>
      {newExpenseHref ? (
        <Link
          href={newExpenseHref}
          className="text-xs font-medium text-primary underline-offset-2 hover:underline"
        >
          Nuevo gasto
        </Link>
      ) : null}
      <form action={toggleMovimientoIgnorado}>
        {hidden}
        <input type="hidden" name="marca" value="internal_transfer" />
        <button type="submit" className="text-xs text-muted-foreground transition-colors hover:text-foreground">
          Traspaso interno
        </button>
      </form>
      <form action={toggleMovimientoIgnorado}>
        {hidden}
        <button type="submit" className="text-xs text-muted-foreground transition-colors hover:text-foreground">
          Ignorar
        </button>
      </form>
    </div>
  );
}

function ReconciliationBlock({
  reconciliation,
  movementId,
  returnTo,
  canUndo,
}: {
  reconciliation: MovementReconciliation;
  movementId: string;
  returnTo: string;
  canUndo: boolean;
}) {
  const isExpense = reconciliation.expenseId !== null;
  const isPurchase = !isExpense && reconciliation.purchaseId !== null;
  const href = isExpense
    ? `/facturas/gastos/${reconciliation.expenseId}`
    : isPurchase
      ? `/facturas/compras/${reconciliation.purchaseId}`
      : `/facturas/ventas/${reconciliation.saleId}`;
  const folio = reconciliation.purchaseFolio ?? reconciliation.saleFolio;

  return (
    <div className="text-sm">
      <p className="font-medium">
        {isExpense ? "Gasto" : isPurchase ? "Compra" : "Venta"}
        {isExpense
          ? ` «${reconciliation.expenseDescription}»`
          : folio
            ? ` N° ${folio}`
            : " sin folio"}
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        {reconciliation.partner}
        {isExpense ? " · reembolsado" : ""} · conciliado el {formatDate(reconciliation.createdAt)}
      </p>
      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
        <Link
          href={href}
          className="text-xs font-medium text-primary underline-offset-2 hover:underline"
        >
          Ver documento
        </Link>
        {canUndo ? (
          <form action={deshacerConciliacion}>
            <input type="hidden" name="movementId" value={movementId} />
            <input type="hidden" name="returnTo" value={returnTo} />
            <ConfirmSubmit
              title="Deshacer conciliación"
              description={
                isExpense
                  ? "Se borra el vínculo y el gasto vuelve a estar pendiente de reembolso."
                  : isPurchase
                    ? "Se borra el vínculo y la compra vuelve a estar pendiente."
                    : "Se borra el vínculo y la venta vuelve a estar pendiente, salvo que esté cobrada por Confirming."
              }
              confirmLabel="Deshacer"
              className="text-xs text-muted-foreground transition-colors hover:text-danger"
            >
              Deshacer
            </ConfirmSubmit>
          </form>
        ) : null}
      </div>
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

/** Texto del diálogo de los traspasos: la regla, para que no sorprenda. */
function internalTransferDescription(count: number, scoped: boolean): string {
  return (
    `Se marcarán ${count} ${count === 1 ? "movimiento" : "movimientos"} como traspasos entre cuentas propias: la glosa nombra una cuenta y el mismo monto aparece con el signo opuesto a pocos días.` +
    (scoped ? " Se respetan los filtros activos." : "") +
    " Salen de la bandeja y se pueden restituir."
  );
}

export default async function BancoPage(props: PageProps<"/facturas/banco">) {
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
  // Registrar el gasto es cosa del módulo de gastos: sin permiso ahí, el enlace
  // solo llevaría a una página que devuelve.
  const canAddExpense = canWrite(ctx, "gastos");

  // Volver a la misma vista (filtros incluidos) tras una acción.
  const currentQuery = (() => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams)) {
      if (Array.isArray(value)) value.forEach((item) => query.append(key, item));
      else if (value != null) query.append(key, value);
    }
    return query;
  })();
  const returnTo = currentQuery.toString() ? `/facturas/banco?${currentQuery}` : "/facturas/banco";

  /** Enlace para registrar el gasto de un cargo (solo si puede registrar gastos). */
  const expenseHrefFor = (movement: MovementWithMatch) =>
    canAddExpense && movement.amount < 0 ? newExpenseHref(movement, returnTo) : null;

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
  const showInternalTransfers = writable && pendingView && board.internalTransfers.length > 0;

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
        <h1 className="text-2xl font-bold tracking-tight">Conciliación bancaria</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Conciliación: importa los movimientos del banco y márcalos como el pago o cobro
          de una factura, o como el reembolso de un gasto.
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
                href="/facturas/banco"
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
                <ReconciliationBlock
                  reconciliation={highlight.reconciliation}
                  movementId={highlight.id}
                  returnTo={returnTo}
                  canUndo={writable}
                />
              </div>
            </div>
          ) : (
            <div className="mt-3 border-t border-border pt-3">
              <SuggestionForms movement={highlight} returnTo={returnTo} />
              {writable ? (
                <div className="mt-2">
                  <MovementActions
                    movement={highlight}
                    returnTo={returnTo}
                    newExpenseHref={expenseHrefFor(highlight)}
                    align="start"
                  />
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
          <div className="flex flex-wrap items-center justify-end gap-2">
            {showInternalTransfers ? (
              <form action={marcarTraspasosInternos}>
                <input type="hidden" name="returnTo" value={returnTo} />
                <FilterInputs filters={filters} />
                <ConfirmSubmit
                  title="Marcar traspasos internos"
                  description={internalTransferDescription(board.internalTransfers.length, hasFilters)}
                  confirmLabel={`Marcar ${board.internalTransfers.length}`}
                  className={secondaryButtonClass}
                >
                  Traspasos internos ({board.internalTransfers.length})
                </ConfirmSubmit>
              </form>
            ) : null}
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
                          <ReconciliationBlock
                            reconciliation={movement.reconciliation}
                            movementId={movement.id}
                            returnTo={returnTo}
                            canUndo={writable}
                          />
                        ) : (
                          <SuggestionForms movement={movement} returnTo={returnTo} />
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        {writable && !movement.reconciliation ? (
                          <MovementActions
                            movement={movement}
                            returnTo={returnTo}
                            newExpenseHref={expenseHrefFor(movement)}
                          />
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
            pathname="/facturas/banco"
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
