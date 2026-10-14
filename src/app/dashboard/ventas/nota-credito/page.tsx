import Link from "next/link";

import { requireContext, canWrite } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatCLP, formatDate } from "@/lib/money";
import { cardClass, primaryButtonClass } from "@/lib/ui";

export default async function NotaCreditoPage() {
  const ctx = await requireContext("ventas");
  const { company } = ctx;
  const items = await db.sale.findMany({
    where: { companyId: company.id, documentType: "CREDIT_NOTE" },
    include: { partner: true, salesperson: true },
    orderBy: { date: "desc" },
  });

  const writable = canWrite(ctx, "ventas");
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notas de Crédito</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Notas de crédito emitidas y recibidas. Total: {items.length}{" "}
            {items.length === 1 ? "registro" : "registros"}.
          </p>
        </div>
        {writable ? (
          <Link href="/dashboard/ventas/nueva" className={primaryButtonClass}>
            Nueva nota de crédito
          </Link>
        ) : null}
      </div>

      {items.length === 0 ? (
        <div className={cardClass + " px-4 py-10 text-center"}>
          <p className="font-medium">Aún no registra notas de crédito.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Regístrelas desde Ventas con el tipo de documento &quot;Nota de crédito&quot; y
            asócielas a una factura original.
          </p>
        </div>
      ) : (
        <div className={cardClass + " overflow-x-auto"}>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-3 py-2 font-medium">Fecha</th>
                <th className="px-3 py-2 font-medium">N° doc.</th>
                <th className="px-3 py-2 font-medium">Cliente</th>
                <th className="px-3 py-2 font-medium">Factura original</th>
                <th className="px-3 py-2 text-right font-medium">Total</th>
                <th className="px-3 py-2 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {items.map((n) => (
                <tr
                  key={n.id}
                  className="border-b border-border last:border-0 hover:bg-primary-soft/30 transition-colors"
                >
                  <td className="tabular whitespace-nowrap px-3 py-2 align-top">
                    {formatDate(n.date)}
                  </td>
                  <td className="tabular px-3 py-2 align-top">{n.documentNumber ?? "—"}</td>
                  <td className="px-3 py-2 align-top">{n.partner.name}</td>
                  <td className="tabular px-3 py-2 align-top">
                    {n.facturaOriginal ?? n.referenceDocumentNumber ?? "—"}
                  </td>
                  <td className="tabular whitespace-nowrap px-3 py-2 text-right align-top font-semibold">
                    {formatCLP(n.totalAmount)}
                  </td>
                  <td className="px-3 py-2 align-top">{n.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
