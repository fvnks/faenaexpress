import Link from "next/link";

import { canInventoryEdit, requireContext } from "@/lib/auth";
import { getOrCreateDefaultWarehouse, listWarehouses } from "@/lib/inventory";
import { cardClass, secondaryButtonClass } from "@/lib/ui";
import { CountForm } from "@/app/facturas/inventario/conteos/count-form";

export default async function NuevoConteoPage() {
  const ctx = await requireContext("inventario");
  if (!canInventoryEdit(ctx)) {
    const { redirect } = await import("next/navigation");
    redirect("/facturas/inventario/conteos");
  }

  const [warehouses] = await Promise.all([
    listWarehouses(ctx.company.id).then(async (w) =>
      w.length > 0 ? w : [await getOrCreateDefaultWarehouse(ctx.company.id)],
    ),
  ]);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Nuevo conteo físico</h1>
          <p className="text-sm text-muted-foreground">
            Abre un inventario cíclico sobre una bodega.
          </p>
        </div>
        <Link href="/facturas/inventario/conteos" className={secondaryButtonClass}>
          Volver
        </Link>
      </div>
      <div className={cardClass + " p-5"}>
        <CountForm
          warehouses={warehouses.map((w) => ({
            id: w.id,
            name: w.name,
            isDefault: w.isDefault ?? false,
          }))}
          today={today}
        />
      </div>
    </div>
  );
}
