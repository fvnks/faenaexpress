import Link from "next/link";

import { requireContext, canInventoryEdit, canInventoryRead } from "@/lib/auth";
import { cardClass, controlClass, labelClass, primaryButtonClass } from "@/lib/ui";
import { formatDate, formatCLP } from "@/lib/money";
import { listProducts, listWarehouses } from "@/lib/inventory";
import { db } from "@/lib/db";
import { createProductLot, deleteLotAction } from "@/app/actions/inventory-lots";
import { ConfirmSubmit } from "@/components/confirm-submit";

export default async function ProductLotsPage(props: PageProps<"/facturas/inventario/lotes">) {
  const ctx = await requireContext("inventario");
  if (!canInventoryRead(ctx)) {
    const { redirect } = await import("next/navigation");
    redirect("/facturas");
  }

  const searchParams = await props.searchParams;
  const writable = canInventoryEdit(ctx);
  const [lots, products, warehouses] = await Promise.all([
    db.productLot.findMany({
      where: { companyId: ctx.company.id },
      include: { product: { include: { unit: true } }, warehouse: true },
      orderBy: [{ expirationDate: "asc" }, { createdAt: "desc" }],
    }),
    listProducts(ctx.company.id, { q: "", categoryId: undefined, stock: "ALL" }),
    listWarehouses(ctx.company.id),
  ]);

  const error = typeof searchParams?.error === "string" ? searchParams.error : null;

  // eslint-disable-next-line react-hooks/purity
  const now = new Date();
  const rows = lots.map((lot) => {
    const expirationDate = lot.expirationDate ? new Date(lot.expirationDate) : null;
    const daysToExpire = expirationDate ? Math.ceil((expirationDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)) : null;
    return { ...lot, expirationDate, daysToExpire };
  });
  const expiredCount = rows.filter((lot) => lot.daysToExpire !== null && lot.daysToExpire < 0).length;
  const soonCount = rows.filter((lot) => lot.daysToExpire !== null && lot.daysToExpire >= 0 && lot.daysToExpire <= 30).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/facturas/inventario" className="text-sm text-primary underline-offset-2 hover:underline">
            ← Volver a inventario
          </Link>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">Lotes y vencimiento</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Control manual de lotes y fechas de caducidad. Los lotes se gestionan sin alterar automáticamente el stock actual.
          </p>
          {error ? <div className="mt-2 rounded-control border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</div> : null}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className={cardClass + " p-4"}>
          <div className="text-xs text-muted-foreground">Lotes activos</div>
          <div className="mt-1 text-xl font-semibold">{rows.length}</div>
        </div>
        <div className={cardClass + " p-4"}>
          <div className="text-xs text-muted-foreground">Vencidos</div>
          <div className="mt-1 text-xl font-semibold text-danger">{expiredCount}</div>
        </div>
        <div className={cardClass + " p-4"}>
          <div className="text-xs text-muted-foreground">Vencen en 30 días</div>
          <div className="mt-1 text-xl font-semibold text-accent">{soonCount}</div>
        </div>
      </div>

      {writable ? (
        <section className={cardClass + " p-5"}>
          <h2 className="font-semibold">Nuevo lote</h2>
          <form action={createProductLot} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="productId" className={labelClass}>Producto</label>
              <select id="productId" name="productId" className={controlClass} required>
                <option value="">Seleccionar…</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>{product.sku} - {product.name}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="warehouseId" className={labelClass}>Bodega</label>
              <select id="warehouseId" name="warehouseId" className={controlClass}>
                <option value="">Por defecto</option>
                {warehouses.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="code" className={labelClass}>Código de lote</label>
              <input id="code" name="code" className={controlClass} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="quantity" className={labelClass}>Cantidad</label>
              <input id="quantity" name="quantity" type="number" min="0.001" step="0.001" className={controlClass} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="expirationDate" className={labelClass}>Vencimiento</label>
              <input id="expirationDate" name="expirationDate" type="text" data-date="1" pattern="^\d{2}-\d{2}-\d{4}$" placeholder="DD-MM-AAAA" className={controlClass} />
            </div>
            <div className="flex flex-col gap-1.5 lg:col-span-2">
              <label htmlFor="notes" className={labelClass}>Notas</label>
              <textarea id="notes" name="notes" className={controlClass} rows={2} />
            </div>
            <div className="flex items-end">
              <button type="submit" className={primaryButtonClass}>Guardar lote</button>
            </div>
          </form>
        </section>
      ) : null}

      <section className={cardClass + " overflow-x-auto"}>
        <table className="w-full min-w-[64rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="px-3 py-2 font-medium">Producto</th>
              <th className="px-3 py-2 font-medium">Código</th>
              <th className="px-3 py-2 font-medium">Bodega</th>
              <th className="tabular px-3 py-2 text-right font-medium">Cantidad</th>
              <th className="px-3 py-2 font-medium">Vencimiento</th>
              <th className="px-3 py-2 font-medium">Días restantes</th>
              {writable ? <th className="px-3 py-2" /> : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((lot) => (
              <tr key={lot.id} className="border-b border-border last:border-0">
                <td className="px-3 py-2.5">
                  <div>{lot.product.name}</div>
                  <div className="text-xs text-muted-foreground">{lot.product.sku}</div>
                </td>
                <td className="px-3 py-2.5 font-medium">{lot.code}</td>
                <td className="px-3 py-2.5 text-muted-foreground">{lot.warehouse?.name ?? "Por defecto"}</td>
                <td className="tabular px-3 py-2.5 text-right">{Number(lot.quantity).toLocaleString("es-CL", { maximumFractionDigits: 3 })}</td>
                <td className="px-3 py-2.5 text-muted-foreground">{lot.expirationDate ? formatDate(lot.expirationDate) : "Sin fecha"}</td>
                <td className={"tabular px-3 py-2.5 text-right " + (lot.daysToExpire !== null && lot.daysToExpire < 0 ? "text-danger font-semibold" : lot.daysToExpire !== null && lot.daysToExpire <= 30 ? "text-accent font-semibold" : "text-muted-foreground")}>
                  {lot.daysToExpire === null ? "—" : lot.daysToExpire}
                </td>
                {writable ? (
                  <td className="px-3 py-2.5">
                    <form action={deleteLotAction}>
                      <input type="hidden" name="lotId" value={lot.id} />
                      <ConfirmSubmit
                        title="Eliminar lote"
                        description={`Se eliminará el lote ${lot.code}. Esta acción no se puede deshacer.`}
                        confirmLabel="Eliminar"
                        className="text-sm text-danger underline-offset-2 hover:underline"
                      >
                        Eliminar
                      </ConfirmSubmit>
                    </form>
                  </td>
                ) : null}
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr><td colSpan={writable ? 7 : 6} className="px-4 py-6 text-sm text-muted-foreground">No hay lotes registrados.</td></tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </div>
  );
}