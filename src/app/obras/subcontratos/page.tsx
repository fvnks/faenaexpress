import Link from "next/link";

import { cambiarEstadoSubcontrato } from "@/app/actions/obra-subcontratos";
import { getActiveMembership } from "@/lib/auth";
import { SubmitButton } from "@/components/submit-button";
import { db } from "@/lib/db";
import { requireObraContext, obraCanWrite } from "@/lib/obra-auth";
import { cardClass, secondaryButtonClass } from "@/lib/ui";
import { NuevoSubcontrato } from "./nuevo-subcontrato";

const ESTADOS: Record<string, string> = {
  VIGENTE: "bg-primary-soft text-primary",
  TERMINADO: "bg-success-soft text-success",
  ANULADO: "bg-danger-soft text-danger",
};

export default async function ObraSubcontratosPage() {
  const ctx = await requireObraContext("subcontratos");
  const writable = obraCanWrite(ctx, "subcontratos");
  const activeMembership = await getActiveMembership();
  const companyId = activeMembership?.company.id ?? "";

  const [subcontratos, proveedores, partidas] = await Promise.all([
    db.subcontrato.findMany({
      where: { obraId: ctx.obra.id },
      orderBy: { numero: "desc" },
      include: {
        partner: { select: { name: true, rut: true } },
        partidas: {
          include: { partida: { select: { codigo: true, descripcion: true } } },
        },
      },
    }),
    db.partner.findMany({
      where: { companyId, active: true, type: { in: ["SUPPLIER", "BOTH"] } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.partida.findMany({
      where: { obraId: ctx.obra.id, estado: "VIGENTE", cantidad: { gt: 0 } },
      select: { id: true, codigo: true, descripcion: true, precioUnitario: true },
      orderBy: { orden: "asc" },
    }),
  ]);

  const fmt = (v: number) => new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(v);
  const totalAsignado = subcontratos.filter((s) => s.estado !== "ANULADO").reduce((s, x) => s + x.total, 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="mb-1 font-mono text-xs uppercase tracking-[0.18em] text-primary">Índice / 05 — Subcontratos</p>
        <h1 className="text-2xl font-bold tracking-tight">Subcontratos de {ctx.obra.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Partidas asignadas a terceros, con anticipo y retención.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Total asignado", value: fmt(totalAsignado) },
          { label: "Subcontratos vigentes", value: String(subcontratos.filter((s) => s.estado === "VIGENTE").length) },
          { label: "Anticipos entregados", value: fmt(subcontratos.reduce((s, x) => s + x.anticipo, 0)) },
        ].map((kpi) => (
          <div key={kpi.label} className={`${cardClass} p-4`}>
            <p className="text-xs text-muted-foreground">{kpi.label}</p>
            <p className="tabular mt-1 text-xl font-bold">{kpi.value}</p>
          </div>
        ))}
      </div>

      {writable ? <NuevoSubcontrato partners={proveedores} partidas={partidas.map((p) => ({ ...p, pendiente: 0 }))} /> : null}

      {subcontratos.length === 0 ? (
        <div className={`${cardClass} px-4 py-10 text-center`}>
          <p className="font-medium">Todavía no hay subcontratos.</p>
        </div>
      ) : (
        <div className={`${cardClass} overflow-x-auto`}>
          <table className="w-full text-sm">
            <thead className="sticky-table-head text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">N°</th>
                <th className="px-3 py-2 text-left">Proveedor</th>
                <th className="px-3 py-2 text-right">Total</th>
                <th className="px-3 py-2 text-right">Anticipo</th>
                <th className="px-3 py-2 text-right">Retención</th>
                <th className="px-3 py-2 text-left">Estado</th>
                <th className="px-3 py-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {subcontratos.map((sc) => (
                <tr key={sc.id}>
                  <td className="px-3 py-2 font-mono text-xs">SC-{String(sc.numero).padStart(4, "0")}</td>
                  <td className="px-3 py-2">
                    <span className="font-medium">{sc.partner.name}</span>
                    <span className="block text-xs text-muted-foreground">{sc.descripcion}</span>
                    <span className="block text-xs text-subtle">{sc.partidas.length} partidas</span>
                  </td>
                  <td className="px-3 py-2 text-right tabular">{fmt(sc.total)}</td>
                  <td className="px-3 py-2 text-right tabular">{sc.anticipo > 0 ? fmt(sc.anticipo) : "—"}</td>
                  <td className="px-3 py-2 text-right tabular">{sc.retencionPct > 0 ? `${sc.retencionPct}%` : "—"}</td>
                  <td className="px-3 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ESTADOS[sc.estado] ?? ESTADOS.VIGENTE}`}>{sc.estado}</span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex flex-wrap justify-end gap-2">
                      <Link href={`/obras/subcontratos/${sc.id}`} className="text-xs text-primary hover:underline">
                        Estados de pago
                      </Link>
                      {writable && sc.estado === "VIGENTE" ? (
                        <form action={cambiarEstadoSubcontrato}>
                          <input type="hidden" name="id" value={sc.id} />
                          <input type="hidden" name="estado" value="TERMINADO" />
                          <SubmitButton pendingLabel="…" className={secondaryButtonClass}>Terminar</SubmitButton>
                        </form>
                      ) : null}
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
