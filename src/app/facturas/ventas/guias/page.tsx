import Link from "next/link";

import { GuideSaleLink } from "@/app/facturas/ventas/guias/guide-sale-link";
import { requireContext, canWrite } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatCLP, formatDate } from "@/lib/money";
import { cardClass, primaryButtonClass } from "@/lib/ui";

export default async function GuiasPage() {
  const ctx = await requireContext("ventas");
  const { company } = ctx;
  const items = await db.dispatchGuide.findMany({
    where: { companyId: company.id },
    include: {
      partner: true,
      salesperson: true,
      sale: { select: { id: true, documentNumber: true, date: true } },
    },
    orderBy: { date: "desc" },
  });

  // Las facturas candidatas para cada guía: las del mismo cliente. Se ofrecen
  // las más recientes, que son las que se están despachando ahora.
  const ventasPorCliente = await db.sale.findMany({
    where: {
      companyId: company.id,
      documentType: { in: ["INVOICE", "RECEIPT"] },
    },
    select: { id: true, partnerId: true, documentNumber: true, date: true },
    orderBy: { date: "desc" },
  });
  const candidatas = new Map<string, { id: string; etiqueta: string }[]>();
  for (const venta of ventasPorCliente) {
    const lista = candidatas.get(venta.partnerId) ?? [];
    if (lista.length >= 25) continue;
    lista.push({
      id: venta.id,
      etiqueta: `N° ${venta.documentNumber ?? "—"} · ${formatDate(venta.date)}`,
    });
    candidatas.set(venta.partnerId, lista);
  }

  const writable = canWrite(ctx, "ventas");
  const conFactura = items.filter((g) => g.saleId).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Guías de Despacho</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Guías de despacho electrónicas. Total: {items.length}{" "}
            {items.length === 1 ? "guía" : "guías"}
            {conFactura > 0 ? ` · ${conFactura} relacionadas con una factura de venta` : ""}.
          </p>
        </div>
        <Link href="/facturas/ventas/guias/nueva" className={primaryButtonClass}>
          Nueva guía
        </Link>
      </div>

      {items.length === 0 ? (
        <div className={cardClass + " px-4 py-10 text-center"}>
          <p className="font-medium">Aún no registra guías de despacho.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Las guías se traen del SII con la sincronización del RCV, o se registran a mano
            desde Inventario → Movimientos.
          </p>
        </div>
      ) : (
        <div className={cardClass + " overflow-x-auto"}>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th scope="col" className="px-3 py-2 font-medium">
                  Fecha
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  N° guía
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Cliente
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Vendedor
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Factura que despacha
                </th>
                <th scope="col" className="px-3 py-2 text-right font-medium">
                  Neto
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((g) => (
                <tr
                  key={g.id}
                  className="border-b border-border last:border-0 hover:bg-primary-soft/30 transition-colors"
                >
                  <td className="tabular whitespace-nowrap px-3 py-2 align-top">
                    {formatDate(g.date)}
                  </td>
                  <td className="tabular px-3 py-2 align-top">{g.guideNumber}</td>
                  <td className="px-3 py-2 align-top">{g.partner.name}</td>
                  <td className="px-3 py-2 align-top">{g.salesperson?.name ?? "—"}</td>
                  <td className="px-3 py-2 align-top">
                    {g.sale ? (
                      <Link
                        href={`/facturas/ventas/${g.sale.id}`}
                        className="text-primary underline underline-offset-2 hover:text-primary/80"
                      >
                        N° {g.sale.documentNumber ?? "—"}
                      </Link>
                    ) : null}
                    <GuideSaleLink
                      guideId={g.id}
                      ventaId={g.saleId}
                      ventas={candidatas.get(g.partnerId) ?? []}
                      puedeEditar={writable}
                    />
                  </td>
                  <td className="tabular whitespace-nowrap px-3 py-2 text-right align-top font-semibold">
                    {formatCLP(g.netAmount)}
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
