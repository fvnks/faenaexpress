"use client";

import { useActionState, useState } from "react";

import type { ExpenseFormState } from "@/app/actions/expenses";
import { SelectDropdown } from "@/components/select-dropdown";
import { SubmitButton } from "@/components/submit-button";
import { paymentMethodLabel } from "@/lib/labels";
import { formatCLP } from "@/lib/money";
import type { ExpenseForForm } from "@/lib/expenses";
import { cardClass, controlClass, fieldClass, labelClass, primaryButtonClass } from "@/lib/ui";

type Option = { id: string; name: string };

export function ExpenseForm({
  action,
  categories,
  areas,
  payers,
  workers,
  ivaRate,
  today,
  defaults,
  prefill,
  volver,
  formasDePago,
}: {
  action: (prev: ExpenseFormState, formData: FormData) => Promise<ExpenseFormState>;
  categories: Option[];
  areas: Option[];
  payers: Option[];
  workers: Option[];
  ivaRate: number;
  /** Las formas de pago del catálogo de la empresa. */
  formasDePago: string[];
  today: string;
  defaults?: ExpenseForForm;
  /**
   * Valores iniciales que no vienen de un gasto guardado, como la glosa de un
   * movimiento bancario. En edición, `defaults` manda.
   */
  prefill?: Partial<ExpenseForForm>;
  /** A dónde volver al guardar. Solo lo usa el alta. */
  volver?: string;
}) {
  const [state, formAction] = useActionState<ExpenseFormState, FormData>(action, undefined);

  const initial: Partial<ExpenseForForm> = { ...prefill, ...defaults };

  const [net, setNet] = useState(initial.netAmount !== undefined ? String(initial.netAmount) : "");
  const [iva, setIva] = useState(initial.ivaAmount !== undefined ? String(initial.ivaAmount) : "");
  const [reimbursed, setReimbursed] = useState(initial.reimbursed ?? false);

  const netNumber = Number(net) || 0;
  const ivaNumber = Number(iva) || 0;
  const total = netNumber + ivaNumber;

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {volver ? <input type="hidden" name="volver" value={volver} /> : null}
      <section className={cardClass + " flex flex-col gap-4 p-4"}>
        <h2 className="font-semibold">Datos del gasto</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className={fieldClass}>
            <label htmlFor="date" className={labelClass}>
              Fecha
            </label>
            <input
              id="date"
              name="date"
              type="text" data-date="1" pattern="^\d{2}-\d{2}-\d{4}$" placeholder="DD-MM-AAAA"
              required
              defaultValue={initial.date ?? today}
              className={controlClass}
            />
          </div>

          <div className={fieldClass}>
            <label htmlFor="documentNumber" className={labelClass}>
              N° documento <span className="text-muted-foreground">(opcional)</span>
            </label>
            <input
              id="documentNumber"
              name="documentNumber"
              defaultValue={initial.documentNumber ?? ""}
              maxLength={50}
              className={controlClass}
            />
          </div>

          <div className={fieldClass + " sm:col-span-2"}>
            <label htmlFor="description" className={labelClass}>
              Descripción
            </label>
            <input
              id="description"
              name="description"
              required
              maxLength={300}
              defaultValue={initial.description ?? ""}
              placeholder="Detalle del gasto"
              className={controlClass}
            />
          </div>

          <div className={fieldClass}>
            <label htmlFor="categoryId" className={labelClass}>
              Categoría <span className="text-muted-foreground">(opcional)</span>
            </label>
            <SelectDropdown
              id="categoryId"
              name="categoryId"
              value={initial.categoryId ?? ""}
              emptyLabel="Sin categoría"
              options={categories.map((category) => ({ value: category.id, label: category.name }))}
            />
          </div>

          <div className={fieldClass}>
            <label htmlFor="areaId" className={labelClass}>
              Área <span className="text-muted-foreground">(opcional)</span>
            </label>
            <SelectDropdown
              id="areaId"
              name="areaId"
              value={initial.areaId ?? ""}
              emptyLabel="Sin área"
              options={areas.map((area) => ({ value: area.id, label: area.name }))}
            />
          </div>

          <div className={fieldClass}>
            <label htmlFor="workerId" className={labelClass}>
              Trabajador <span className="text-muted-foreground">(opcional)</span>
            </label>
            <SelectDropdown
              id="workerId"
              name="workerId"
              value={initial.workerId ?? ""}
              emptyLabel="Sin trabajador"
              options={workers.map((worker) => ({ value: worker.id, label: worker.name }))}
            />
          </div>

          <div className={fieldClass}>
            <label htmlFor="paidById" className={labelClass}>
              Quién pagó
            </label>
            <SelectDropdown
              id="paidById"
              name="paidById"
              value={initial.paidById ?? ""}
              emptyLabel="— Selecciona quién pagó —"
              options={payers.map((payer) => ({ value: payer.id, label: payer.name }))}
            />
          </div>

          <div className={fieldClass}>
            <label htmlFor="paymentMethod" className={labelClass}>
              Tipo de pago
            </label>
            <SelectDropdown
              id="paymentMethod"
              name="paymentMethod"
              value={paymentMethodLabel(initial.paymentMethod) || "Efectivo"}
              allowEmpty={false}
              options={formasDePago.map((value) => ({ value, label: value }))}
            />
          </div>
        </div>
      </section>

      <section className={cardClass + " flex flex-col gap-4 p-4"}>
        <h2 className="font-semibold">Monto</h2>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className={fieldClass}>
            <label htmlFor="netAmount" className={labelClass}>
              Neto (CLP)
            </label>
            <input
              id="netAmount"
              name="netAmount"
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              required
              value={net}
              onChange={(event) => {
                const value = event.target.value;
                setNet(value);
                const parsed = Number(value);
                if (Number.isFinite(parsed)) {
                  setIva(String(Math.round((parsed * ivaRate) / 100)));
                }
              }}
              className={controlClass + " tabular"}
            />
          </div>

          <div className={fieldClass}>
            <label htmlFor="ivaAmount" className={labelClass}>
              IVA {ivaRate}%
            </label>
            <input
              id="ivaAmount"
              name="ivaAmount"
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              value={iva}
              onChange={(event) => setIva(event.target.value)}
              className={controlClass + " tabular"}
            />
          </div>

          <div className={fieldClass}>
            <span className={labelClass}>Monto total</span>
            <output className="tabular rounded-control border border-border bg-background px-3 py-2 text-sm font-semibold">
              {formatCLP(total)}
            </output>
          </div>
        </div>
      </section>

      <section className={cardClass + " flex flex-col gap-4 p-4"}>
        <h2 className="font-semibold">Reembolso</h2>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="reimbursed"
            checked={reimbursed}
            onChange={(event) => setReimbursed(event.target.checked)}
            className="h-4 w-4 rounded border-border"
          />
          Ya se reembolsó a quien pagó
        </label>

        {reimbursed ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className={fieldClass}>
              <label htmlFor="reimbursedAt" className={labelClass}>
                Fecha de reembolso
              </label>
              <input
                id="reimbursedAt"
                name="reimbursedAt"
                type="text" data-date="1" pattern="^\d{2}-\d{2}-\d{4}$" placeholder="DD-MM-AAAA"
                defaultValue={initial.reimbursedAt ?? today}
                className={controlClass}
              />
            </div>
          </div>
        ) : null}

        <div className={fieldClass}>
          <label htmlFor="notes" className={labelClass}>
            Observaciones <span className="text-muted-foreground">(opcional)</span>
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            defaultValue={initial.notes ?? ""}
            maxLength={1000}
            className={controlClass}
          />
        </div>
      </section>

      {state?.error ? (
        <p
          role="alert"
          aria-live="polite"
          className="rounded-control border border-danger bg-danger-soft px-3 py-2 text-sm text-danger"
        >
          {state.error}
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <SubmitButton pendingLabel="Guardando..." className={primaryButtonClass}>
          {defaults ? "Guardar cambios" : "Registrar gasto"}
        </SubmitButton>
      </div>
    </form>
  );
}
