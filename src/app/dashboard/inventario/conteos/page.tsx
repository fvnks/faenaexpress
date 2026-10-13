import Link from "next/link";

import { canInventoryEdit, canInventoryRead, requireContext } from "@/lib/auth";
import { listStockCounts } from "@/lib/stock-counts";
import { formatDate } from "@/lib/money";
import { cardClass, primaryButtonClass } from "@/lib/ui";
import { CountStatusBadge } from "@/app/dashboard/inventario/conteos/count-status-badge";

export default async function ConteosPage() {
  const ctx = await requireContext("inventario");
  if (!canInventoryRead(ctx)) {
    const { redirect } = await import("next/navigation");
    redirect("/dashboard");
  }

  const counts = await listStockCounts(ctx.company.id);
  const writable = canInventoryEdit(ctx);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Conteos físicos</h1>
          <p className="text-sm text-muted-foreground">
            Inventario cíclico: cuentas lo que hay y las diferencias se ajustan solas.
          </p>
        </div>
        {writable ? (
          <Link href="/dashboard/inventario/conteos/nuevo" className={primaryButtonClass}>
            Nuevo conteo
          </Link>
        ) : null}
      </div>

      <div className={cardClass + " overflow-x-auto"}>
        {counts.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">
            Aún no hay conteos.
          </p>
        ) : (
          <table className="min-w-full divide-y divide-border text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="px-4 py-2">Código</th>
                <th className="px-4 py-2">Fecha</th>
                <th className="px-4 py-2">Bodega</th>
                <th className="px-4 py-2">Estado</th>
                <th className="px-4 py-2 text-right">Contados</th>
                <th className="px-4 py-2 text-right">Con diferencia</th>
                <th className="px-4 py-2">Abierto por</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {counts.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-2">
                    <Link
                      href={`/dashboard/inventario/conteos/${c.id}`}
                      className="font-medium text-primary underline-offset-2 hover:underline"
                    >
                      {c.code}
                    </Link>
                  </td>
                  <td className="px-4 py-2 tabular">{formatDate(c.date)}</td>
                  <td className="px-4 py-2">{c.warehouseName}</td>
                  <td className="px-4 py-2"><CountStatusBadge status={c.status} /></td>
                  <td className="px-4 py-2 text-right tabular">
                    {c.countedItems}/{c.totalItems}
                  </td>
                  <td className={"px-4 py-2 text-right tabular " + (c.diffItems > 0 ? "text-accent" : "")}>
                    {c.diffItems}
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">{c.createdByName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
