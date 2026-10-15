import Link from "next/link";

import { requireContext } from "@/lib/auth";
import { cardClass, controlClass } from "@/lib/ui";
import { formatCLP } from "@/lib/money";
import { listProducts } from "@/lib/inventory";
import { db } from "@/lib/db";
import { classifyAbcInventory } from "@/lib/inventory-abc";

export default async function InventoryAbcPage(props: PageProps<"/dashboard/inventario/reportes/abc">) {
  const ctx = await requireContext("inventario");
  const searchParams = await props.searchParams;

  // eslint-disable-next-line react-hooks/purity
  const now = new Date();
  const days = Math.max(1, Math.min(3650, Number(searchParams?.dias ?? "365") || 365));
  const fromDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  const [products, saleRows] = await Promise.all([
    listProducts(ctx.company.id, { q: "", categoryId: undefined, stock: "ALL" }),
    db.$queryRaw<{ productId: string; amount: string }[]>`
      SELECT i."productId" AS "productId", COALESCE(SUM(i.amount), 0)::text AS "amount"
      FROM "SaleItem" i
      INNER JOIN "Sale" s ON s.id = i."saleId"
      WHERE i."companyId" = ${ctx.company.id}
        AND s.date >= ${fromDate}
        AND i."productId" IS NOT NULL
      GROUP BY i."productId"
    `,
  ]);

  const saleAmountByProduct = new Map<string, number>();
  for (const row of saleRows) saleAmountByProduct.set(row.productId, Number(row.amount) || 0);

  const { rows, summary } = classifyAbcInventory(products, saleAmountByProduct, fromDate, now);


  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/dashboard/inventario" className="text-sm text-primary underline-offset-2 hover:underline">
          ← Volver a inventario
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">Clasificación ABC de inventario</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Productos ordenados por valor de venta desde {fromDate.toISOString().slice(0, 10)} hasta {now.toISOString().slice(0, 10)}.
        </p>
      </div>

      <form method="get" className="flex items-end gap-2">
        <input name="dias" type="number" min={1} max={3650} defaultValue={days} className={controlClass + " w-24 tabular"} />
        <button type="submit" className="rounded-control border border-border bg-transparent px-3 py-2 text-sm text-foreground">Actualizar</button>
      </form>

      <div className="grid gap-3 sm:grid-cols-3">
        {(["A", "B", "C"] as const).map((group) => (
          <div key={group} className={cardClass + " p-4"}>
            <div className="text-xs text-muted-foreground">Clase {group}</div>
            <div className="mt-1 text-xl font-semibold">{summary[group].length} productos</div>
            <div className="text-sm text-muted-foreground tabular">{formatCLP(summary[group].reduce((sum, row) => sum + row.amount, 0))}</div>
          </div>
        ))}
      </div>

      <section className={cardClass + " overflow-x-auto"}>
        <table className="w-full min-w-[72rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="px-3 py-2 font-medium">SKU</th>
              <th className="px-3 py-2 font-medium">Producto</th>
              <th className="px-3 py-2 font-medium">Clase</th>
              <th className="tabular px-3 py-2 text-right font-medium">Ventas</th>
              <th className="tabular px-3 py-2 text-right font-medium">Participación acumulada</th>
              <th className="tabular px-3 py-2 text-right font-medium">Stock actual</th>
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
                <td className="px-3 py-2.5 font-semibold">{product.abc}</td>
                <td className="tabular px-3 py-2.5 text-right">{formatCLP(product.amount)}</td>
                <td className="tabular px-3 py-2.5 text-right">{product.cumulativePercentage}%</td>
                <td className="tabular px-3 py-2.5 text-right">
                  {Number(product.quantity).toLocaleString("es-CL", { maximumFractionDigits: 3 })}
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-6 text-sm text-muted-foreground">No hay ventas con productos vinculados en el período.</td></tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </div>
  );
}