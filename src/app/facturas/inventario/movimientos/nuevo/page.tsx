import Link from "next/link";
import { requireContext, canInventoryEdit } from "@/lib/auth";
import { listProducts, listWarehouses, getOrCreateDefaultWarehouse } from "@/lib/inventory";
import { cardClass, secondaryButtonClass } from "@/lib/ui";
import { MovementForm } from "@/app/facturas/inventario/movimientos/movement-form";

export default async function NuevoMovimientoPage(
  props: PageProps<"/facturas/inventario/movimientos/nuevo">,
) {
  const ctx = await requireContext("inventario");
  if (!canInventoryEdit(ctx)) {
    const { redirect } = await import("next/navigation");
    redirect("/facturas/inventario/movimientos");
  }

  const searchParams = await props.searchParams;
  const defaultProductId =
    typeof searchParams?.producto === "string" ? searchParams.producto : undefined;

  const [products, warehouses] = await Promise.all([
    listProducts(ctx.company.id),
    // Garantiza que exista la bodega por defecto antes de ofrecerla en el form.
    listWarehouses(ctx.company.id).then(async (w) =>
      w.length > 0 ? w : [await getOrCreateDefaultWarehouse(ctx.company.id)],
    ),
  ]);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Nuevo movimiento</h1>
          <p className="text-sm text-muted-foreground">
            Entradas, salidas, ajustes, mermas y stock inicial.
          </p>
        </div>
        <Link href="/facturas/inventario/movimientos" className={secondaryButtonClass}>
          Volver
        </Link>
      </div>
      <div className={cardClass + " p-5"}>
        <MovementForm
          products={products.map((p) => ({
            id: p.id,
            name: p.name,
            sku: p.sku,
            quantity: p.quantity,
          }))}
          warehouses={warehouses.map((w) => ({
            id: w.id,
            name: w.name,
            isDefault: w.isDefault ?? false,
          }))}
          defaultProductId={defaultProductId}
          today={today}
        />
      </div>
    </div>
  );
}
