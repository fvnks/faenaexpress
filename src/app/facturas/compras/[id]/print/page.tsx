import Link from "next/link";
import { notFound } from "next/navigation";

import { PrintButton } from "@/components/print-button";
import { requireContext } from "@/lib/auth";
import { purchaseStatusLabel } from "@/lib/labels";
import { formatCLP, formatDate } from "@/lib/money";
import { getPurchase } from "@/lib/purchases";

export default async function PurchasePrintPage(props: PageProps<"/facturas/compras/[id]/print">) {
  const ctx = await requireContext("compras");
  const { id } = await props.params;
  const purchase = await getPurchase(ctx.company.id, id);
  if (!purchase) notFound();

  const total = Number(purchase.totalAmount.toString());
  const impuestoEspecifico = Number(purchase.impuestoEspecifico ?? 0);

  return (
    <div className="flex min-h-screen flex-col bg-white text-black">
      <div className="no-print sticky top-0 z-10 flex items-center justify-between border-b border-gray-300 bg-gray-100 px-4 py-3">
        <h1 className="text-sm font-semibold">
          Vista de impresión — Compra {purchase.documentNumber ?? ""}
        </h1>
        <div className="flex gap-2">
          <Link
            href={`/facturas/compras/${purchase.id}`}
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
            <h1 className="text-2xl font-bold">{purchase.partner.name}</h1>
            <p className="mt-1 text-sm text-gray-600">
              {purchase.partner.rut ? `RUT ${purchase.partner.rut}` : "Sin RUT"}
            </p>
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold">Compra {purchase.documentNumber ?? ""}</p>
            <p className="text-sm text-gray-600">{formatDate(purchase.date)}</p>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-6">
          <div>
            <h2 className="text-sm font-semibold text-gray-500">Montos</h2>
            <dl className="mt-2 space-y-1 text-sm">
              <div className="flex justify-between">
                <dt>Neto</dt>
                <dd className="tabular">{formatCLP(purchase.netAmount)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>IVA</dt>
                <dd className="tabular">{formatCLP(purchase.ivaAmount)}</dd>
              </div>
              {impuestoEspecifico !== 0 ? (
                <div className="flex justify-between">
                  <dt>Impuesto específico (combustible)</dt>
                  <dd className="tabular">{formatCLP(impuestoEspecifico)}</dd>
                </div>
              ) : null}
              <div className="flex justify-between border-t border-gray-300 pt-1 font-semibold">
                <dt>Total</dt>
                <dd className="tabular">{formatCLP(total)}</dd>
              </div>
            </dl>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-500">Datos del documento</h2>
            <dl className="mt-2 space-y-1 text-sm">
              <div className="flex justify-between">
                <dt>Vencimiento</dt>
                <dd>{purchase.dueDate ? formatDate(purchase.dueDate) : "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Medio de pago</dt>
                <dd>{purchase.paymentMethod ?? "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Fecha de pago</dt>
                <dd>{purchase.paymentDate ? formatDate(purchase.paymentDate) : "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Estado</dt>
                <dd>{purchaseStatusLabel(purchase.status)}</dd>
              </div>
            </dl>
          </div>
        </div>

        {purchase.items.length > 0 ? (
          <div className="mt-8">
            <h2 className="text-sm font-semibold text-gray-500">Ítems</h2>
            <table className="mt-2 w-full text-sm">
              <thead>
                <tr className="border-b border-gray-300 text-left text-xs text-gray-500">
                  <th className="py-1">Descripción</th>
                  <th className="py-1 text-right">Cant.</th>
                  <th className="py-1 text-right">P. unitario</th>
                  <th className="py-1 text-right">Importe</th>
                </tr>
              </thead>
              <tbody>
                {purchase.items.map((item) => (
                  <tr key={item.id} className="border-b border-gray-200">
                    <td className="py-1">{item.name}</td>
                    <td className="py-1 text-right tabular">{String(item.quantity)}</td>
                    <td className="py-1 text-right tabular">{formatCLP(item.unitPrice)}</td>
                    <td className="py-1 text-right tabular">{formatCLP(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {purchase.notes ? (
          <div className="mt-8">
            <h2 className="text-sm font-semibold text-gray-500">Observaciones</h2>
            <p className="mt-1 text-sm whitespace-pre-line">{purchase.notes}</p>
          </div>
        ) : null}

        <div className="mt-8 border-t border-gray-300 pt-4 text-xs text-gray-500">
          <p>Registrada por {purchase.createdBy.name}</p>
        </div>
      </div>
    </div>
  );
}
