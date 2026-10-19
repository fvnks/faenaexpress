import Link from "next/link";

import { requireContext } from "@/lib/auth";
import { cardClass, controlClass } from "@/lib/ui";
import { formatCLP, formatDate } from "@/lib/money";
import { listProducts } from "@/lib/inventory";
import { db } from "@/lib/db";

export default async function InventoryTurnoverPage(props: PageProps<"/facturas/inventario/reportes/rotacion">) {
  const ctx = await requireContext("inventario");
  const searchParams = await props.searchParams;

  // eslint-disable-next-line react-hooks/purity
  const now = new Date();
  const days = Math.max(1, Math.min(3650, Number(searchParams?.dias ?? "90") || 90));
  const fromDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  const [products, soldRows] = await Promise.all([
    listProducts(ctx.company.id, { q: "", categoryId: undefined, stock: "ALL" }),
    db.$queryRaw<{ productId: string; sold: string }[]>`
      SELECT i."productId" AS "productId", COALESCE(SUM(i.quantity), 0)::text AS "sold"
      FROM "SaleItem" i
      INNER JOIN "Sale" s ON s.id = i."saleId"
      WHERE i."companyId" = ${ctx.company.id}
        AND s.date >= ${fromDate}
        AND i."productId" IS NOT NULL
      GROUP BY i."productId"
    `,
  ]);

  const soldByProduct = new Map<string, number>();
  for (const row of soldRows) soldByProduct.set(row.productId, Number(row.sold) || 0);

  const rows = products
    .filter((product) => Number(product.quantity) > 0)
    .map((product) => {
      const quantity = Number(product.quantity);
      const sold = soldByProduct.get(product.id) ?? 0;
      const avgDaily = sold > 0 ? sold / days : 0;
      const daysCover = avgDaily > 0 ? quantity / avgDaily : null;
      const avgCost = Number(product.avgCost);
      return { ...product, quantity, sold, daysCover, value: Math.round(quantity * avgCost) };
    })
    .sort((a, b) => (b.daysCover === null ? Number.POSITIVE_INFINITY : b.daysCover) - (a.daysCover === null ? Number.POSITIVE_INFINITY : a.daysCover));

  const slowCount = rows.filter((row) => row.daysCover === null || row.daysCover > 90).length;
  const totalValue = rows.reduce((sum, row) => sum + row.value, 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/facturas/inventario" className="text-sm text-primary underline-offset-2 hover:underline">
          ← Volver a inventario
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">Rotación y cobertura de inventario</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ventas por producto desde {fromDate.toISOString().slice(0, 10)} hasta {now.toISOString().slice(0, 10)}. Stock actual: {formatCLP(totalValue)}.
        </p>
      </div>

      <form method="get" className="flex items-end gap-2">
        <input name="dias" type="number" min={1} max={3650} defaultValue={days} className={controlClass + " w-24 tabular"} />
        <button type="submit" className="rounded-control border border-border bg-transparent px-3 py-2 text-sm text-foreground">Actualizar</button>
      </form>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className={cardClass + " p-4"}>
          <div className="text-xs text-muted-foreground">Productos con stock</div>
          <div className="mt-1 text-xl font-semibold">{rows.length}</div>
        </div>
        <div className={cardClass + " p-4"}>
          <div className="text-xs text-muted-foreground">Cobertura mayor a 90 días o sin venta</div>
          <div className="mt-1 text-xl font-semibold">{slowCount}</div>
        </div>
        <div className={cardClass + " p-4"}>
          <div className="text-xs text-muted-foreground">Valor del stock analizado</div>
          <div className="mt-1 text-xl font-semibold tabular">{formatCLP(totalValue)}</div>
        </div>
      </div>

      <section className={cardClass + " overflow-x-auto"}>
        <table className="w-full min-w-[72rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="px-3 py-2 font-medium">SKU</th>
              <th className="px-3 py-2 font-medium">Producto</th>
              <th className="tabular px-3 py-2 text-right font-medium">Stock</th>
              <th className="tabular px-3 py-2 text-right font-medium">Ventas</th>
              <th className="tabular px-3 py-2 text-right font-medium">Cobertura (días)</th>
              <th className="tabular px-3 py-2 text-right font-medium">Valor stock</th>
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
                <td className="tabular px-3 py-2.5 text-right">{Number(product.quantity).toLocaleString("es-CL", { maximumFractionDigits: 3 })}</td>
                <td className="tabular px-3 py-2.5 text-right">{product.sold.toLocaleString("es-CL", { maximumFractionDigits: 3 })}</td>
                <td className="tabular px-3 py-2.5 text-right">
                  {product.daysCover === null ? "Sin venta" : Math.round(product.daysCover).toLocaleString("es-CL")}
                </td>
                <td className="tabular px-3 py-2.5 text-right font-semibold">{formatCLP(product.value)}</td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-6 text-sm text-muted-foreground">No hay productos con stock.</td></tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </div>
  );
}