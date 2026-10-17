import Link from "next/link";

import { bankName } from "@/lib/banco";
import { formatCLP, formatDate } from "@/lib/money";

/**
 * De dónde salió el pago: el movimiento bancario con que se concilió el
 * documento. Lleva a la bandeja con ese movimiento destacado.
 *
 * Solo se muestra a quien puede ver la sección Banco (el movimiento expone la
 * caja real de la empresa), así que quien no tiene acceso tampoco ve un enlace
 * que lo dejaría fuera de la página.
 */
export function BankReconciliationNote({
  movement,
}: {
  movement: {
    id: string;
    date: Date;
    amount: number;
    description: string;
    account: { label: string; bankId: string };
  };
}) {
  return (
    <div className="rounded-control bg-success-soft/60 px-3 py-2 text-sm">
      <p className="font-medium">Conciliado con el banco</p>
      <p className="tabular mt-0.5 text-muted-foreground">
        {formatDate(movement.date)} · {formatCLP(Math.abs(movement.amount))} ·{" "}
        {bankName(movement.account.bankId)}
        {movement.account.label ? ` · ${movement.account.label}` : ""}
      </p>
      <p className="mt-0.5 truncate text-xs text-muted-foreground" title={movement.description}>
        {movement.description}
      </p>
      <Link
        href={`/dashboard/banco?movimiento=${movement.id}`}
        className="mt-1 inline-block text-xs font-medium text-primary underline-offset-2 hover:underline"
      >
        Ver el movimiento en Banco
      </Link>
    </div>
  );
}
