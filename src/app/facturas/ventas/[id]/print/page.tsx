import Link from "next/link";
import { notFound } from "next/navigation";

import { PrintButton } from "@/components/print-button";
import { requireContext } from "@/lib/auth";
import { formatCLP, formatDate } from "@/lib/money";
import { getSale } from "@/lib/sales";

export default async function SalePrintPage(props: PageProps<"/facturas/ventas/[id]/print">) {
  const ctx = await requireContext("ventas");
  const { id } = await props.params;
  const sale = await getSale(ctx.company.id, id);

  if (!sale) {
    notFound();
  }

  const total = Number(sale.totalAmount.toString());
  const retention = Number(sale.retentionAmount.toString());
  const toCollect = Math.max(total - retention, 0);

  return (
    <div className="flex min-h-screen flex-col bg-white text-black">
      <div className="no-print sticky top-0 z-10 flex items-center justify-between border-b border-gray-300 bg-gray-100 px-4 py-3">
        <h1 className="text-sm font-semibold">Vista de impresión — Factura {sale.documentNumber ?? ""}</h1>
        <div className="flex gap-2">
          <Link
            href={`/facturas/ventas/${sale.id}`}
            className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm hover:bg-gray-50"
          >
            Volver
          </Link>
          <PrintButton />
        </div>
      </div>

      <div className="mx-auto w-full max-w-3xl p-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{sale.partner.name}</h1>
            <p className="mt-1 text-sm text-gray-600">
              {sale.partner.rut ? `RUT ${sale.partner.rut}` : "Sin RUT"}
            </p>
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold">Factura {sale.documentNumber ?? ""}</p>
            <p className="text-sm text-gray-600">{formatDate(sale.date)}</p>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-6">
          <div>
            <h2 className="text-sm font-semibold text-gray-500">Montos</h2>
            <dl className="mt-2 space-y-1 text-sm">
              <div className="flex justify-between">
                <dt>Neto</dt>
                <dd className="tabular">{formatCLP(sale.netAmount)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>IVA</dt>
                <dd className="tabular">{formatCLP(sale.ivaAmount)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Retención</dt>
                <dd className="tabular">{retention > 0 ? formatCLP(retention) : "—"}</dd>
              </div>
              <div className="flex justify-between border-t border-gray-300 pt-1 font-semibold">
                <dt>Total</dt>
                <dd className="tabular">{formatCLP(total)}</dd>
              </div>
              <div className="flex justify-between text-gray-600">
                <dt>A cobrar</dt>
                <dd className="tabular">{formatCLP(toCollect)}</dd>
              </div>
            </dl>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-500">Documento</h2>
            <dl className="mt-2 space-y-1 text-sm">
              <div className="flex justify-between">
                <dt>Fecha</dt>
                <dd className="tabular">{formatDate(sale.date)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Vendedor</dt>
                <dd>{sale.salesperson?.name ?? "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt>OC</dt>
                <dd>{sale.purchaseOrder ?? "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Guía</dt>
                <dd>{sale.dispatchGuide ?? "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt>HES</dt>
                <dd>{sale.hesNumber ?? "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Área</dt>
                <dd>{sale.area?.name ?? "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Categoría</dt>
                <dd>{sale.category?.name ?? "—"}</dd>
              </div>
            </dl>
          </div>
        </div>

        {sale.items.length > 0 ? (
          <div className="mt-8">
            <h2 className="text-sm font-semibold text-gray-500">Ítems</h2>
            <table className="mt-2 w-full text-sm">
              <thead>
                <tr className="border-b border-gray-300 text-left">
                  <th className="py-1 pr-2 font-medium">Producto</th>
                  <th className="py-1 pr-2 text-right font-medium">Cantidad</th>
                  <th className="py-1 pr-2 text-right font-medium">Precio</th>
                  <th className="py-1 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {sale.items.map((item) => (
                  <tr key={item.id} className="border-b border-gray-200">
                    <td className="py-1 pr-2">{item.name}</td>
                    <td className="py-1 pr-2 text-right tabular">{Number(item.quantity)}</td>
                    <td className="py-1 pr-2 text-right tabular">{formatCLP(item.unitPrice)}</td>
                    <td className="py-1 text-right tabular">{formatCLP(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {sale.notes ? (
          <div className="mt-8">
            <h2 className="text-sm font-semibold text-gray-500">Observaciones</h2>
            <p className="mt-1 text-sm whitespace-pre-line">{sale.notes}</p>
          </div>
        ) : null}

        <div className="mt-8 border-t border-gray-300 pt-4 text-xs text-gray-500">
          <p>Registrada por {sale.createdBy.name}</p>
          <p>Estado: {sale.status}</p>
        </div>
      </div>
    </div>
  );
}
