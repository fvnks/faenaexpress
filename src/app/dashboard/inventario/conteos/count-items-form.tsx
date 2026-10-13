"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";

import {
  closeStockCountAction,
  saveStockCount,
  type CloseCountState,
  type CountItemState,
} from "@/app/actions/inventory-counts";
import { SubmitButton } from "@/components/submit-button";
import {
  cardClass,
  dangerButtonClass,
  secondaryButtonClass,
} from "@/lib/ui";

type CountItem = {
  id: string;
  systemQuantity: string;
  countedQuantity: string | null;
  product: { name: string; sku: string; unitName: string | null };
};

const num = (value: string | null) => {
  if (value === null || value === "") return 0;
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
};

function DiffCell({ counted, system }: { counted: string; system: string }) {
  // Vacío = aún no contado: no hay diferencia que mostrar todavía.
  if (counted.trim() === "") return <span className="text-muted-foreground">—</span>;
  const diff = num(counted) - num(system);
  if (diff === 0) return <span className="text-muted-foreground">—</span>;
  const color = diff > 0 ? "text-accent" : "text-danger";
  return (
    <span className={color}>
      {diff > 0 ? "+" : ""}
      {diff.toFixed(3)}
    </span>
  );
}

export function CountItemsForm({
  countId,
  items,
  writable,
}: {
  countId: string;
  items: CountItem[];
  writable: boolean;
}) {
  // Estado local de lo capturado, para mostrar la diferencia en vivo.
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(items.map((i) => [i.id, i.countedQuantity ?? ""])),
  );

  const [saveState, saveAction] = useActionState<CountItemState, FormData>(
    saveStockCount,
    undefined,
  );

  useEffect(() => {
    if (saveState?.ok) toast.success("Conteo guardado.");
  }, [saveState]);

  const countedCount = items.filter((i) => values[i.id]?.trim() !== "").length;
  const pending = items.length - countedCount;

  return (
    <form action={saveAction} className="flex flex-col gap-4">
      <input type="hidden" name="countId" value={countId} />

      <div className={cardClass + " overflow-x-auto"}>
        <table className="min-w-full divide-y divide-border text-sm">
          <thead>
            <tr className="text-left text-muted-foreground">
              <th className="px-4 py-2">SKU</th>
              <th className="px-4 py-2">Producto</th>
              <th className="px-4 py-2 text-right">Sistema</th>
              <th className="px-4 py-2 text-right">Contado</th>
              <th className="px-4 py-2 text-right">Diferencia</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border tabular">
            {items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                  Este conteo no tiene productos.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-2 text-muted-foreground">{item.product.sku}</td>
                  <td className="px-4 py-2">
                    <div>{item.product.name}</div>
                    {item.product.unitName ? (
                      <div className="text-xs text-muted-foreground">{item.product.unitName}</div>
                    ) : null}
                  </td>
                  <td className="px-4 py-2 text-right text-muted-foreground">
                    {num(item.systemQuantity).toFixed(3)}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <label htmlFor={`qty-${item.id}`} className="sr-only">
                      Cantidad contada de {item.product.name}
                    </label>
                    <input
                      id={`qty-${item.id}`}
                      name={`qty-${item.id}`}
                      type="number"
                      step="0.001"
                      min="0"
                      inputMode="decimal"
                      value={values[item.id] ?? ""}
                      onChange={(event) =>
                        setValues((prev) => ({ ...prev, [item.id]: event.target.value }))
                      }
                      placeholder="—"
                      className={
                        "w-28 rounded border border-border bg-transparent px-2 py-1 text-right " +
                        "focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary " +
                        "disabled:opacity-60"
                      }
                      disabled={!writable}
                    />
                  </td>
                  <td className="px-4 py-2 text-right font-medium">
                    <DiffCell counted={values[item.id] ?? ""} system={item.systemQuantity} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {writable ? (
        <div className="flex flex-wrap items-center gap-3">
          <SubmitButton className={secondaryButtonClass} pendingLabel="Guardando...">
            Guardar avance
          </SubmitButton>
          <span className="text-sm text-muted-foreground tabular">
            {countedCount} de {items.length} contados · {pending} pendientes
          </span>
        </div>
      ) : null}
      {saveState?.error ? (
        <p role="alert" className="text-sm text-danger">
          {saveState.error}
        </p>
      ) : null}
    </form>
  );
}

export function CloseCountButton({ countId }: { countId: string }) {
  const [state, formAction] = useActionState<CloseCountState, FormData>(
    closeStockCountAction,
    undefined,
  );

  useEffect(() => {
    if (state?.ok) toast.success(`Conteo cerrado: ${state.summary ?? ""}`);
  }, [state]);

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (!window.confirm("¿Cerrar el conteo y aplicar los ajustes al kardex?")) {
          event.preventDefault();
        }
      }}
      className="flex items-center gap-3"
    >
      <input type="hidden" name="countId" value={countId} />
      <SubmitButton className={dangerButtonClass} pendingLabel="Cerrando...">
        Cerrar y aplicar ajustes
      </SubmitButton>
      {state?.error ? <span className="text-sm text-danger">{state.error}</span> : null}
    </form>
  );
}
