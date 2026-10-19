"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { openStockCount, type StockCountFormState } from "@/app/actions/inventory-counts";
import { SelectDropdown } from "@/components/select-dropdown";
import { SubmitButton } from "@/components/submit-button";
import { controlClass, fieldClass, labelClass, primaryButtonClass } from "@/lib/ui";

export function CountForm({
  warehouses,
  today,
}: {
  warehouses: { id: string; name: string; isDefault: boolean }[];
  today: string;
}) {
  const [state, formAction] = useActionState<StockCountFormState, FormData>(
    openStockCount,
    undefined,
  );
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state?.ok) return;
    toast.success("Conteo abierto. Ya puedes cargar las cantidades contadas.");
    formRef.current?.reset();
    router.push("/facturas/inventario/conteos");
  }, [state, router]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className={fieldClass}>
          <label htmlFor="count-warehouse" className={labelClass}>
            Bodega a contar
          </label>
          <SelectDropdown
            id="count-warehouse"
            name="warehouseId"
            value={warehouses.find((w) => w.isDefault)?.id ?? ""}
            allowEmpty={false}
            options={warehouses.map((w) => ({
              value: w.id,
              label: w.isDefault ? `${w.name} (principal)` : w.name,
            }))}
          />
        </div>
        <div className={fieldClass}>
          <label htmlFor="count-date" className={labelClass}>
            Fecha del conteo
          </label>
          <input
            id="count-date"
            name="date"
            type="text" data-date="1" pattern="^\d{2}-\d{2}-\d{4}$" placeholder="DD-MM-AAAA"
            defaultValue={today}
            required
            className={controlClass}
          />
        </div>
        <div className={fieldClass + " sm:col-span-2"}>
          <label htmlFor="count-notes" className={labelClass}>
            Notas
          </label>
          <input
            id="count-notes"
            name="notes"
            maxLength={300}
            placeholder="Opcional"
            className={controlClass}
          />
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Se cargan todos los productos con stock activo de la bodega. Mientras el conteo esté abierto
        puedes guardar avances; al cerrarlo, cada diferencia genera un ajuste en el kardex.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton className={primaryButtonClass} pendingLabel="Abriendo...">
          Abrir conteo
        </SubmitButton>
        {state?.error ? <span className="text-sm text-danger">{state.error}</span> : null}
      </div>
    </form>
  );
}
