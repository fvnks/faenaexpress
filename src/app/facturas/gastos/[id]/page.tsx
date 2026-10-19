import { notFound } from "next/navigation";

import { deleteExpense, markExpensePending, markExpenseReimbursed } from "@/app/actions/expenses";
import { ActionsDropdown } from "@/components/actions-dropdown";
import { BankReconciliationNote } from "@/components/bank-reconciliation-note";
import { Breadcrumb } from "@/components/breadcrumb";
import { ReimbursementBadge } from "@/components/reimbursement-badge";
import { SubmitButton } from "@/components/submit-button";
import { canWrite, requireContext } from "@/lib/auth";
import { getExpense } from "@/lib/expenses";
import { paymentMethodLabel } from "@/lib/labels";
import { formatCLP, formatDate, todayISO } from "@/lib/money";
import { canAccess } from "@/lib/permissions";
import {
  cardClass,
  controlClass,
  fieldClass,
  labelClass,
  secondaryButtonClass,
} from "@/lib/ui";

export default async function ExpenseDetailPage(props: PageProps<"/facturas/gastos/[id]">) {
  const ctx = await requireContext("gastos");
  const { id } = await props.params;
  const expense = await getExpense(ctx.company.id, id);

  if (!expense) {
    notFound();
  }

  const writable = canWrite(ctx, "gastos");
  // El movimiento bancario expone la caja de la empresa: solo lo ve quien puede
  // entrar a Banco.
  const canSeeBank = canAccess(ctx.role, "banco");
  const bankLink = expense.bankReconciliations[0] ?? null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Breadcrumb
          items={[
            { label: "Panel", href: "/facturas", icon: "home" },
            { label: "Gastos", href: "/facturas/gastos", icon: "gastos" },
            { label: expense.description },
          ]}
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{expense.description}</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {formatDate(expense.date)}
              {expense.documentNumber ? ` · N° ${expense.documentNumber}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ReimbursementBadge reimbursed={expense.reimbursed} />
            {writable ? (
              <ActionsDropdown
                editHref={`/facturas/gastos/${expense.id}/editar`}
                deleteAction={deleteExpense}
                deleteId={expense.id}
                deleteMessage="¿Eliminar este gasto? Esta acción no se puede deshacer."
              />
            ) : null}
          </div>
        </div>
      </div>

      <div className={cardClass + " p-5"}>
        <p className="text-xs text-muted-foreground">Monto total</p>
        <p className="tabular mt-1 text-2xl font-bold">{formatCLP(expense.totalAmount)}</p>
        <dl className="mt-4 grid grid-cols-2 gap-4 border-t border-border pt-4 sm:max-w-sm">
          <div>
            <dt className="text-xs text-muted-foreground">Neto</dt>
            <dd className="tabular mt-0.5">{formatCLP(expense.netAmount)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">IVA</dt>
            <dd className="tabular mt-0.5">{formatCLP(expense.ivaAmount)}</dd>
          </div>
        </dl>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <section className={cardClass + " p-5"}>
          <h2 className="font-semibold">Detalle</h2>
          <dl className="mt-3 flex flex-col gap-3 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Categoría</dt>
              <dd>{expense.category?.name ?? "Sin categoría"}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Área</dt>
              <dd>{expense.area?.name ?? "Sin área"}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Trabajador</dt>
              <dd>{expense.worker?.name ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">N° documento</dt>
              <dd>{expense.documentNumber ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Tipo de pago</dt>
              <dd>{paymentMethodLabel(expense.paymentMethod)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Quién pagó</dt>
              <dd>{expense.paidBy.name}</dd>
            </div>
            {expense.notes ? (
              <div className="flex flex-col gap-0.5">
                <dt className="text-muted-foreground">Observaciones</dt>
                <dd className="whitespace-pre-line">{expense.notes}</dd>
              </div>
            ) : null}
            <div className="flex justify-between gap-3 border-t border-border pt-3">
              <dt className="text-muted-foreground">Registrado por</dt>
              <dd>{expense.createdBy.name}</dd>
            </div>
          </dl>
        </section>

        <section className={cardClass + " flex flex-col gap-3 p-5"}>
          <h2 className="font-semibold">Reembolso</h2>

          {expense.reimbursed ? (
            <p className="text-sm text-success">
              Reembolsado el {expense.reimbursedAt ? formatDate(expense.reimbursedAt) : "—"} a{" "}
              {expense.paidBy.name}.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Pendiente de reembolsar a {expense.paidBy.name}.
            </p>
          )}

          {writable ? (
            expense.reimbursed ? (
              <form action={markExpensePending} className="border-t border-border pt-3">
                <input type="hidden" name="id" value={expense.id} />
                <SubmitButton pendingLabel="Guardando..." className={secondaryButtonClass}>
                  Marcar como por reembolsar
                </SubmitButton>
              </form>
            ) : (
              <form action={markExpenseReimbursed} className="flex flex-col gap-3 border-t border-border pt-3">
                <input type="hidden" name="id" value={expense.id} />
                <div className={fieldClass}>
                  <label htmlFor="reimbursedAt" className={labelClass}>
                    Fecha de reembolso
                  </label>
                  <input
                    id="reimbursedAt"
                    name="reimbursedAt"
                    type="text" data-date="1" pattern="^\d{2}-\d{2}-\d{4}$" placeholder="DD-MM-AAAA"
                    defaultValue={todayISO()}
                    className={controlClass}
                  />
                </div>
                <SubmitButton pendingLabel="Guardando..." className={secondaryButtonClass}>
                  Marcar como reembolsado
                </SubmitButton>
              </form>
            )
          ) : null}

          {bankLink && canSeeBank ? <BankReconciliationNote movement={bankLink.movement} /> : null}
        </section>
      </div>

    </div>
  );
}
