import { PosProductsClient } from "@/app/pos/productos/products-client";
import { canWrite, requireContext } from "@/lib/auth";
import { listPosCatalog } from "@/lib/pos";
import { listWarehouses } from "@/lib/inventory";
import { transferPosStock } from "@/app/actions/pos";

export default async function PosProductosPage() {
  const ctx = await requireContext();
  const [products, warehouses] = await Promise.all([
    listPosCatalog(ctx.company.id),
    listWarehouses(ctx.company.id),
  ]);

  return (
    <PosProductsClient
      products={products}
      warehouses={warehouses}
      ivaRate={ctx.company.ivaRate}
      puedeEditar={canWrite(ctx, "ventas")}
      transferPosStock={transferPosStock}
    />
  );
}
