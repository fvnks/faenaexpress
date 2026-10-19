"use client";

import { cardClass } from "@/lib/ui";
import { stockMovementTypeLabel } from "@/lib/labels";
import { formatDate } from "@/lib/money";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { reverseStockMovementAction } from "@/app/actions/inventory";

type M = {
  id: string;
  date: Date | string;
  type: string;
  quantity: string | number;
  unitCost: number | null;
  reference: string | null;
  reason: string | null;
  product: { name: string; sku: string; unit?: { name: string | null } | null };
  warehouse?: { name: string } | null;
  toWarehouse?: { name: string } | null;
};

function warehouseLabel(m: M): string | null {
  const from = m.warehouse?.name ?? null;
  const to = m.toWarehouse?.name ?? null;
  if (from && to) return `${from} → ${to}`;
  return from;
}

export function MovementsList({
  movements,
  showWarehouse,
  writable,
}: {
  movements: M[];
  showWarehouse?: boolean;
  writable?: boolean;
}) {
  const baseCols = showWarehouse ? 7 : 6;
  const cols = writable ? baseCols + 1 : baseCols;

  return (
    <div className={cardClass + " overflow-x-auto"}>
      <table className="min-w-full divide-y divide-border text-sm">
        <thead>
          <tr className="text-left text-muted-foreground">
            <th className="px-4 py-2">Fecha</th>
            <th className="px-4 py-2">Producto</th>
            <th className="px-4 py-2">Tipo</th>
            {showWarehouse ? <th className="px-4 py-2">Bodega</th> : null}
            <th className="px-4 py-2 text-right">Cantidad</th>
            <th className="px-4 py-2 text-right">Costo unit.</th>
            <th className="px-4 py-2">Referencia/Razón</th>
            {writable ? <th className="px-4 py-2">Acción</th> : null}
          </tr>
        </thead>
        <tbody className="divide-y divide-border tabular">
          {movements.length === 0 ? (
            <tr>
              <td colSpan={cols} className="px-4 py-6 text-center text-muted-foreground">
                Sin movimientos.
              </td>
            </tr>
          ) : (
            movements.map((m) => (
              <tr key={m.id}>
                <td className="px-4 py-2">{formatDate(typeof m.date === "string" ? new Date(m.date) : m.date)}</td>
                <td className="px-4 py-2">
                  <div>{m.product.name}</div>
                  <div className="text-xs text-muted-foreground">{m.product.sku}</div>
                </td>
                <td className="px-4 py-2">{stockMovementTypeLabel(m.type)}</td>
                {showWarehouse ? (
                  <td className="px-4 py-2 text-muted-foreground">{warehouseLabel(m) ?? "—"}</td>
                ) : null}
                <td className="px-4 py-2 text-right">{Number(m.quantity).toFixed(3)}</td>
                <td className="px-4 py-2 text-right">{m.unitCost ?? "—"}</td>
                <td className="px-4 py-2 text-muted-foreground">{m.reference || m.reason || "—"}</td>
                {writable ? (
                  <td className="px-4 py-2">
                    <form action={reverseStockMovementAction}>
                      <input type="hidden" name="movementId" value={m.id} />
                      <ConfirmSubmit
                        title="Revertir movimiento"
                        description={`Se revertirá el movimiento de ${m.product.name} y el stock volverá a su estado anterior.`}
                        confirmLabel="Revertir"
                        className="text-sm text-primary underline-offset-2 hover:underline"
                      >
                        Revertir
                      </ConfirmSubmit>
                    </form>
                  </td>
                ) : null}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}