import { PosProductsClient } from "@/app/pos/productos/products-client";
import { canWrite, requireContext } from "@/lib/auth";
import { listPosCatalog } from "@/lib/pos";

export default async function PosProductosPage() {
  const ctx = await requireContext();
  const products = await listPosCatalog(ctx.company.id);

  return (
    <PosProductsClient
      products={products}
      ivaRate={ctx.company.ivaRate}
      puedeEditar={canWrite(ctx, "ventas")}
    />
  );
}
