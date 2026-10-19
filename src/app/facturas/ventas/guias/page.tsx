import Link from "next/link";

import { requireContext, canWrite } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatCLP, formatDate } from "@/lib/money";
import { cardClass, primaryButtonClass } from "@/lib/ui";

export default async function GuiasPage() {
  const ctx = await requireContext("ventas");
  const { company } = ctx;
  const items = await db.dispatchGuide.findMany({
    where: { companyId: company.id },
    include: { partner: true, salesperson: true },
    orderBy: { date: "desc" },
  });

  const writable = canWrite(ctx, "ventas");
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Guías de Despacho</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Guías de despacho electrónicas. Total: {items.length}{" "}
            {items.length === 1 ? "guía" : "guías"}.
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
            Las guías se gestionan desde Inventario → Movimientos, enlazándolas a
            ventas.
          </p>
        </div>
      ) : (
        <div className={cardClass + " overflow-x-auto"}>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-3 py-2 font-medium">Fecha</th>
                <th className="px-3 py-2 font-medium">N° guía</th>
                <th className="px-3 py-2 font-medium">Cliente</th>
                <th className="px-3 py-2 font-medium">Vendedor</th>
                <th className="px-3 py-2 text-right font-medium">Neto</th>
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
