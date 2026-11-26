"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import type { PurchaseFormState } from "@/app/actions/purchases";
import { AutocompletePartner } from "@/components/autocomplete-partner";
import { SelectDropdown } from "@/components/select-dropdown";
import { InlineCreateSelect } from "@/components/inline-create-select";
import { SubmitButton } from "@/components/submit-button";
import { RepartoForm } from "@/components/reparto-form";
import { DATOS_COMBUSTIBLE_VACIOS, FuelTaxModal, type DatosCombustible } from "@/components/fuel-tax-modal";
import { documentTypeLabel } from "@/lib/labels";
import { esCombustiblePorNombre } from "@/lib/fuel";
import { formatCLP } from "@/lib/money";
import { esPagoConTarjeta } from "@/lib/payment-card";
import type { PurchaseForForm } from "@/lib/purchases";
import { cardClass, controlClass, fieldClass, labelClass, primaryButtonClass } from "@/lib/ui";
import { documentTypeValues } from "@/lib/validation";

type SupplierOption = { id: string; name: string; rut: string | null };
type CategoryOption = { id: string; name: string; esCombustible?: boolean };
type AreaOption = { id: string; name: string };

export function PurchaseForm({
  action,
  categories,
  areas,
  ivaRate,
  today,
  defaults,
  formasDePago,
  centrosCosto,
  repartosIniciales,
}: {
  action: (prev: PurchaseFormState, formData: FormData) => Promise<PurchaseFormState>;
  suppliers: SupplierOption[];
  categories: CategoryOption[];
  areas: AreaOption[];
  ivaRate: number;
  /** Las formas de pago del catálogo de la empresa. */
  formasDePago: string[];
  today: string;
  defaults?: PurchaseForForm;
  centrosCosto: Array<{ id: string; codigo: string; nombre: string; esSinAsignar?: boolean }>;
  repartosIniciales?: Array<{ centroCostoId: string; monto: number }>;
}) {
  const [state, formAction] = useActionState<PurchaseFormState, FormData>(action, undefined);

  const [partnerId, setPartnerId] = useState(defaults?.partnerId ?? "");
  const [documentType, setDocumentType] = useState(defaults?.documentType ?? "INVOICE");
  const [net, setNet] = useState(defaults ? String(defaults.netAmount) : "");
  const [iva, setIva] = useState(defaults ? String(defaults.ivaAmount) : "");
  const [status, setStatus] = useState(defaults?.status ?? "PENDING");
  const [paymentMethod, setPaymentMethod] = useState(defaults?.paymentMethod ?? "");
  const [repartoValido, setRepartoValido] = useState(true);
  const [categoriaId, setCategoriaId] = useState(defaults?.categoryId ?? "");
  const [modalCombustible, setModalCombustible] = useState(false);
  const [fuel, setFuel] = useState<DatosCombustible>(() => ({
    tipo: defaults?.combustibleTipo ?? "",
    litros: defaults?.combustibleLitros != null ? String(defaults.combustibleLitros) : "",
    impuesto: String(defaults?.impuestoEspecifico ?? 0),
    glosa: defaults?.impuestoEspecificoGlosa ?? "",
    recuperable: defaults?.impuestoEspecificoRecuperable ?? false,
  }));
  const paymentDateRef = useRef<HTMLInputElement>(null);
  const conTarjeta = esPagoConTarjeta(paymentMethod);

  const categoria = categories.find((item) => item.id === categoriaId);
  const esCombustible = !!categoria &&
    (categoria.esCombustible === true || esCombustiblePorNombre(categoria.name));

  // La tarjeta se carga el día de emisión: refleja esa fecha en el campo y la
  // deja solo lectura. El servidor vuelve a imponer la regla al guardar.
  useEffect(() => {
    if (status !== "PAID" || !conTarjeta) return;
    const emision = document.getElementById("date") as HTMLInputElement | null;
    if (emision && paymentDateRef.current) paymentDateRef.current.value = emision.value;
  }, [status, conTarjeta]);

  function cambiarMetodo(metodo: string) {
    setPaymentMethod(metodo);
    if (status === "PAID" && esPagoConTarjeta(metodo)) {
      const emision = document.getElementById("date") as HTMLInputElement | null;
      if (emision && paymentDateRef.current) paymentDateRef.current.value = emision.value;
    }
  }
  function cambiarCategoria(id: string) {
    setCategoriaId(id);
    const categoriaElegida = categories.find((item) => item.id === id);
    if (
      categoriaElegida &&
      (categoriaElegida.esCombustible === true || esCombustiblePorNombre(categoriaElegida.name))
    ) {
      setModalCombustible(true);
    }
  }

  const signoCC = documentType === "CREDIT_NOTE" ? -1 : 1;

  const isAdjustment = documentType === "CREDIT_NOTE" || documentType === "DEBIT_NOTE";

  function onNet(value: string) {
    setNet(value);
    const parsed = Number.parseInt(value, 10);
    setIva(Number.isFinite(parsed) && parsed >= 0 ? String(Math.round((parsed * ivaRate) / 100)) : "");
  }

  const netNumber = Number.parseInt(net, 10);
  const ivaNumber = Number.parseInt(iva, 10);
  const subtotal = (Number.isFinite(netNumber) ? netNumber : 0) + (Number.isFinite(ivaNumber) ? ivaNumber : 0);
  const impuestoEspecifico = Number(fuel.impuesto.replace(",", ".")) || 0;
  const total = subtotal + (esCombustible ? impuestoEspecifico : 0);
  const impuestoNegativo = impuestoEspecifico < 0;
  const fuelValido = !!fuel.tipo && Number(fuel.litros) > 0 && fuel.impuesto !== "" &&
    (!impuestoNegativo || !!fuel.glosa.trim());

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
              value={categoriaId}
              emptyLabel="Sin categoría"
              onValueChange={cambiarCategoria}
              options={categories.map((category) => ({ value: category.id, label: category.name }))}
            />
            {esCombustible ? (
              <div className="mt-2 rounded-control border border-primary/40 bg-primary-soft p-3 text-xs text-muted-foreground">
                <p className="font-medium text-primary">Factura de combustible</p>
                <p className="mt-1">
                  {fuel.tipo
                    ? `Impuesto específico: ${formatCLP(impuestoEspecifico)} · ${fuel.litros} litros o m³`
                    : "Completa el detalle de impuestos específicos para poder guardar."}
                </p>
                <button
                  type="button"
                  onClick={() => setModalCombustible(true)}
                  className="mt-2 text-primary underline-offset-2 hover:underline"
                >
                  {fuel.tipo ? "Editar detalle" : "Abrir detalle de combustible"}
                </button>
              </div>
            ) : null}
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
          {esCombustible ? ` El impuesto específico (${formatCLP(impuestoEspecifico)}) se suma al total, no a la base del IVA.` : ""}
        </p>
      </section>

      <RepartoForm
        centros={centrosCosto}
        iniciales={repartosIniciales ?? []}
        objetivo={total}
        signo={signoCC}
        onValidez={setRepartoValido}
        obligatorio={esCombustible}
      />

      {esCombustible ? (
        <>
          <input type="hidden" name="combustibleTipo" value={fuel.tipo} />
          <input type="hidden" name="combustibleLitros" value={fuel.litros} />
          <input type="hidden" name="impuestoEspecifico" value={fuel.impuesto} />
          <input type="hidden" name="impuestoEspecificoGlosa" value={fuel.glosa} />
          <input
            type="hidden"
            name="impuestoEspecificoRecuperable"
            value={fuel.recuperable ? "true" : "false"}
          />
        </>
      ) : null}

      <FuelTaxModal
        open={modalCombustible}
        initial={fuel.tipo ? fuel : DATOS_COMBUSTIBLE_VACIOS}
        onClose={() => setModalCombustible(false)}
        onSave={(datos) => {
          setFuel(datos);
          setModalCombustible(false);
        }}
      />

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
              <select
                id="paymentMethod"
                name="paymentMethod"
                value={paymentMethod}
                onChange={(event) => cambiarMetodo(event.target.value)}
                className={controlClass}
              >
                <option value="">Selecciona un medio de pago</option>
                {formasDePago.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
            <div className={fieldClass}>
              <label htmlFor="paymentDate" className={labelClass}>
                Fecha de pago
              </label>
              <input
                id="paymentDate"
                name="paymentDate"
                type="text" data-date="1" pattern="^\d{2}-\d{2}(-\d{4})?$" placeholder="DD-MM o DD-MM-AAAA"
                defaultValue={defaults?.paymentDate ?? ""}
                ref={paymentDateRef}
                readOnly={conTarjeta}
                className={controlClass + (conTarjeta ? " opacity-70" : "")}
              />
              {conTarjeta ? (
                <p className="text-xs text-muted-foreground">
                  Con tarjeta de crédito o débito se usa la fecha de emisión de la factura.
                </p>
              ) : null}
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
        <SubmitButton
          pendingLabel="Guardando..."
          className={primaryButtonClass}
          disabled={!repartoValido || (esCombustible && !fuelValido)}
        >
          {defaults ? "Guardar cambios" : "Registrar compra"}
        </SubmitButton>
        {!repartoValido ? (
          <p className="text-xs text-danger">Ajusta el reparto de centros de costo antes de guardar.</p>
        ) : null}
        {esCombustible && !fuelValido ? (
          <p className="text-xs text-danger">Completa el detalle de impuestos de combustible.</p>
        ) : null}
      </div>
    </form>
  );
}
