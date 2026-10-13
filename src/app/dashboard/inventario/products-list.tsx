"use client";

import Link from "next/link";
import { cardClass, secondaryButtonClass } from "@/lib/ui";

type ProductRow = {
  id: string;
  sku: string;
  name: string;
  active: boolean;
  costNet: number;
  priceNet: number | null;
  minStock: string | null;
  quantity: string;
  avgCost: string;
  unitName: string | null;
  categoryName: string | null;
};

export function ProductsList({ products }: { products: ProductRow[] }) {
  return (
    <div className={cardClass + " overflow-x-auto"}>
      <table className="min-w-full divide-y divide-border text-sm">
        <thead>
          <tr className="text-left text-muted-foreground">
            <th className="px-4 py-2">SKU</th>
            <th className="px-4 py-2">Nombre</th>
            <th className="px-4 py-2">Unidad/Categoría</th>
            <th className="px-4 py-2 text-right">Stock</th>
            <th className="px-4 py-2 text-right">Costo prom.</th>
            <th className="px-4 py-2 text-right">Precio venta</th>
            <th className="px-4 py-2 text-right">Mínimo</th>
            <th className="px-4 py-2">Estado</th>
            <th className="px-4 py-2"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {products.length === 0 ? (
            <tr>
              <td colSpan={9} className="px-4 py-6 text-center text-muted-foreground">
                No hay productos aún.
              </td>
            </tr>
          ) : (
            products.map((p) => (
              <tr key={p.id} className="tabular">
                <td className="px-4 py-2 font-mono text-xs">{p.sku}</td>
                <td className="px-4 py-2">
                  <Link href={`/dashboard/inventario/productos/${p.id}`} className="text-primary hover:underline">
                    {p.name}
                  </Link>
                </td>
                <td className="px-4 py-2 text-muted-foreground">
                  {p.unitName || "—"} {p.categoryName ? `· ${p.categoryName}` : ""}
                </td>
                <td className="px-4 py-2 text-right">{p.quantity}</td>
                <td className="px-4 py-2 text-right">${Number(p.avgCost).toLocaleString("es-CL")}</td>
                <td className="px-4 py-2 text-right">{p.priceNet === null ? "—" : `$${p.priceNet.toLocaleString("es-CL")}`}</td>
                <td className="px-4 py-2 text-right">{p.minStock ?? "—"}</td>
                <td className="px-4 py-2">{p.active ? "Activo" : "Inactivo"}</td>
                <td className="px-4 py-2 text-right">
                  <Link href={`/dashboard/inventario/productos/${p.id}/editar`} className={secondaryButtonClass + " py-1.5 text-xs"}>
                    Editar
                  </Link>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
