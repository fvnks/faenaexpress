import { db } from "@/lib/db";
import { currentPeriod } from "@/lib/money";
import { obraCanWrite, requireObraContext } from "@/lib/obra-auth";
import { puedeAprobarAvance } from "@/lib/obra-permissions";
import { cardClass } from "@/lib/ui";
import { AprobarEP, FacturarEP, GenerarEstadoPago, LinkVenta } from "./acciones";

const ESTADOS: Record<string, { label: string; cls: string }> = {
  BORRADOR: { label: "Borrador", cls: "bg-surface text-muted-foreground" },
  APROBADO: { label: "Aprobado", cls: "bg-primary-soft text-primary" },
  FACTURADO: { label: "Facturado", cls: "bg-success-soft text-success" },
  PAGADO: { label: "Pagado", cls: "bg-success-soft text-success" },
};

export default async function ObraEstadosPagoPage() {
  const ctx = await requireObraContext("estadosPago");
  const writable = obraCanWrite(ctx, "estadosPago");
  const puedeAprobar = puedeAprobarAvance(ctx.role);

  const estados = await db.estadoPago.findMany({
    where: { obraId: ctx.obra.id },
    orderBy: { numero: "desc" },
    include: { detalle: { select: { total: true } } },
  });

  const totalFacturado = estados
    .filter((e) => e.estado === "FACTURADO" || e.estado === "PAGADO")
    .reduce((s, e) => s + e.total, 0);
  const totalBorrador = estados.filter((e) => e.estado === "BORRADOR").reduce((s, e) => s + e.total, 0);

  const fmt = (v: number) =>
    new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(v);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="mb-1 font-mono text-xs uppercase tracking-[0.18em] text-primary">
          Índice / 04 — Estados de pago
        </p>
        <h1 className="text-2xl font-bold tracking-tight">Estados de pago de {ctx.obra.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Se cobra el avance ejecutado, no el contrato completo. Los EP aprobados se facturan como venta en Facturas.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Facturado", value: fmt(totalFacturado) },
          { label: "En borrador", value: fmt(totalBorrador) },
          { label: "Estados de pago", value: String(estados.length) },
        ].map((kpi) => (
          <div key={kpi.label} className={`${cardClass} p-4`}>
            <p className="text-xs text-muted-foreground">{kpi.label}</p>
            <p className="tabular mt-1 text-xl font-bold">{kpi.value}</p>
          </div>
        ))}
      </div>

      {writable ? <GenerarEstadoPago periodo={currentPeriod()} /> : null}

      {estados.length === 0 ? (
        <div className={`${cardClass} px-4 py-10 text-center`}>
          <p className="font-medium">Todavía no hay estados de pago.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Registra avance aprobado en la sección Avance y luego genera el EP del período.
          </p>
        </div>
      ) : (
        <div className={`${cardClass} overflow-x-auto`}>
          <table className="w-full text-sm">
            <thead className="sticky-table-head text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">N°</th>
                <th className="px-3 py-2 text-left">Período</th>
                <th className="px-3 py-2 text-right">Total</th>
                <th className="px-3 py-2 text-left">Estado</th>
                <th className="px-3 py-2 text-left">Venta</th>
                <th className="px-3 py-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {estados.map((ep) => {
                const info = ESTADOS[ep.estado] ?? ESTADOS.BORRADOR;
                return (
                  <tr key={ep.id}>
                    <td className="px-3 py-2 font-mono text-xs">EP-{String(ep.numero).padStart(4, "0")}</td>
                    <td className="px-3 py-2 tabular text-xs">{ep.periodo}</td>
                    <td className="px-3 py-2 text-right tabular font-medium">{fmt(ep.total)}</td>
                    <td className="px-3 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${info.cls}`}>{info.label}</span>
                    </td>
                    <td className="px-3 py-2">{ep.saleId ? <LinkVenta saleId={ep.saleId} /> : "—"}</td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex justify-end gap-2">
                        {ep.estado === "BORRADOR" && puedeAprobar ? <AprobarEP id={ep.id} /> : null}
                        {ep.estado === "APROBADO" && writable ? <FacturarEP id={ep.id} /> : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
