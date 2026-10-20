import { registerPayment } from "@/app/actions/payments";
import { DeletePaymentButton } from "@/components/delete-payment-button";
import { SubmitButton } from "@/components/submit-button";
import { paymentMethodLabel } from "@/lib/labels";
import { formatCLP, formatDate, todayISO } from "@/lib/money";
import type { PaymentKind, PaymentView } from "@/lib/payments";
import { cardClass, controlClass, fieldClass, labelClass, primaryButtonClass } from "@/lib/ui";

/**
 * Abonos de una compra o venta: el historial, el saldo y el formulario para
 * registrar uno nuevo. El monto por defecto es el saldo pendiente, así que
 * "registrar abono" con el saldo completo equivale a saldar el documento.
 */
export function PaymentsPanel({
  kind,
  documentId,
  payments,
  settleTotal,
  writable,
  formasDePago,
}: {
  kind: PaymentKind;
  documentId: string;
  payments: PaymentView[];
  /** Monto a cubrir: el total de la compra o el "a cobrar" de la venta. */
  settleTotal: number;
  writable: boolean;
  /** Las formas de pago del catálogo de la empresa. */
  formasDePago: string[];
}) {
  const paid = payments.reduce((total, payment) => total + payment.amount, 0);
  const saldo = Math.max(settleTotal - paid, 0);
  const esCompra = kind === "purchase";

  return (
    <section className={cardClass + " p-5"}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-semibold">Abonos</h2>
        <p className="tabular text-sm text-muted-foreground">
          {paid > 0 ? `${formatCLP(paid)} abonado` : "Sin abonos"} · saldo{" "}
          <span className={saldo === 0 ? "text-success" : "font-medium text-foreground"}>
            {formatCLP(saldo)}
          </span>
        </p>
      </div>

      {payments.length > 0 ? (
        <ul className="mt-3 flex flex-col">
          {payments.map((payment) => (
            <li
              key={payment.id}
              className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-border py-2.5 last:border-0"
            >
              <div className="flex flex-col gap-0.5">
                <span className="tabular text-sm font-medium text-foreground">
                  {formatCLP(payment.amount)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatDate(payment.date)}
                  {payment.method ? ` · ${paymentMethodLabel(payment.method)}` : ""}
                  {payment.notes ? ` · ${payment.notes}` : ""}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">{payment.createdByName}</span>
                {writable ? <DeletePaymentButton paymentId={payment.id} kind={kind} /> : null}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">
          {saldo === 0 ? "Sin abonos: el documento está saldado." : "Sin abonos registrados."}
        </p>
      )}

      {writable && saldo > 0 ? (
        <form action={registerPayment} className="mt-4 flex flex-col gap-4 border-t border-border pt-4">
          <input type="hidden" name="kind" value={kind} />
          <input type="hidden" name="documentId" value={documentId} />

          <div className="grid gap-4 sm:grid-cols-3">
            <div className={fieldClass}>
              <label htmlFor={`abono-fecha-${documentId}`} className={labelClass}>
                Fecha
              </label>
              <input
                id={`abono-fecha-${documentId}`}
                name="date"
                type="text" data-date="1" pattern="^\d{2}-\d{2}(-\d{4})?$" placeholder="DD-MM-AAAA"
                defaultValue={todayISO()}
                required
                className={controlClass}
              />
            </div>
            <div className={fieldClass}>
              <label htmlFor={`abono-monto-${documentId}`} className={labelClass}>
                Monto (CLP)
              </label>
              <input
                id={`abono-monto-${documentId}`}
                name="amount"
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                defaultValue={saldo}
                required
                className={controlClass + " tabular"}
              />
            </div>
            <div className={fieldClass}>
              <label htmlFor={`abono-medio-${documentId}`} className={labelClass}>
                Medio
              </label>
              <select
                id={`abono-medio-${documentId}`}
                name="method"
                defaultValue=""
                className={controlClass}
              >
                <option value="">Sin especificar</option>
                {formasDePago.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className={fieldClass}>
            <label htmlFor={`abono-nota-${documentId}`} className={labelClass}>
              Nota (opcional)
            </label>
            <input
              id={`abono-nota-${documentId}`}
              name="notes"
              type="text"
              maxLength={200}
              className={controlClass}
            />
          </div>

          <div>
            <SubmitButton pendingLabel="Registrando…" className={primaryButtonClass}>
              {esCompra ? "Registrar pago" : "Registrar cobro"}
            </SubmitButton>
          </div>
        </form>
      ) : null}
    </section>
  );
}
