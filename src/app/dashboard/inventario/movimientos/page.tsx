import Link from "next/link";

import { DateRangeFilter } from "@/components/date-range-filter";
import { SelectDropdown } from "@/components/select-dropdown";
import { canInventoryEdit, canInventoryRead, requireContext } from "@/lib/auth";
import { listStockMovements, listWarehouses, parseMovementFilters } from "@/lib/inventory";
import { stockMovementTypeLabel } from "@/lib/labels";
import { stockMovementTypeValues } from "@/lib/validation";
import { cardClass, controlClass, labelClass, primaryButtonClass, secondaryButtonClass } from "@/lib/ui";
import { MovementsList } from "@/app/dashboard/inventario/movimientos/movements-list";

const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
const fieldRow = "flex min-w-[9rem] flex-1 flex-col gap-1.5";

export default async function MovimientosPage(props: PageProps<"/dashboard/inventario/movimientos">) {
  const ctx = await requireContext("inventario");
  if (!canInventoryRead(ctx)) {
    const { redirect } = await import("next/navigation");
    redirect("/dashboard");
  }

  const searchParams = await props.searchParams;
  const raw = {
    q: one(searchParams.q),
    tipo: one(searchParams.tipo),
    bodega: one(searchParams.bodega),
    desde: one(searchParams.desde),
    hasta: one(searchParams.hasta),
  };
  const filters = parseMovementFilters(raw);

  const [movements, warehouses] = await Promise.all([
    listStockMovements(ctx.company.id, filters),
    listWarehouses(ctx.company.id),
  ]);
  const multiWarehouse = warehouses.length > 1;

  const mapped = movements.map((m) => ({
    id: m.id,
    date: m.date,
    type: m.type,
    quantity: m.quantity.toFixed(3),
    unitCost: m.unitCost,
    reference: m.reference,
    reason: m.reason,
    product: { name: m.product.name, sku: m.product.sku, unit: m.product.unit },
    warehouse: m.warehouse ? { name: m.warehouse.name } : null,
    toWarehouse: m.toWarehouse ? { name: m.toWarehouse.name } : null,
  }));

  const hasFilters = Boolean(raw.q || raw.tipo || raw.bodega || raw.desde || raw.hasta);
  const writable = canInventoryEdit(ctx);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Movimientos de inventario</h1>
          <p className="text-sm text-muted-foreground">
            Entradas, salidas, ajustes y mermas de la empresa.
          </p>
        </div>
        {writable ? (
          <Link href="/dashboard/inventario/movimientos/nuevo" className={primaryButtonClass}>
            Nuevo movimiento
          </Link>
        ) : null}
      </div>

      <form method="get" className={cardClass + " flex flex-wrap items-end gap-3 p-4"}>
        <div className={fieldRow}>
          <label htmlFor="q" className={labelClass}>Buscar producto</label>
          <input
            id="q"
            name="q"
            defaultValue={raw.q ?? ""}
            placeholder="SKU o nombre…"
            className={controlClass}
          />
        </div>
        <div className={fieldRow + " sm:w-48"}>
          <label htmlFor="tipo" className={labelClass}>Tipo</label>
          <SelectDropdown
            id="tipo"
            name="tipo"
            value={raw.tipo ?? ""}
            emptyLabel="Todos"
            options={stockMovementTypeValues.map((value) => ({
              value,
              label: stockMovementTypeLabel(value),
            }))}
          />
        </div>
        {multiWarehouse ? (
          <div className={fieldRow + " sm:w-48"}>
            <label htmlFor="bodega" className={labelClass}>Bodega</label>
            <SelectDropdown
              id="bodega"
              name="bodega"
              value={raw.bodega ?? ""}
              emptyLabel="Todas"
              options={warehouses.map((w) => ({
                value: w.id,
                label: w.isDefault ? `${w.name} (principal)` : w.name,
              }))}
            />
          </div>
        ) : null}
        <DateRangeFilter from={raw.desde} to={raw.hasta} />

        <div className="flex items-center gap-2">
          <button type="submit" className={primaryButtonClass}>Filtrar</button>
          {hasFilters ? (
            <Link href="/dashboard/inventario/movimientos" className={secondaryButtonClass}>Limpiar</Link>
          ) : null}
        </div>
      </form>

      <div className={cardClass + " p-4"}>
        {mapped.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">
            {hasFilters ? "Ningún movimiento coincide con el filtro." : "Sin movimientos."}
          </p>
        ) : (
          <MovementsList movements={mapped} showWarehouse={multiWarehouse} writable={writable} />
        )}
      </div>
    </div>
  );
}
