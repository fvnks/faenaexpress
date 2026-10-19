import Link from "next/link";

import { convertQuoteToInvoice } from "@/app/actions/sales";

import { requireContext, canWrite } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatCLP, formatDate } from "@/lib/money";
import { cardClass, primaryButtonClass } from "@/lib/ui";

export default async function CotizacionesPage() {
  const ctx = await requireContext("ventas");
  const { company } = ctx;
  const items = await db.sale.findMany({
    where: { companyId: company.id, documentType: "QUOTATION" },
    include: { partner: true, salesperson: true },
    orderBy: { date: "desc" },
  });

  const writable = canWrite(ctx, "ventas");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cotizaciones</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Cotizaciones enviadas a clientes. Total: {items.length}{" "}
            {items.length === 1 ? "cotización" : "cotizaciones"}.
          </p>
        </div>
        {writable ? (
          <Link href="/facturas/ventas/nueva?tipo=QUOTATION" className={primaryButtonClass}>
            Nueva cotización
          </Link>
        ) : null}
      </div>

      {items.length === 0 ? (
        <div className={cardClass + " px-4 py-10 text-center"}>
          <p className="font-medium">Aún no registra cotizaciones.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Registre la primera cotización desde el botón arriba.
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
                <th className="px-3 py-2 text-right font-medium">Total</th>
                <th className="px-3 py-2 font-medium">Estado</th>
                <th className="px-3 py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {items.map((q) => (
                <tr
                  key={q.id}
                  className="border-b border-border last:border-0 hover:bg-primary-soft/30 transition-colors"
                >
                  <td className="tabular whitespace-nowrap px-3 py-2 align-top">
                    {formatDate(q.date)}
                  </td>
                  <td className="tabular px-3 py-2 align-top">{q.documentNumber ?? "—"}</td>
                  <td className="px-3 py-2 align-top">{q.partner.name}</td>
                  <td className="tabular whitespace-nowrap px-3 py-2 text-right align-top font-semibold">
                    {formatCLP(q.totalAmount)}
                  </td>
                  <td className="px-3 py-2 align-top">{q.status}</td>
                  <td className="px-3 py-2 align-top text-right">
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/facturas/ventas/${q.id}/editar`}
                        className="text-xs text-primary underline-offset-2 hover:underline"
                      >
                        Editar
                      </Link>
                      <form action={convertQuoteToInvoice}>
                        <input type="hidden" name="id" value={q.id} />
                        <button
                          type="submit"
                          className="text-xs text-accent underline-offset-2 hover:underline"
                        >
                          → Factura
                        </button>
                      </form>
                    </div>
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
