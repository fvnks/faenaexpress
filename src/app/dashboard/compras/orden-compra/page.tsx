import { requireContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatCLP, formatDate } from "@/lib/money";
import { cardClass } from "@/lib/ui";

export default async function OrdenCompraPage() {
  const ctx = await requireContext("compras");
  const { company } = ctx;
  const items = await db.purchase.findMany({
    where: { companyId: company.id, purchaseOrder: { not: null } },
    include: { partner: true, category: true, area: true },
    orderBy: { date: "desc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Órdenes de Compra</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Facturas de compra asociadas a una orden de compra (OC). Total: {items.length}{" "}
          {items.length === 1 ? "registro" : "registros"}.
        </p>
      </div>

      {items.length === 0 ? (
        <div className={cardClass + " px-4 py-10 text-center"}>
          <p className="font-medium">Aún no registra órdenes de compra.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Asocie una OC a cada factura de compra desde el campo &quot;Orden de
            compra&quot; al registrar o editar.
          </p>
        </div>
      ) : (
        <div className={cardClass + " overflow-x-auto"}>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-3 py-2 font-medium">Fecha</th>
                <th className="px-3 py-2 font-medium">N° OC</th>
                <th className="px-3 py-2 font-medium">Proveedor</th>
                <th className="px-3 py-2 font-medium">N° factura</th>
                <th className="px-3 py-2 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-border last:border-0 hover:bg-primary-soft/30 transition-colors"
                >
                  <td className="tabular whitespace-nowrap px-3 py-2 align-top">
                    {formatDate(p.date)}
                  </td>
                  <td className="tabular px-3 py-2 align-top">{p.purchaseOrder}</td>
                  <td className="px-3 py-2 align-top">{p.partner.name}</td>
                  <td className="tabular px-3 py-2 align-top">
                    {p.documentNumber ?? "—"}
                  </td>
                  <td className="tabular whitespace-nowrap px-3 py-2 text-right align-top font-semibold">
                    {formatCLP(p.totalAmount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
