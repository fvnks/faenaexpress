import Link from "next/link";

import { requireContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatCLP } from "@/lib/money";
import { cardClass, secondaryButtonClass } from "@/lib/ui";

export default async function ReordenPage() {
  const ctx = await requireContext("inventario");

  const [stocks, products] = await Promise.all([
    db.productStock.groupBy({
      by: ["productId"],
      where: { companyId: ctx.company.id },
      _sum: { quantity: true },
    }),
    db.product.findMany({
      where: {
        companyId: ctx.company.id,
        active: true,
        tracksStock: true,
        OR: [{ reorderPoint: { not: null } }, { minStock: { not: null } }],
      },
      orderBy: { name: "asc" },
      select: {
        id: true, sku: true, name: true, costNet: true,
        reorderPoint: true, minStock: true, reorderQty: true, leadTimeDays: true,
        supplier: { select: { name: true } },
      },
    }),
  ]);

  const totalPorProducto = new Map(stocks.map((s) => [s.productId, Number(s._sum.quantity ?? 0)]));
  const filas = products
    .map((p) => {
      const umbral = Number(p.reorderPoint ?? p.minStock ?? 0);
      const hay = totalPorProducto.get(p.id) ?? 0;
      const sugerido = p.reorderQty
        ? Number(p.reorderQty)
        : Math.max(1, Math.round(umbral * 2 - hay));
      return { ...p, umbral, hay, sugerido, costo: sugerido * p.costNet };
    })
    .filter((f) => f.hay <= f.umbral)
    .sort((a, b) => a.hay / Math.max(a.umbral, 1) - b.hay / Math.max(b.umbral, 1));

  const totalCompra = filas.reduce((s, f) => s + f.costo, 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-primary">Índice / Inventario</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Reposición sugerida</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Productos en o bajo su punto de reorden. La sugerencia usa la cantidad fija del producto o, si no la hay, el doble del umbral menos el stock actual.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Productos en alerta", value: String(filas.length) },
          { label: "Sin stock", value: String(filas.filter((f) => f.hay <= 0).length) },
          { label: "Compra estimada", value: formatCLP(totalCompra) },
        ].map((kpi) => (
          <div key={kpi.label} className={`${cardClass} p-4`}>
            <p className="text-xs text-muted-foreground">{kpi.label}</p>
            <p className="tabular mt-1 text-xl font-bold">{kpi.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href="/facturas/inventario/reorden/export" className={secondaryButtonClass}>Exportar CSV</Link>
        <Link href="/facturas/notificaciones" className={secondaryButtonClass}>Ver alertas</Link>
      </div>

      <section className={`${cardClass} overflow-x-auto`}>
        <div className="border-b border-border px-4 py-3">
          <h2 className="font-semibold">Productos a reponer</h2>
        </div>
        {filas.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            No hay productos bajo su punto de reorden. Configura el punto de reorden en la ficha de cada producto.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky-table-head text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Producto</th>
                <th className="px-3 py-2 text-left">Proveedor</th>
                <th className="px-3 py-2 text-right">Stock</th>
                <th className="px-3 py-2 text-right">Punto</th>
                <th className="px-3 py-2 text-right">Reponer</th>
                <th className="px-3 py-2 text-right">Plazo</th>
                <th className="px-3 py-2 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filas.map((f) => (
                <tr key={f.id}>
                  <td className="px-3 py-2">
                    <span className="font-mono text-xs text-muted-foreground">{f.sku}</span>
                    <span className="ml-2 font-medium">{f.name}</span>
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{f.supplier?.name ?? "Sin proveedor"}</td>
                  <td className="px-3 py-2 text-right tabular">{f.hay.toFixed(3)}</td>
                  <td className="px-3 py-2 text-right tabular">{f.umbral.toFixed(3)}</td>
                  <td className="px-3 py-2 text-right tabular font-semibold">{f.sugerido}</td>
                  <td className="px-3 py-2 text-right text-xs text-muted-foreground">
                    {f.leadTimeDays ? `${f.leadTimeDays} d` : "—"}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Link href={`/facturas/compras/nueva?producto=${f.id}&cantidad=${f.sugerido}`} className="text-xs text-primary hover:underline">
                      Registrar compra
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
