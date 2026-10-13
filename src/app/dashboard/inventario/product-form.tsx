"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { SelectDropdown } from "@/components/select-dropdown";
import { primaryButtonClass, controlClass, fieldClass, labelClass } from "@/lib/ui";

export type ProductFormState = { error?: string; ok?: boolean } | undefined;

export type ProductDefaults = {
  sku?: string;
  name?: string;
  unitId?: string;
  categoryId?: string;
  supplierId?: string;
  location?: string;
  costNet?: number;
  priceNet?: number | string;
  minStock?: string;
  tracksStock?: boolean;
  ivaAffected?: boolean;
};

type Props = {
  action: (prev: ProductFormState, formData: FormData) => Promise<ProductFormState>;
  units: { id: string; name: string }[];
  categories: { id: string; name: string }[];
  suppliers: { id: string; name: string }[];
  defaults?: ProductDefaults;
  submitLabel?: string;
};

export function ProductForm({ action, units, categories, suppliers, defaults, submitLabel = "Guardar" }: Props) {
  const [state, formAction] = useActionState<ProductFormState, FormData>(action, undefined);
  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className={fieldClass}>
          <label htmlFor="p-sku" className={labelClass}>SKU</label>
          <input id="p-sku" name="sku" defaultValue={defaults?.sku ?? ""} className={controlClass} required />
        </div>
        <div className={fieldClass}>
          <label htmlFor="p-name" className={labelClass}>Nombre</label>
          <input id="p-name" name="name" defaultValue={defaults?.name ?? ""} className={controlClass} required />
        </div>
        <div className={fieldClass}>
          <label htmlFor="p-unit" className={labelClass}>Unidad</label>
          <SelectDropdown
            id="p-unit"
            name="unitId"
            value={defaults?.unitId ?? ""}
            emptyLabel="Sin unidad"
            options={units.map((u) => ({ value: u.id, label: u.name }))}
          />
        </div>
        <div className={fieldClass}>
          <label htmlFor="p-category" className={labelClass}>Categoría</label>
          <SelectDropdown
            id="p-category"
            name="categoryId"
            value={defaults?.categoryId ?? ""}
            emptyLabel="Sin categoría"
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
          />
        </div>
        <div className={fieldClass}>
          <label htmlFor="p-supplier" className={labelClass}>Proveedor preferido</label>
          <SelectDropdown
            id="p-supplier"
            name="supplierId"
            value={defaults?.supplierId ?? ""}
            emptyLabel="Sin proveedor"
            options={suppliers.map((s) => ({ value: s.id, label: s.name }))}
          />
        </div>
        <div className={fieldClass}>
          <label htmlFor="p-location" className={labelClass}>Ubicación</label>
          <input id="p-location" name="location" defaultValue={defaults?.location ?? ""} className={controlClass} />
        </div>
        <div className={fieldClass}>
          <label htmlFor="p-cost" className={labelClass}>Costo neto unitario (vigente)</label>
          <input id="p-cost" name="costNet" type="number" step="1" min="0" defaultValue={defaults?.costNet ?? 0} className={controlClass + " tabular"} />
        </div>
        <div className={fieldClass}>
          <label htmlFor="p-price" className={labelClass}>Precio venta neto</label>
          <input id="p-price" name="priceNet" type="number" step="1" min="0" defaultValue={defaults?.priceNet ?? ""} className={controlClass + " tabular"} />
        </div>
        <div className={fieldClass}>
          <label htmlFor="p-min" className={labelClass}>Stock mínimo</label>
          <input id="p-min" name="minStock" type="number" step="0.001" min="0" defaultValue={defaults?.minStock ?? ""} className={controlClass + " tabular"} />
        </div>
        <div className={fieldClass}>
          <label htmlFor="p-track" className={labelClass}>Seguimiento de stock</label>
          <SelectDropdown id="p-track" name="tracksStock" value={defaults?.tracksStock === false ? "false" : "true"} allowEmpty={false} options={[{ value: "true", label: "Sí" }, { value: "false", label: "No (servicio)" }]} />
        </div>
        <div className={fieldClass}>
          <label htmlFor="p-iva" className={labelClass}>Afecto a IVA</label>
          <SelectDropdown id="p-iva" name="ivaAffected" value={defaults?.ivaAffected === false ? "false" : "true"} allowEmpty={false} options={[{ value: "true", label: "Sí" }, { value: "false", label: "No (exento)" }]} />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton className={primaryButtonClass} pendingLabel="Guardando...">{submitLabel}</SubmitButton>
        {state?.error ? <span className="text-sm text-danger">{state.error}</span> : null}
      </div>
    </form>
  );
}
