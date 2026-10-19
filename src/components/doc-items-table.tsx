import Link from "next/link";

import { formatCLP } from "@/lib/money";
import { cardClass } from "@/lib/ui";

export type DocItemForTable = {
  id: string;
  name: string;
  quantity: { toString(): string };
  unitPrice: number;
  amount: number;
  product: { id: string; name: string; sku: string } | null;
};

function formatQuantity(raw: { toString(): string }): string {
  const value = Number(raw.toString());
  if (!Number.isFinite(value)) return raw.toString();
  return value.toLocaleString("es-CL", { maximumFractionDigits: 3 });
}

/**
 * Líneas de un documento. El neto del encabezado es el oficial: aquí solo se
 * muestra lo que trae el XML, por eso avisa si la suma no calza.
 */
export function DocItemsTable({
  items,
  netAmount,
  emptyNote = "Este documento no tiene detalle de ítems guardados. Solo la importación de un XML trae el detalle: la sincronización con el RCV y la carga manual guardan únicamente los totales.",
}: {
  items: DocItemForTable[];
  netAmount: number;
  emptyNote?: string;
}) {
  if (items.length === 0) {
    return (
      <section className={cardClass + " p-5"}>
        <h2 className="font-semibold">Detalle del documento</h2>
        <p className="mt-2 text-sm text-muted-foreground">{emptyNote}</p>
        <p className="mt-3 text-sm">
          <Link href="/facturas/importar" className="font-medium text-primary underline underline-offset-2">
            Importar el XML o el ZIP del respaldo del SII
          </Link>
          <span className="text-muted-foreground">
            {" "}
            — al subirlo, se agrega el detalle de ítems a los documentos que ya existen.
          </span>
        </p>
      </section>
    );
  }

  const suma = items.reduce((total, item) => total + item.amount, 0);
  const difiere = suma !== netAmount;

  return (
    <section className={cardClass + " p-5"}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-semibold">Detalle del documento</h2>
        <span className="text-xs text-muted-foreground">
          {items.length} {items.length === 1 ? "ítem" : "ítems"}
        </span>
      </div>

      <div className="mt-3 overflow-x-auto rounded-card border border-border">
        <table className="w-full min-w-[36rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-background text-left text-xs text-muted-foreground">
              <th className="px-3 py-2 font-medium">#</th>
              <th className="px-3 py-2 font-medium">Producto</th>
              <th className="px-3 py-2 text-right font-medium">Cantidad</th>
              <th className="px-3 py-2 text-right font-medium">Precio neto</th>
              <th className="px-3 py-2 text-right font-medium">Neto</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={item.id} className="border-b border-border last:border-0">
                <td className="tabular px-3 py-2 align-top text-muted-foreground">
                  {index + 1}
                </td>
                <td className="px-3 py-2 align-top">
                  <span className="block font-medium">{item.name}</span>
                  {item.product ? (
                    <Link
                      href={`/facturas/inventario/productos/${item.product.id}`}
                      className="mt-0.5 inline-flex items-center gap-1.5 text-xs text-primary underline-offset-2 hover:underline"
                    >
                      <span className="tabular rounded-full bg-primary-soft px-1.5 py-0.5 font-medium">
                        {item.product.sku}
                      </span>
                      {item.product.name}
                    </Link>
                  ) : (
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      Sin vincular al catálogo
                    </span>
                  )}
                </td>
                <td className="tabular px-3 py-2 text-right align-top">
                  {formatQuantity(item.quantity)}
                </td>
                <td className="tabular px-3 py-2 text-right align-top">
                  {formatCLP(item.unitPrice)}
                </td>
                <td className="tabular px-3 py-2 text-right align-top font-semibold">
                  {formatCLP(item.amount)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-border bg-background">
              <td colSpan={4} className="px-3 py-2 text-right text-xs text-muted-foreground">
                Suma de los ítems
              </td>
              <td className="tabular px-3 py-2 text-right font-semibold">{formatCLP(suma)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {difiere ? (
        <p className="mt-2 text-xs text-muted-foreground">
          El neto oficial del documento es {formatCLP(netAmount)}: puede diferir por descuentos,
          exentos o redondeos. El encabezado manda.
        </p>
      ) : null}
    </section>
  );
}
