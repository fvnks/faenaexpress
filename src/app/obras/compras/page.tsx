import Link from "next/link";

import { desimputarCosto, imputarCompra } from "@/app/actions/obra-costos";
import { ImputarCostoForm } from "@/components/obra-imputar-form";
import { SubmitButton } from "@/components/submit-button";
import { getActiveMembership } from "@/lib/auth";
import { db } from "@/lib/db";
import { obraCanWrite, requireObraContext } from "@/lib/obra-auth";
import { cardClass, secondaryButtonClass } from "@/lib/ui";

const fmt = (v: number) => new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(v);

export default async function ObraComprasPage() {
  const ctx = await requireObraContext("compras");
  const writable = obraCanWrite(ctx, "compras");
  const active = await getActiveMembership();
  const companyId = active?.company.id ?? "";

  const [costos, partidas, imputados] = await Promise.all([
    db.costoObra.findMany({
      where: { obraId: ctx.obra.id, sourceType: "PURCHASE" },
      orderBy: { fecha: "desc" },
      include: { partida: { select: { codigo: true, descripcion: true } } },
    }),
    db.partida.findMany({
      where: { obraId: ctx.obra.id, estado: "VIGENTE", cantidad: { gt: 0 } },
      select: { id: true, codigo: true, descripcion: true },
      orderBy: { orden: "asc" },
    }),
    db.costoObra.findMany({ where: { sourceType: "PURCHASE" }, select: { sourceId: true } }),
  ]);

  const ids = new Set(imputados.map((c) => c.sourceId));
  const disponibles = companyId
    ? await db.purchase.findMany({
        where: { companyId, id: { notIn: [...ids] } },
        select: {
          id: true, date: true, documentNumber: true, totalAmount: true,
          partner: { select: { name: true } },
        },
        orderBy: { date: "desc" },
        take: 200,
      })
    : [];
  const sinImputar = disponibles.filter((p) => !ids.has(p.id));
  const total = costos.reduce((s, c) => s + c.monto, 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="mb-1 font-mono text-xs uppercase tracking-[0.18em] text-primary">Índice / 09 — Compras</p>
        <h1 className="text-2xl font-bold tracking-tight">Compras imputadas a {ctx.obra.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          El costo real se deriva de las compras de Facturas: Obras controla, Facturas emite el documento.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Documentos imputados", value: String(costos.length) },
          { label: "Total imputado", value: fmt(total) },
          { label: "Sin imputar (empresa)", value: String(sinImputar.length) },
        ].map((kpi) => (
          <div key={kpi.label} className={`${cardClass} p-4`}>
            <p className="text-xs text-muted-foreground">{kpi.label}</p>
            <p className="tabular mt-1 text-xl font-bold">{kpi.value}</p>
          </div>
        ))}
      </div>

      {writable ? (
        <section className={`${cardClass} p-5`}>
          <h2 className="font-semibold">Imputar compra</h2>
          <p className="mb-3 mt-0.5 text-xs text-muted-foreground">
            El documento sigue en Facturas; aquí solo se registra su costo para la obra.
          </p>
          <ImputarCostoForm
            mode="compra"
            action={imputarCompra}
            partidas={partidas}
            documentos={sinImputar.map((p) => ({
              id: p.id,
              label: `${p.documentNumber ?? "Sin folio"} · ${p.partner.name}`,
              monto: p.totalAmount,
              fecha: new Date(p.date).toLocaleDateString("es-CL"),
            }))}
          />
        </section>
      ) : null}

      <section className={`${cardClass} overflow-x-auto`}>
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <h2 className="font-semibold">Costos imputados</h2>
          <Link href="/facturas/compras" className="text-xs text-primary underline underline-offset-2 hover:text-foreground">Ver compras en Facturas</Link>
        </div>
        {costos.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">Todavía no hay compras imputadas a esta obra.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky-table-head text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Documento</th>
                <th className="px-3 py-2 text-left">Partida</th>
                <th className="px-3 py-2 text-left">Fecha</th>
                <th className="px-3 py-2 text-right">Monto</th>
                <th className="px-3 py-2 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {costos.map((c) => (
                <tr key={c.id}>
                  <td className="px-3 py-2">{c.descripcion}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {c.partida ? `${c.partida.codigo} · ${c.partida.descripcion}` : "Sin imputar"}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{new Date(c.fecha).toLocaleDateString("es-CL")}</td>
                  <td className="px-3 py-2 text-right tabular">{fmt(c.monto)}</td>
                  <td className="px-3 py-2 text-right">
                    {writable ? (
                      <form action={desimputarCosto}>
                        <input type="hidden" name="id" value={c.id} />
                        <SubmitButton pendingLabel="…" className={secondaryButtonClass}>Desimputar</SubmitButton>
                      </form>
                    ) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

