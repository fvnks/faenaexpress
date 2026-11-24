import Link from "next/link";

import { db } from "@/lib/db";
import { requireObraContext } from "@/lib/obra-auth";
import { cardClass } from "@/lib/ui";

const fmt = (v: number) => new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(v);

export default async function ObraDocumentosPage() {
  const ctx = await requireObraContext("documentos");
  const obraId = ctx.obra.id;

  const [estados, subcontratos, cubicaciones, costos] = await Promise.all([
    db.estadoPago.findMany({
      where: { obraId },
      orderBy: { numero: "desc" },
      select: { id: true, numero: true, periodo: true, estado: true, total: true, saleId: true },
    }),
    db.subcontrato.findMany({
      where: { obraId },
      orderBy: { numero: "desc" },
      select: { id: true, numero: true, total: true, estado: true, partner: { select: { name: true } } },
    }),
    db.cubicacion.findMany({
      where: { partida: { obraId } },
      orderBy: { fecha: "desc" },
      select: {
        id: true, cantidad: true, fecha: true, aprobada: true,
        partida: { select: { codigo: true, descripcion: true, unidad: true } },
        fotos: { select: { id: true, fileName: true } },
      },
    }),
    db.costoObra.findMany({
      where: { obraId },
      select: { id: true, sourceType: true, descripcion: true, monto: true },
    }),
  ]);

  const conFoto = cubicaciones.filter((c) => c.fotos.length > 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="mb-1 font-mono text-xs uppercase tracking-[0.18em] text-primary">Índice / 11 — Documentos</p>
        <h1 className="text-2xl font-bold tracking-tight">Documentos de {ctx.obra.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Índice de lo que se ha generado en la obra. Los documentos tributarios viven en Facturas; aquí se enumeran y enlazan.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Estados de pago", value: String(estados.length) },
          { label: "Subcontratos", value: String(subcontratos.length) },
          { label: "Cubicaciones con foto", value: String(conFoto.length) },
          { label: "Costos imputados", value: String(costos.length) },
        ].map((kpi) => (
          <div key={kpi.label} className={`${cardClass} p-4`}>
            <p className="text-xs text-muted-foreground">{kpi.label}</p>
            <p className="tabular mt-1 text-xl font-bold">{kpi.value}</p>
          </div>
        ))}
      </div>

      {estados.length > 0 ? (
        <section className={`${cardClass} overflow-x-auto`}>
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
            <h2 className="font-semibold">Estados de pago</h2>
            <Link href="/obras/estados-pago" className="text-xs text-primary underline underline-offset-2">Ir a estados de pago</Link>
          </div>
          <table className="w-full text-sm">
            <thead className="sticky-table-head text-xs text-muted-foreground">
              <tr><th className="px-3 py-2 text-left">N°</th><th className="px-3 py-2 text-left">Período</th><th className="px-3 py-2 text-left">Estado</th><th className="px-3 py-2 text-right">Total</th><th className="px-3 py-2 text-left">Venta</th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {estados.map((e) => (
                <tr key={e.id}>
                  <td className="px-3 py-2 font-mono text-xs">EP-{String(e.numero).padStart(4, "0")}</td>
                  <td className="px-3 py-2">{e.periodo}</td>
                  <td className="px-3 py-2">{e.estado}</td>
                  <td className="px-3 py-2 text-right tabular">{fmt(e.total)}</td>
                  <td className="px-3 py-2">
                    {e.saleId ? <Link href={`/facturas/ventas/${e.saleId}`} className="text-primary hover:underline">Ver venta</Link> : <span className="text-xs text-muted-foreground">Sin facturar</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      {subcontratos.length > 0 ? (
        <section className={`${cardClass} overflow-x-auto`}>
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
            <h2 className="font-semibold">Subcontratos</h2>
            <Link href="/obras/subcontratos" className="text-xs text-primary underline underline-offset-2">Ir a subcontratos</Link>
          </div>
          <table className="w-full text-sm">
            <thead className="sticky-table-head text-xs text-muted-foreground">
              <tr><th className="px-3 py-2 text-left">N°</th><th className="px-3 py-2 text-left">Proveedor</th><th className="px-3 py-2 text-left">Estado</th><th className="px-3 py-2 text-right">Total</th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {subcontratos.map((s) => (
                <tr key={s.id}>
                  <td className="px-3 py-2 font-mono text-xs">SC-{String(s.numero).padStart(4, "0")}</td>
                  <td className="px-3 py-2">{s.partner.name}</td>
                  <td className="px-3 py-2">{s.estado}</td>
                  <td className="px-3 py-2 text-right tabular">{fmt(s.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      <section className={`${cardClass} overflow-x-auto`}>
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <h2 className="font-semibold">Evidencia de cubicaciones</h2>
          <Link href="/obras/avance" className="text-xs text-primary underline underline-offset-2">Ir a avance</Link>
        </div>
        {conFoto.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">Todavía no hay fotos de evidencia en las cubicaciones.</p>
        ) : (
          <ul className="divide-y divide-border text-sm">
            {conFoto.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5">
                <span className="font-medium">{c.partida.codigo} · {c.partida.descripcion}</span>
                <span className="tabular text-muted-foreground">{c.cantidad} {c.partida.unidad}</span>
                <span className="text-xs text-muted-foreground">{c.aprobada ? "Aprobada" : "Pendiente"}</span>
                <span className="ml-auto flex flex-wrap gap-2">
                  {c.fotos.map((f) => (
                    <a key={f.id} href={`/obras/fotos/${f.id}`} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">📷 {f.fileName}</a>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {costos.length > 0 ? (
        <section className={`${cardClass} overflow-x-auto`}>
          <div className="border-b border-border px-4 py-3"><h2 className="font-semibold">Costos imputados</h2></div>
          <table className="w-full text-sm">
            <thead className="sticky-table-head text-xs text-muted-foreground">
              <tr><th className="px-3 py-2 text-left">Origen</th><th className="px-3 py-2 text-left">Documento</th><th className="px-3 py-2 text-right">Monto</th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {costos.map((c) => (
                <tr key={c.id}>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{c.sourceType === "PURCHASE" ? "Compra" : c.sourceType === "EXPENSE" ? "Gasto" : c.sourceType}</td>
                  <td className="px-3 py-2">{c.descripcion}</td>
                  <td className="px-3 py-2 text-right tabular">{fmt(c.monto)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}
    </div>
  );
}
