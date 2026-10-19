import Link from "next/link";
import { redirect } from "next/navigation";

import { ProductForm } from "@/app/facturas/inventario/product-form";
import { updateProduct } from "@/app/actions/inventory";
import { canInventoryEdit, requireContext } from "@/lib/auth";
import { listProductCategories, listUnits } from "@/lib/catalogs";
import { getProduct } from "@/lib/inventory";
import { listSuppliers } from "@/lib/partners";
import { cardClass, secondaryButtonClass } from "@/lib/ui";

export default async function EditarProductoPage(
  props: PageProps<"/facturas/inventario/productos/[id]/editar">,
) {
  const ctx = await requireContext("inventario");
  if (!canInventoryEdit(ctx)) redirect("/facturas/inventario");

  const { id } = await props.params;
  const product = await getProduct(ctx.company.id, id);
  if (!product) redirect("/facturas/inventario");

  const [units, categories, suppliers] = await Promise.all([
    listUnits(ctx.company.id),
    listProductCategories(ctx.company.id),
    listSuppliers(ctx.company.id),
  ]);

  const defaults = {
    sku: product.sku,
    name: product.name,
    unitId: product.unitId ?? "",
    categoryId: product.categoryId ?? "",
    supplierId: product.supplierId ?? "",
    location: product.location ?? "",
    costNet: product.costNet,
    priceNet: product.priceNet ?? "",
    minStock: product.minStock === null ? "" : Number(product.minStock).toFixed(3),
    tracksStock: product.tracksStock,
    ivaAffected: product.ivaAffected,
  };

  const action = updateProduct.bind(null, product.id);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Editar producto</h1>
          <p className="text-sm text-muted-foreground">
            SKU {product.sku} · el costo lo fija el promedio ponderado cuando hay stock.
          </p>
        </div>
        <Link
          href={`/facturas/inventario/productos/${product.id}`}
          className={secondaryButtonClass}
        >
          Volver
        </Link>
      </div>

      <div className={cardClass + " p-5"}>
        <ProductForm
          action={action}
          units={units}
          categories={categories}
          suppliers={suppliers}
          defaults={defaults}
          submitLabel="Guardar cambios"
        />
      </div>
    </div>
  );
}
