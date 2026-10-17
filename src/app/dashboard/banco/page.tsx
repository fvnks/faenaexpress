import { eliminarCuenta, conciliarMovimiento, toggleMovimientoIgnorado } from "@/app/actions/banco";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { BANKS, bankName, loadReconciliationBoard } from "@/lib/banco";
import { requireContext } from "@/lib/auth";
import { formatCLP, formatDate } from "@/lib/money";
import { cardClass } from "@/lib/ui";

import { SyncForm } from "./sync-form";

// Movimientos de tarjeta: lo facturado es deuda del titular, no un cobro de
// la empresa; se etiquetan para que no se confundan con la cuenta corriente.
const SOURCE_LABELS: Record<string, string> = {
  account: "",
  credit_card_unbilled: "TC por facturar",
  credit_card_billed: "TC facturada",
};

export default async function BancoPage() {
  const ctx = await requireContext("banco");
  const board = await loadReconciliationBoard(ctx.company.id);
  const writable = ctx.role === "ADMIN" || ctx.role === "ACCOUNTANT";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Banco</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Conciliación: importa los movimientos del banco y márcalos como el pago o cobro
          de una factura.
        </p>
      </div>

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
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border px-4 py-3">
          <h2 className="text-base font-semibold">Movimientos por conciliar</h2>
          <p className="text-xs text-muted-foreground">
            {board.totals.unlinked} sin conciliar · {board.totals.linked} conciliados ·{" "}
            {board.totals.ignored} ignorados
          </p>
        </div>

        {board.movements.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <p className="text-sm font-medium">Todo al día</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {board.accounts.length === 0
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
                  <th className="px-4 py-2 font-medium">Conciliación sugerida</th>
                  <th className="px-4 py-2 font-medium sr-only">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {board.movements.map((movement) => {
                  const sourceLabel = SOURCE_LABELS[movement.source] ?? "";
                  const inflow = movement.amount > 0;
                  return (
                    <tr key={movement.id} className="border-b border-border last:border-0 align-top">
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
                      <td
                        className={
                          "tabular whitespace-nowrap px-4 py-3 text-right font-medium " +
                          (inflow ? "text-success" : "text-foreground")
                        }
                      >
                        {inflow ? "+" : "−"}
                        {formatCLP(Math.abs(movement.amount))}
                      </td>
                      <td className="px-4 py-3">
                        {movement.suggestions.length === 0 ? (
                          <span className="text-xs text-muted-foreground">
                            {inflow ? "Sin ventas por cobrar con ese monto" : "Sin compras por pagar con ese monto"}
                          </span>
                        ) : (
                          <div className="flex flex-col gap-1.5">
                            {movement.suggestions.map((suggestion) => (
                              <form
                                key={suggestion.targetId}
                                action={conciliarMovimiento}
                                className="flex flex-wrap items-center gap-2"
                              >
                                <input type="hidden" name="movementId" value={movement.id} />
                                <input type="hidden" name="targetType" value={suggestion.targetType} />
                                <input type="hidden" name="targetId" value={suggestion.targetId} />
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
                                  {suggestion.folio !== "sin folio" ? `N° ${suggestion.folio}` : suggestion.folio} ·{" "}
                                  {suggestion.partner}
                                </button>
                              </form>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <form action={toggleMovimientoIgnorado}>
                          <input type="hidden" name="movementId" value={movement.id} />
                          <button
                            type="submit"
                            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                          >
                            Ignorar
                          </button>
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
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
