"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";

import { SelectDropdown } from "@/components/select-dropdown";
import { SubmitButton } from "@/components/submit-button";
import {
  controlClass,
  fieldClass,
  labelClass,
  primaryButtonClass,
} from "@/lib/ui";
import {
  createStockMovement,
  type MovementFormState,
} from "@/app/actions/inventory";
import { stockMovementTypeValues } from "@/lib/validation";
import { stockMovementTypeLabel } from "@/lib/labels";

// Forma de render condicional: un tipo define si se pide costo y si se
// invalida el stock negativo.
const COST_TYPES = new Set(["IN", "INITIAL", "ADJUST_IN"]);

export function MovementForm({
  products,
  warehouses,
  defaultProductId,
  today,
}: {
  products: { id: string; name: string; sku: string; quantity: string }[];
  warehouses: { id: string; name: string; isDefault: boolean }[];
  defaultProductId?: string;
  today: string;
}) {
  const [state, formAction] = useActionState<MovementFormState, FormData>(
    createStockMovement,
    undefined,
  );
  const [type, setType] = useState<string>(defaultProductId ? "IN" : "INITIAL");
  const showCost = COST_TYPES.has(type);
  const showTransfer = type === "TRANSFER";

  const originId =
    warehouses.find((w) => w.isDefault)?.id ?? warehouses[0]?.id ?? "";
  const [warehouseId, setWarehouseId] = useState<string>(originId);

  // El resultado llega como estado de la server action: avisar y limpiar.
  useEffect(() => {
    if (state?.ok) toast.success("Movimiento registrado.");
  }, [state]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className={fieldClass}>
          <label htmlFor="mv-product" className={labelClass}>
            Producto
          </label>
          <SelectDropdown
            id="mv-product"
            name="productId"
            value={defaultProductId ?? ""}
            allowEmpty={!defaultProductId}
            emptyLabel="Selecciona un producto"
            options={products.map((p) => ({
              value: p.id,
              label: `${p.sku} · ${p.name} (stock ${p.quantity})`,
            }))}
          />
        </div>
        <div className={fieldClass}>
          <label htmlFor="mv-type" className={labelClass}>
            Tipo de movimiento
          </label>
          <SelectDropdown
            id="mv-type"
            name="type"
            value={type}
            allowEmpty={false}
            options={stockMovementTypeValues.map((v) => ({
              value: v,
              label: stockMovementTypeLabel(v),
            }))}
            onValueChange={(value) => setType(value)}
          />
        </div>
        <div className={fieldClass}>
          <label htmlFor="mv-warehouse" className={labelClass}>
            Bodega de origen
          </label>
          <SelectDropdown
            id="mv-warehouse"
            name="warehouseId"
            value={warehouseId}
            allowEmpty={false}
            options={warehouses.map((w) => ({
              value: w.id,
              label: w.isDefault ? `${w.name} (principal)` : w.name,
            }))}
            onValueChange={setWarehouseId}
          />
        </div>
        {showTransfer ? (
          <div className={fieldClass}>
            <label htmlFor="mv-to-warehouse" className={labelClass}>
              Bodega de destino
            </label>
            <SelectDropdown
              id="mv-to-warehouse"
              name="toWarehouseId"
              value=""
              emptyLabel="Selecciona una bodega"
              options={warehouses
                .filter((w) => w.id !== warehouseId)
                .map((w) => ({ value: w.id, label: w.name }))}
            />
          </div>
        ) : null}
        <div className={fieldClass}>
          <label htmlFor="mv-quantity" className={labelClass}>
            Cantidad
          </label>
          <input
            id="mv-quantity"
            name="quantity"
            type="number"
            step="0.001"
            min="0.001"
            required
            placeholder="0.000"
            className={controlClass + " tabular"}
          />
        </div>
        {showCost ? (
          <div className={fieldClass}>
            <label htmlFor="mv-cost" className={labelClass}>
              Costo unitario neto (CLP)
            </label>
            <input
              id="mv-cost"
              name="unitCost"
              type="number"
              step="1"
              min="0"
              required
              placeholder="0"
              className={controlClass + " tabular"}
            />
          </div>
        ) : null}
        <div className={fieldClass}>
          <label htmlFor="mv-date" className={labelClass}>
            Fecha
          </label>
          <input
            id="mv-date"
            name="date"
            type="text" data-date="1" pattern="^\d{2}-\d{2}-\d{4}$" placeholder="DD-MM-AAAA"
            defaultValue={today}
            required
            className={controlClass}
          />
        </div>
        <div className={fieldClass}>
          <label htmlFor="mv-reference" className={labelClass}>
            Referencia (folio, documento)
          </label>
          <input
            id="mv-reference"
            name="reference"
            maxLength={60}
            placeholder="Opcional"
            className={controlClass}
          />
        </div>
        <div className={fieldClass}>
          <label htmlFor="mv-reason" className={labelClass}>
            Motivo
          </label>
          <input
            id="mv-reason"
            name="reason"
            maxLength={120}
            placeholder="Opcional"
            className={controlClass}
          />
        </div>
        <div className={fieldClass}>
          <label htmlFor="mv-notes" className={labelClass}>
            Notas
          </label>
          <input
            id="mv-notes"
            name="notes"
            maxLength={300}
            placeholder="Opcional"
            className={controlClass}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton className={primaryButtonClass} pendingLabel="Registrando...">
          Registrar movimiento
        </SubmitButton>
        {state?.error ? (
          <span className="text-sm text-danger">{state.error}</span>
        ) : null}
      </div>
    </form>
  );
}
