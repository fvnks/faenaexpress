import Link from "next/link";

import { SelectDropdown } from "@/components/select-dropdown";
import { canInventoryEdit, canInventoryRead, requireContext } from "@/lib/auth";
import { listProductCategories } from "@/lib/catalogs";
import { getInventoryKpis, listProducts, listWarehouses, parseProductFilters } from "@/lib/inventory";
import { formatCLP } from "@/lib/money";
import { cardClass, controlClass, labelClass, primaryButtonClass, secondaryButtonClass } from "@/lib/ui";
import { ProductsList } from "@/app/dashboard/inventario/products-list";

const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
const fieldRow = "flex min-w-[9rem] flex-1 flex-col gap-1.5";

function Kpi({ label, value, tone }: { label: string; value: string; tone?: "warning" | "danger" }) {
  const color = tone === "danger" ? "text-danger" : tone === "warning" ? "text-accent" : "";
  return (
    <div className={cardClass + " p-4"}>
      <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={"tabular mt-2 text-xl font-bold tracking-tight " + color}>{value}</div>
    </div>
  );
}

export default async function InventarioPage(props: PageProps<"/dashboard/inventario">) {
  const ctx = await requireContext("inventario");
  if (!canInventoryRead(ctx)) {
    const { redirect } = await import("next/navigation");
    redirect("/dashboard");
  }

  const searchParams = await props.searchParams;
  const raw = {
    q: one(searchParams.q),
    categoria: one(searchParams.categoria),
    bodega: one(searchParams.bodega),
    stock: one(searchParams.stock),
  };
  const filters = parseProductFilters(raw);

  const [products, kpis, categories, warehouses] = await Promise.all([
    listProducts(ctx.company.id, filters),
    getInventoryKpis(ctx.company.id),
    listProductCategories(ctx.company.id),
    listWarehouses(ctx.company.id),
  ]);
  const multiWarehouse = warehouses.length > 1;

  const hasFilters = Boolean(raw.q || raw.categoria || raw.bodega || raw.stock);
  const writable = canInventoryEdit(ctx);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Inventario</h1>
          <p className="text-sm text-muted-foreground">Productos, SKU y stock.</p>
        </div>
        {writable ? (
          <Link href="/dashboard/inventario/productos/nuevo" className={primaryButtonClass}>Nuevo producto</Link>
        ) : null}
        <Link href="/dashboard/inventario/reportes/valorizacion" className="text-sm text-primary underline-offset-2 hover:underline">
          Valuación de inventario
        </Link>
        <Link href="/dashboard/inventario/reportes/stock-muerto" className="text-sm text-primary underline-offset-2 hover:underline">
          Stock muerto / lento
        </Link>
        <Link href="/dashboard/inventario/reportes/rotacion" className="text-sm text-primary underline-offset-2 hover:underline">
          Rotación y cobertura
        </Link>
        <Link href="/dashboard/inventario/reportes/abc" className="text-sm text-primary underline-offset-2 hover:underline">
          Clasificación ABC
        </Link>
        <Link href="/dashboard/inventario/lotes" className="text-sm text-primary underline-offset-2 hover:underline">
          Lotes y vencimiento
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Productos" value={String(kpis.products)} />
        <Kpi label="Valor del stock" value={formatCLP(kpis.stockValue)} />
        <Kpi label="Bajo mínimo" value={String(kpis.belowMin)} tone={kpis.belowMin > 0 ? "warning" : undefined} />
        <Kpi label="Sin stock" value={String(kpis.outOfStock)} tone={kpis.outOfStock > 0 ? "danger" : undefined} />
      </div>

      <form method="get" className={cardClass + " flex flex-wrap items-end gap-3 p-4"}>
        <div className={fieldRow}>
          <label htmlFor="q" className={labelClass}>Buscar</label>
          <input
            id="q"
            name="q"
            defaultValue={raw.q ?? ""}
            placeholder="SKU o nombre…"
            className={controlClass}
          />
        </div>
        <div className={fieldRow + " sm:w-48"}>
          <label htmlFor="categoria" className={labelClass}>Categoría</label>
          <SelectDropdown
            id="categoria"
            name="categoria"
            value={raw.categoria ?? ""}
            emptyLabel="Todas"
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
          />
        </div>
        {multiWarehouse ? (
          <div className={fieldRow + " sm:w-48"}>
            <label htmlFor="bodega" className={labelClass}>Bodega</label>
            <SelectDropdown
              id="bodega"
              name="bodega"
              value={raw.bodega ?? ""}
              emptyLabel="Todas"
              options={warehouses.map((w) => ({
                value: w.id,
                label: w.isDefault ? `${w.name} (principal)` : w.name,
              }))}
            />
          </div>
        ) : null}
        <div className={fieldRow + " sm:w-44"}>
          <label htmlFor="stock" className={labelClass}>Stock</label>
          <SelectDropdown
            id="stock"
            name="stock"
            value={raw.stock ?? ""}
            emptyLabel="Todos"
            options={[
              { value: "bajo", label: "Bajo mínimo" },
              { value: "sin", label: "Sin stock" },
              { value: "ok", label: "Sobre el mínimo" },
            ]}
          />
        </div>
        <div className="flex items-center gap-2">
          <button type="submit" className={primaryButtonClass}>Filtrar</button>
          {hasFilters ? (
            <Link href="/dashboard/inventario" className={secondaryButtonClass}>Limpiar</Link>
          ) : null}
        </div>
      </form>

      <div className={cardClass + " p-4"}>
        {products.length === 0 && hasFilters ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">
            Ningún producto coincide con el filtro.
          </p>
        ) : (
          <ProductsList products={products} />
        )}
      </div>
    </div>
  );
}
