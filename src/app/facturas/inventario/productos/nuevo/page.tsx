import Link from "next/link";
import { requireContext, canInventoryEdit } from "@/lib/auth";
import { redirect } from "next/navigation";
import { listUnits, listProductCategories } from "@/lib/catalogs";
import { listSuppliers } from "@/lib/partners";
import { nextProductSku } from "@/lib/inventory";
import { cardClass, secondaryButtonClass } from "@/lib/ui";
import { ProductForm } from "@/app/facturas/inventario/product-form";
import { createProduct } from "@/app/actions/inventory";

export default async function NuevoProductoPage() {
  const ctx = await requireContext("inventario");
  if (!canInventoryEdit(ctx)) redirect("/facturas/inventario");
  const [units, categories, suppliers, nextSku] = await Promise.all([
    listUnits(ctx.company.id),
    listProductCategories(ctx.company.id),
    listSuppliers(ctx.company.id),
    nextProductSku(ctx.company.id),
  ]);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Nuevo producto</h1>
          <p className="text-sm text-muted-foreground">Crea un producto con SKU autogenerado editable.</p>
        </div>
        <Link href="/facturas/inventario" className={secondaryButtonClass}>Volver</Link>
      </div>
      <div className={cardClass + " p-5"}>
        <ProductForm action={createProduct} units={units} categories={categories} suppliers={suppliers} defaults={{ sku: nextSku }} submitLabel="Crear producto" />
      </div>
    </div>
  );
}
