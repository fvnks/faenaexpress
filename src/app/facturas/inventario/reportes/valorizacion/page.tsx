import Link from "next/link";

import { requireContext } from "@/lib/auth";
import { cardClass } from "@/lib/ui";
import { formatCLP } from "@/lib/money";
import { getInventoryKpis, listProducts } from "@/lib/inventory";

export default async function InventoryValuationPage(props: PageProps<"/facturas/inventario/reportes/valorizacion">) {
  const ctx = await requireContext("inventario");

  const [products, kpis] = await Promise.all([
    listProducts(ctx.company.id, { q: "", categoryId: undefined, stock: "ALL" }),
    getInventoryKpis(ctx.company.id),
  ]);

  const rows = products
    .map((product) => {
      const quantity = Number(product.quantity);
      const avgCost = Number(product.avgCost);
      const value = Math.round(quantity * avgCost);
      return { ...product, value };
    })
    .sort((a, b) => b.value - a.value);

  const totalValue = rows.reduce((sum, row) => sum + row.value, 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/facturas/inventario" className="text-sm text-primary underline-offset-2 hover:underline">
          ← Volver a inventario
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">Valuación de inventario</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Costo promedio ponderado (PPP) por producto. El total consolidado es {formatCLP(totalValue)}.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className={cardClass + " p-4"}>
          <div className="text-xs text-muted-foreground">Productos</div>
          <div className="mt-1 text-xl font-semibold">{kpis.products}</div>
        </div>
        <div className={cardClass + " p-4"}>
          <div className="text-xs text-muted-foreground">Valor consolidado</div>
          <div className="mt-1 text-xl font-semibold tabular">{formatCLP(kpis.stockValue)}</div>
        </div>
        <div className={cardClass + " p-4"}>
          <div className="text-xs text-muted-foreground">Bajo mínimo</div>
          <div className="mt-1 text-xl font-semibold">{kpis.belowMin}</div>
        </div>
        <div className={cardClass + " p-4"}>
          <div className="text-xs text-muted-foreground">Sin stock</div>
          <div className="mt-1 text-xl font-semibold">{kpis.outOfStock}</div>
        </div>
      </div>

      <section className={cardClass + " overflow-x-auto"}>
        <table className="w-full min-w-[60rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="px-3 py-2 font-medium">SKU</th>
              <th className="px-3 py-2 font-medium">Producto</th>
              <th className="px-3 py-2 font-medium">Unidad</th>
              <th className="tabular px-3 py-2 text-right font-medium">Cantidad</th>
              <th className="tabular px-3 py-2 text-right font-medium">Costo neto</th>
              <th className="tabular px-3 py-2 text-right font-medium">Valor</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((product) => (
              <tr key={product.id} className="border-b border-border last:border-0">
                <td className="px-3 py-2.5 font-medium">{product.sku}</td>
                <td className="px-3 py-2.5">
                  <div>{product.name}</div>
                  {product.categoryName ? <div className="text-xs text-muted-foreground">{product.categoryName}</div> : null}
                </td>
                <td className="px-3 py-2.5 text-muted-foreground">{product.unitName ?? "—"}</td>
                <td className="tabular px-3 py-2.5 text-right">{Number(product.quantity).toLocaleString("es-CL", { maximumFractionDigits: 3 })}</td>
                <td className="tabular px-3 py-2.5 text-right">{formatCLP(product.costNet)}</td>
                <td className="tabular px-3 py-2.5 text-right font-semibold">{formatCLP(product.value)}</td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-sm text-muted-foreground">No hay productos con inventario.</td>
              </tr>
            ) : (
              <tr className="border-t border-border font-semibold">
                <td className="px-3 py-2.5" colSpan={5}>Valor total del stock</td>
                <td className="tabular px-3 py-2.5 text-right">{formatCLP(totalValue)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}