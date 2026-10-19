import Link from "next/link";

import { requireContext } from "@/lib/auth";
import { cardClass, controlClass } from "@/lib/ui";
import { formatCLP } from "@/lib/money";
import { listProducts } from "@/lib/inventory";

type ProductRow = Awaited<ReturnType<typeof listProducts>>[number];
import { db } from "@/lib/db";

export default async function InventoryDeadStockPage(props: PageProps<"/facturas/inventario/reportes/stock-muerto">) {
  const ctx = await requireContext("inventario");
  const searchParams = await props.searchParams;
  const days = Math.max(1, Number(searchParams?.dias ?? "90") || 90);

  const [products, lastOut] = await Promise.all([
    listProducts(ctx.company.id, { q: "", categoryId: undefined, stock: "ALL" }),
    db.$queryRaw<{ productId: string; lastOutDate: Date }[]>`
      SELECT m."productId" AS "productId", MAX(m.date) AS "lastOutDate"
      FROM "StockMovement" m
      WHERE m."companyId" = ${ctx.company.id} AND m.type = 'OUT'
      GROUP BY m."productId"
    `,
  ]) as [ProductRow[], { productId: string; lastOutDate: Date }[]];

  const lastOutByProduct = new Map<string, Date>();
  for (const row of lastOut) lastOutByProduct.set(row.productId, new Date(row.lastOutDate));

  // eslint-disable-next-line react-hooks/purity
  const now = new Date();
  const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const rows = products
    .filter((product) => Number(product.quantity) > 0)
    .map((product) => {
      const lastOutDate = lastOutByProduct.get(product.id);
      return {
        ...product,
        lastOutDate,
        daysStale: lastOutDate
          ? Math.floor((now.getTime() - lastOutDate.getTime()) / (24 * 60 * 60 * 1000))
          : null,
      };
    })
    .filter((product) => product.lastOutDate == null || product.lastOutDate < cutoff)
    .sort((a, b) => Number(b.quantity) * Number(b.avgCost) - Number(a.quantity) * Number(a.avgCost));

  const totalValue = rows.reduce((sum, row) => sum + Math.round(Number(row.quantity) * Number(row.avgCost)), 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/facturas/inventario" className="text-sm text-primary underline-offset-2 hover:underline">
          ← Volver a inventario
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">Stock muerto / lento</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Productos con stock y sin salida en los últimos {days} días. Valor estimado: {formatCLP(totalValue)}.
        </p>
      </div>

      <form method="get" className="flex items-end gap-2">
        <input name="dias" type="number" min={1} max={3650} defaultValue={days} className={controlClass + " w-24 tabular"} />
        <button type="submit" className="rounded-control border border-border bg-transparent px-3 py-2 text-sm text-foreground">Actualizar</button>
      </form>

      <section className={cardClass + " overflow-x-auto"}>
        <table className="w-full min-w-[64rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="px-3 py-2 font-medium">SKU</th>
              <th className="px-3 py-2 font-medium">Producto</th>
              <th className="tabular px-3 py-2 font-medium">Cantidad</th>
              <th className="tabular px-3 py-2 font-medium">Días sin salida</th>
              <th className="tabular px-3 py-2 font-medium">Última salida</th>
              <th className="tabular px-3 py-2 font-medium">Valor</th>
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
                <td className="tabular px-3 py-2.5 text-right">{product.daysStale ?? "Nunca"}</td>
                <td className="tabular px-3 py-2.5 text-right">{product.lastOutDate ? product.lastOutDate.toISOString().slice(0, 10) : "Nunca"}</td>
                <td className="tabular px-3 py-2.5 text-right font-semibold">{formatCLP(Math.round(Number(product.quantity) * Number(product.avgCost)))}</td>
              </tr>
            ))}
            {rows.length === 0 ? <tr><td colSpan={6} className="px-4 py-6 text-sm text-muted-foreground">No hay stock muerto para el período seleccionado.</td></tr> : null}
          </tbody>
        </table>
      </section>
    </div>
  );
}