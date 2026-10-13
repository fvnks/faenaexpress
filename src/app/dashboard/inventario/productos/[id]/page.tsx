import Link from "next/link";
import { requireContext, canInventoryRead, canInventoryEdit } from "@/lib/auth";
import { getProductWithKardex } from "@/lib/inventory";
import { cardClass, primaryButtonClass, secondaryButtonClass } from "@/lib/ui";
import { stockMovementTypeLabel } from "@/lib/labels";
import { formatDate, formatCLP } from "@/lib/money";

// Etiqueta de bodega para el kardex: en transferencias se ve el traslado.
function movementWarehouse(m: { warehouse?: { name: string } | null; toWarehouse?: { name: string } | null }) {
  const from = m.warehouse?.name ?? null;
  const to = m.toWarehouse?.name ?? null;
  if (from && to) return `${from} → ${to}`;
  return from ?? "—";
}

export default async function ProductDetailPage(props: PageProps<"/dashboard/inventario/productos/[id]">) {
  const ctx = await requireContext("inventario");
  const params = await props.params;
  if (!canInventoryRead(ctx)) {
    const { redirect } = await import("next/navigation");
    redirect("/dashboard");
  }
  const data = await getProductWithKardex(ctx.company.id, params.id);
  if (!data) {
    const { redirect } = await import("next/navigation");
    redirect("/dashboard/inventario");
  }
  const product = data!.product;
  const stock = data!.stock;
  const stocks = data!.stocks;
  const movements = data!.movements;
  const showBreakdown = stocks.length > 1;
  const writable = canInventoryEdit(ctx);
  const margin = product.priceNet === null ? null : Math.trunc((product.priceNet * 100) / Math.max(1, product.costNet)) - 100;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{product.name}</h1>
          <p className="text-sm text-muted-foreground">SKU {product.sku}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/inventario" className={secondaryButtonClass}>Volver</Link>
          {writable ? (
            <Link href={`/dashboard/inventario/movimientos/nuevo?producto=${product.id}`} className={primaryButtonClass}>
              Registrar movimiento
            </Link>
          ) : null}
          {writable ? <Link href={`/dashboard/inventario/productos/${product.id}/editar`} className={secondaryButtonClass}>Editar</Link> : null}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className={cardClass + " p-4"}>
          <div className="text-sm text-muted-foreground">Stock total</div>
          <div className="text-xl font-semibold tabular">{stock ? stock.quantity.toFixed(3) : "0.000"}</div>
          <div className="text-xs text-muted-foreground mt-1">Costo prom. ${stock ? stock.avgCost.toFixed(4) : "0.0000"}</div>
        </div>
        <div className={cardClass + " p-4"}>
          <div className="text-sm text-muted-foreground">Costo / Precio</div>
          <div className="text-sm">${product.costNet.toLocaleString("es-CL")} / {product.priceNet ? "$" + product.priceNet.toLocaleString("es-CL") : "—"}</div>
          {margin !== null ? <div className="text-xs text-muted-foreground mt-1">Margen {margin >= 0 ? "+" : ""}{margin}%</div> : null}
        </div>
        <div className={cardClass + " p-4"}>
          <div className="text-sm text-muted-foreground">Mínimo / Ubicación</div>
          <div className="text-sm">{product.minStock ? Number(product.minStock).toFixed(3) : "—"} / {product.location || "—"}</div>
        </div>
      </div>
      {showBreakdown ? (
        <div className={cardClass + " overflow-x-auto"}>
          <div className="px-4 pt-4 text-sm font-semibold">Stock por bodega</div>
          <table className="min-w-full divide-y divide-border text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="px-4 py-2">Bodega</th>
                <th className="px-4 py-2 text-right">Cantidad</th>
                <th className="px-4 py-2 text-right">Costo prom.</th>
                <th className="px-4 py-2 text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border tabular">
              {stocks.map((s) => (
                <tr key={s.warehouseId}>
                  <td className="px-4 py-2">{s.warehouseName}</td>
                  <td className="px-4 py-2 text-right">{s.quantity.toFixed(3)}</td>
                  <td className="px-4 py-2 text-right">${s.avgCost.toFixed(4)}</td>
                  <td className="px-4 py-2 text-right">{formatCLP(Math.round(s.quantity.times(s.avgCost).toNumber()))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      <div className={cardClass + " overflow-x-auto"}>
        <table className="min-w-full divide-y divide-border text-sm">
          <thead>
            <tr className="text-left text-muted-foreground">
              <th className="px-4 py-2">Fecha</th>
              <th className="px-4 py-2">Tipo</th>
              {showBreakdown ? <th className="px-4 py-2">Bodega</th> : null}
              <th className="px-4 py-2 text-right">Cantidad</th>
              <th className="px-4 py-2 text-right">Costo unit.</th>
              <th className="px-4 py-2">Referencia/Razón</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border tabular">
            {movements.map((m) => (
              <tr key={m.id}>
                <td className="px-4 py-2">{formatDate(m.date)}</td>
                <td className="px-4 py-2">{stockMovementTypeLabel(m.type)}</td>
                {showBreakdown ? (
                  <td className="px-4 py-2 text-muted-foreground">{movementWarehouse(m)}</td>
                ) : null}
                <td className="px-4 py-2 text-right">{Number(m.quantity).toFixed(3)}</td>
                <td className="px-4 py-2 text-right">{m.unitCost ?? "—"}</td>
                <td className="px-4 py-2 text-muted-foreground">{m.reference || m.reason || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
