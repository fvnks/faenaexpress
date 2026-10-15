"use client";

import { useActionState, useState } from "react";

import type { SaleFormState } from "@/app/actions/sales";
import { AutocompletePartner } from "@/components/autocomplete-partner";
import { SelectDropdown } from "@/components/select-dropdown";
import { InlineCreateSelect } from "@/components/inline-create-select";
import { SubmitButton } from "@/components/submit-button";
import { documentTypeLabel } from "@/lib/labels";
import { formatCLP } from "@/lib/money";
import type { SaleForForm } from "@/lib/sales";
import { cardClass, controlClass, fieldClass, labelClass, primaryButtonClass } from "@/lib/ui";
import { documentTypeValues } from "@/lib/validation";

type CustomerOption = { id: string; name: string; rut: string | null };
type Option = { id: string; name: string };

export function SaleForm({
  action,
  salespeople,
  categories,
  areas,
  ivaRate,
  retentionRate,
  today,
  defaults,
  defaultDocumentType,
}: {
  action: (prev: SaleFormState, formData: FormData) => Promise<SaleFormState>;
  customers: CustomerOption[];
  salespeople: Option[];
  categories: Option[];
  areas: Option[];
  ivaRate: number;
  retentionRate: number;
  today: string;
  defaults?: SaleForForm;
  defaultDocumentType?: string;
}) {
  const [state, formAction] = useActionState<SaleFormState, FormData>(action, undefined);

  const [partnerId, setPartnerId] = useState(defaults?.partnerId ?? "");
  const [documentType, setDocumentType] = useState(
    defaults?.documentType ?? defaultDocumentType ?? "INVOICE",
  );
  const [net, setNet] = useState(defaults ? String(defaults.netAmount) : "");
  const [iva, setIva] = useState(defaults ? String(defaults.ivaAmount) : "");
  const [retention, setRetention] = useState(defaults ? String(defaults.retentionAmount) : "");
  const [status, setStatus] = useState(defaults?.status ?? "PENDING");

  const isAdjustment = documentType === "CREDIT_NOTE" || documentType === "DEBIT_NOTE";

  const onNet = (value: string) => {
    setNet(value);
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      setIva(String(Math.round((parsed * ivaRate) / 100)));
    }
  };

  const applyRetention = () => {
    const parsed = Number(net);
    if (Number.isFinite(parsed) && parsed > 0) {
      setRetention(String(Math.round((parsed * retentionRate) / 100)));
    }
  };

  const netNumber = Number(net) || 0;
  const ivaNumber = Number(iva) || 0;
  const retentionNumber = Number(retention) || 0;
  const total = netNumber + ivaNumber;
  const toCollect = Math.max(total - retentionNumber, 0);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <section className={cardClass + " flex flex-col gap-4 p-4"}>
        <h2 className="font-semibold">Datos de la venta</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <AutocompletePartner
              label="Cliente"
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
              Fecha de emisión
            </label>
            <input
              id="date"
              name="date"
              type="date"
              required
              defaultValue={defaults?.date ?? today}
              className={controlClass}
            />
          </div>

          <div className={fieldClass}>
            <label htmlFor="salespersonId" className={labelClass}>
              Vendedor <span className="text-muted-foreground">(opcional)</span>
            </label>
            <SelectDropdown
              id="salespersonId"
              name="salespersonId"
              value={defaults?.salespersonId ?? ""}
              emptyLabel="Sin vendedor"
              options={salespeople.map((salesperson) => ({ value: salesperson.id, label: salesperson.name }))}
            />
          </div>

          <div className={fieldClass}>
            <label htmlFor="purchaseOrder" className={labelClass}>
              Orden de compra / EDP <span className="text-muted-foreground">(opcional)</span>
            </label>
            <input
              id="purchaseOrder"
              name="purchaseOrder"
              defaultValue={defaults?.purchaseOrder ?? ""}
              maxLength={80}
              className={controlClass}
            />
          </div>

          <div className={fieldClass}>
            <label htmlFor="dispatchGuide" className={labelClass}>
              Guía <span className="text-muted-foreground">(opcional)</span>
            </label>
            <input
              id="dispatchGuide"
              name="dispatchGuide"
              defaultValue={defaults?.dispatchGuide ?? ""}
              maxLength={80}
              className={controlClass}
            />
          </div>

          <div className={fieldClass}>
            <label htmlFor="hesNumber" className={labelClass}>
              N° HES <span className="text-muted-foreground">(opcional)</span>
            </label>
            <input
              id="hesNumber"
              name="hesNumber"
              defaultValue={defaults?.hesNumber ?? ""}
              maxLength={80}
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

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

          <div className={fieldClass}>
            <label htmlFor="retentionAmount" className={labelClass}>
              Retención (CLP)
            </label>
            <input
              id="retentionAmount"
              name="retentionAmount"
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              value={retention}
              onChange={(event) => setRetention(event.target.value)}
              placeholder="0"
              className={controlClass + " tabular"}
            />
            {retentionRate > 0 ? (
              <button
                type="button"
                onClick={applyRetention}
                className="self-start text-xs text-muted-foreground underline-offset-2 hover:underline"
              >
                Aplicar {retentionRate}% de retención
              </button>
            ) : null}
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          El total es neto + IVA. {retentionNumber > 0 ? `A cobrar: ${formatCLP(toCollect)}.` : ""}
          {retentionRate > 0 ? ` La retención sugerida de la empresa es ${retentionRate}% (boletas de honorarios).` : ""}
        </p>
      </section>

      <section className={cardClass + " flex flex-col gap-4 p-4"}>
        <h2 className="font-semibold">Cobro</h2>

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
                  {value === "PENDING" ? "Por cobrar" : "Cobrada"}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {status === "PAID" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className={fieldClass}>
              <label htmlFor="paymentDate" className={labelClass}>
                Fecha de pago
              </label>
              <input
                id="paymentDate"
                name="paymentDate"
                type="date"
                defaultValue={defaults?.paymentDate ?? today}
                className={controlClass}
              />
            </div>
          </div>
        ) : null}

        <div className={fieldClass}>
          <label htmlFor="confirmingAt" className={labelClass}>
            Fecha Confirming
          </label>
          <div className="flex items-center gap-2">
            <input
              id="confirmingAt"
              name="confirmingAt"
              type="date"
              defaultValue={defaults?.confirmingAt || ""}
              className={controlClass}
            />
            <button
              type="button"
              onClick={() => {
                const input = document.getElementById("confirmingAt") as HTMLInputElement | null;
                if (input && !input.value) input.value = today;
              }}
              className="rounded-control border border-border bg-transparent px-3 py-2 text-sm text-foreground"
            >
              Marcar Confirming
            </button>
          </div>
        </div>

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
          {defaults ? "Guardar cambios" : "Registrar venta"}
        </SubmitButton>
      </div>
    </form>
  );
}
