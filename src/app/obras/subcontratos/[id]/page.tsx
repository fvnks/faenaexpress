import Link from "next/link";
import { notFound } from "next/navigation";

import { db } from "@/lib/db";
import { formatCLP, formatDate } from "@/lib/money";
import { obraCanWrite, requireObraContext } from "@/lib/obra-auth";
import { cardClass } from "@/lib/ui";
import {
  AprobarEpSubcontrato,
  GenerarEpSubcontrato,
  PagarEpSubcontrato,
} from "./ep-acciones";

const ESTADOS: Record<string, { label: string; cls: string }> = {
  BORRADOR: { label: "Borrador", cls: "bg-surface-elevated text-muted-foreground" },
  APROBADO: { label: "Aprobado", cls: "bg-primary-soft text-primary" },
  PAGADO: { label: "Pagado", cls: "bg-success-soft text-success" },
};

export default async function SubcontratoDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await requireObraContext("subcontratos");
  const { id } = await params;
  const writable = obraCanWrite(ctx, "subcontratos");

  const subcontrato = await db.subcontrato.findFirst({
    where: { id, obraId: ctx.obra.id },
    include: {
      partner: { select: { name: true, rut: true } },
      partidas: {
        orderBy: { partida: { codigo: "asc" } },
        include: { partida: { select: { codigo: true, descripcion: true, unidad: true } } },
      },
      estadosPago: {
        orderBy: { numero: "desc" },
        include: { detalle: true },
      },
    },
  });
  if (!subcontrato) notFound();

  const pagado = subcontrato.estadosPago
    .filter((ep) => ep.estado === "PAGADO")
    .reduce((sum, ep) => sum + ep.total, 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="mb-1 font-mono text-xs uppercase tracking-[0.18em] text-primary">
          Control de obra / Subcontrato
        </p>
        <h1 className="text-2xl font-bold tracking-tight">
          SC-{String(subcontrato.numero).padStart(4, "0")} · {subcontrato.partner.name}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          <Link href="/obras/subcontratos" className="text-primary hover:underline">
            ← Volver a subcontratos
          </Link>
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        {[
          { label: "Asignado", value: formatCLP(subcontrato.total) },
          { label: "Anticipo", value: formatCLP(subcontrato.anticipo) },
          { label: "Retención", value: `${subcontrato.retencionPct}%` },
          { label: "Pagado", value: formatCLP(pagado) },
        ].map((kpi) => (
          <div key={kpi.label} className={`${cardClass} p-4`}>
            <p className="text-xs text-muted-foreground">{kpi.label}</p>
            <p className="tabular mt-1 text-xl font-bold">{kpi.value}</p>
          </div>
        ))}
      </div>

      <section className={`${cardClass} p-5`}>
        <h2 className="font-semibold">Partidas asignadas</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="sticky-table-head text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Código</th>
                <th className="px-3 py-2 text-left">Partida</th>
                <th className="px-3 py-2 text-right">Cantidad</th>
                <th className="px-3 py-2 text-right">P. unitario</th>
                <th className="px-3 py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {subcontrato.partidas.map((linea) => (
                <tr key={linea.id}>
                  <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{linea.partida.codigo}</td>
                  <td className="px-3 py-2">{linea.partida.descripcion}</td>
                  <td className="px-3 py-2 text-right tabular">{linea.cantidad} {linea.partida.unidad}</td>
                  <td className="px-3 py-2 text-right tabular">{formatCLP(linea.precioUnitario)}</td>
                  <td className="px-3 py-2 text-right tabular font-medium">{formatCLP(linea.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className={`${cardClass} p-5`}>
        <h2 className="font-semibold">Estados de pago</h2>
        <p className="mb-4 mt-0.5 text-xs text-muted-foreground">
          Se arman con el avance aprobado de las partidas asignadas. El anticipo se descuenta una sola vez y la retención en cada EP.
        </p>
        {writable && subcontrato.estado === "VIGENTE" ? (
          <div className="mb-5">
            <GenerarEpSubcontrato subcontratoId={subcontrato.id} />
          </div>
        ) : null}

        {subcontrato.estadosPago.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavía no hay estados de pago en este subcontrato.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="sticky-table-head text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">EP</th>
                  <th className="px-3 py-2 text-left">Período</th>
                  <th className="px-3 py-2 text-right">Bruto</th>
                  <th className="px-3 py-2 text-right">Anticipo</th>
                  <th className="px-3 py-2 text-right">Retención</th>
                  <th className="px-3 py-2 text-right">Total</th>
                  <th className="px-3 py-2 text-left">Estado</th>
                  <th className="px-3 py-2 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {subcontrato.estadosPago.map((ep) => {
                  const info = ESTADOS[ep.estado] ?? ESTADOS.BORRADOR;
                  return (
                    <tr key={ep.id}>
                      <td className="px-3 py-2 font-mono text-xs">EP-SC-{String(ep.numero).padStart(4, "0")}</td>
                      <td className="px-3 py-2 tabular text-xs">{ep.periodo}</td>
                      <td className="px-3 py-2 text-right tabular">{formatCLP(ep.bruto)}</td>
                      <td className="px-3 py-2 text-right tabular">{ep.anticipo > 0 ? formatCLP(ep.anticipo) : "—"}</td>
                      <td className="px-3 py-2 text-right tabular">{ep.retencion > 0 ? formatCLP(ep.retencion) : "—"}</td>
                      <td className="px-3 py-2 text-right tabular font-medium">{formatCLP(ep.total)}</td>
                      <td className="px-3 py-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${info.cls}`}>{info.label}</span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex justify-end gap-2">
                          <a
                            href={`/obras/subcontratos/${subcontrato.id}/ep/${ep.id}/pdf`}
                            className="text-xs text-primary hover:underline"
                          >
                            PDF
                          </a>
                          {writable && ep.estado === "BORRADOR" ? <AprobarEpSubcontrato id={ep.id} /> : null}
                          {writable && ep.estado === "APROBADO" ? <PagarEpSubcontrato id={ep.id} /> : null}
                          <span className="text-xs text-muted-foreground">{formatDate(ep.createdAt)}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
