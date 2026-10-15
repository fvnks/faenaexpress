"use client";

import { useActionState, useState } from "react";

import type { PurchaseFormState } from "@/app/actions/purchases";
import { AutocompletePartner } from "@/components/autocomplete-partner";
import { SelectDropdown } from "@/components/select-dropdown";
import { InlineCreateSelect } from "@/components/inline-create-select";
import { SubmitButton } from "@/components/submit-button";
import { documentTypeLabel, paymentMethodLabel } from "@/lib/labels";
import { formatCLP } from "@/lib/money";
import type { PurchaseForForm } from "@/lib/purchases";
import { cardClass, controlClass, fieldClass, labelClass, primaryButtonClass } from "@/lib/ui";
import { documentTypeValues, paymentMethodValues } from "@/lib/validation";

type SupplierOption = { id: string; name: string; rut: string | null };
type CategoryOption = { id: string; name: string };
type AreaOption = { id: string; name: string };

export function PurchaseForm({
  action,
  categories,
  areas,
  ivaRate,
  today,
  defaults,
}: {
  action: (prev: PurchaseFormState, formData: FormData) => Promise<PurchaseFormState>;
  suppliers: SupplierOption[];
  categories: CategoryOption[];
  areas: AreaOption[];
  ivaRate: number;
  today: string;
  defaults?: PurchaseForForm;
}) {
  const [state, formAction] = useActionState<PurchaseFormState, FormData>(action, undefined);

  const [partnerId, setPartnerId] = useState(defaults?.partnerId ?? "");
  const [documentType, setDocumentType] = useState(defaults?.documentType ?? "INVOICE");
  const [net, setNet] = useState(defaults ? String(defaults.netAmount) : "");
  const [iva, setIva] = useState(defaults ? String(defaults.ivaAmount) : "");
  const [status, setStatus] = useState(defaults?.status ?? "PENDING");

  const isAdjustment = documentType === "CREDIT_NOTE" || documentType === "DEBIT_NOTE";

  function onNet(value: string) {
    setNet(value);
    const parsed = Number.parseInt(value, 10);
    setIva(Number.isFinite(parsed) && parsed >= 0 ? String(Math.round((parsed * ivaRate) / 100)) : "");
  }

  const netNumber = Number.parseInt(net, 10);
  const ivaNumber = Number.parseInt(iva, 10);
  const total = (Number.isFinite(netNumber) ? netNumber : 0) + (Number.isFinite(ivaNumber) ? ivaNumber : 0);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <section className={cardClass + " flex flex-col gap-4 p-4"}>
        <h2 className="font-semibold">Datos de la compra</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <AutocompletePartner
              label="Proveedor"
              initialPartnerId={partnerId}
              initialPartnerName={defaults?.partnerName}
              onSelect={(partnerId) => setPartnerId(partnerId)}
            />

          <div className={fieldClass}>
            <label htmlFor="documentType" className={labelClass}>
              Tipo de documento
            </label>
            <SelectDropdown
              id="documentType"
              name="documentType"
              value={documentType}
              allowEmpty={false}
              onValueChange={(value) => setDocumentType(value)}
              options={documentTypeValues.map((value) => ({ value, label: documentTypeLabel(value) }))}
            />
          </div>

          <div className={fieldClass}>
            <label htmlFor="documentNumber" className={labelClass}>
              Nº factura <span className="text-muted-foreground">(opcional)</span>
            </label>
            <input
              id="documentNumber"
              name="documentNumber"
              defaultValue={defaults?.documentNumber ?? ""}
              maxLength={50}
              className={controlClass}
            />
          </div>

          {isAdjustment ? (
            <div className={fieldClass}>
              <label htmlFor="referenceDocumentNumber" className={labelClass}>
                Folio del documento que ajusta
              </label>
              <input
                id="referenceDocumentNumber"
                name="referenceDocumentNumber"
                required
                defaultValue={defaults?.referenceDocumentNumber ?? ""}
                maxLength={50}
                className={controlClass}
              />
            </div>
          ) : null}

          <div className={fieldClass}>
            <label htmlFor="date" className={labelClass}>
              Fecha
            </label>
            <input
              id="date"
              name="date"
              type="text" data-date="1" pattern="^\d{2}-\d{2}-\d{4}$" placeholder="DD-MM-AAAA"
              required
              defaultValue={defaults?.date ?? today}
              className={controlClass}
            />
          </div>

          <div className={fieldClass}>
            <label htmlFor="areaId" className={labelClass}>
              Área <span className="text-muted-foreground">(opcional)</span>
            </label>
            <InlineCreateSelect
              kind="area"
              id="areaId"
              name="areaId"
              value={defaults?.areaId ?? ""}
              emptyLabel="Sin área"
              options={areas.map((area) => ({ value: area.id, label: area.name }))}
            />
          </div>

          <div className={fieldClass}>
            <label htmlFor="categoryId" className={labelClass}>
              Categoría <span className="text-muted-foreground">(opcional)</span>
            </label>
            <InlineCreateSelect
              kind="category"
              id="categoryId"
              name="categoryId"
              value={defaults?.categoryId ?? ""}
              emptyLabel="Sin categoría"
              options={categories.map((category) => ({ value: category.id, label: category.name }))}
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
              onChange={(event) => onNet(event.target.value)}
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
        <p className="text-xs text-muted-foreground">
          El IVA se calcula solo, pero puedes ajustarlo (por ejemplo, documentos exentos en 0).
        </p>
      </section>

      <section className={cardClass + " flex flex-col gap-4 p-4"}>
        <h2 className="font-semibold">Pago</h2>

        <fieldset className={fieldClass}>
          <legend className={labelClass}>Estado</legend>
          <div className="flex flex-wrap gap-2">
            {(["PENDING", "PAID"] as const).map((value) => (
              <label key={value} className="cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  value={value}
                  checked={status === value}
                  onChange={() => setStatus(value)}
                  className="peer sr-only"
                />
                <span className="block rounded-control border border-border bg-surface px-3 py-2 text-sm transition-colors peer-checked:border-primary peer-checked:bg-primary peer-checked:font-medium peer-checked:text-primary-foreground peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background">
                  {value === "PENDING" ? "Pendiente de pago" : "Pagada"}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {status === "PAID" ? (
          <>
            <div className={fieldClass}>
              <label htmlFor="paymentMethod" className={labelClass}>
                Tipo de pago
              </label>
              <SelectDropdown
                id="paymentMethod"
                name="paymentMethod"
                value={defaults?.paymentMethod ?? ""}
                emptyLabel="Selecciona un medio de pago"
                options={paymentMethodValues.map((value) => ({ value, label: paymentMethodLabel(value) }))}
              />
            </div>
            <div className={fieldClass}>
              <label htmlFor="paymentDate" className={labelClass}>
                Fecha de pago
              </label>
              <input
                id="paymentDate"
                name="paymentDate"
                type="text" data-date="1" pattern="^\d{2}-\d{2}-\d{4}$" placeholder="DD-MM-AAAA"
                defaultValue={defaults?.paymentDate ?? today}
                className={controlClass}
              />
            </div>
          </>
        ) : null}

        <div className={fieldClass}>
          <label htmlFor="notes" className={labelClass}>
            Observaciones <span className="text-muted-foreground">(opcional)</span>
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            defaultValue={defaults?.notes ?? ""}
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
          {defaults ? "Guardar cambios" : "Registrar compra"}
        </SubmitButton>
      </div>
    </form>
  );
}
