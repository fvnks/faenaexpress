import Link from "next/link";

import { requireObraContext, obraCanWrite } from "@/lib/obra-auth";
import { formatCLP } from "@/lib/money";
import { OBRA_STATUS_LABELS } from "@/lib/obra-permissions";
import { cargarPresupuesto, type ApuVista, type PartidaVista } from "@/lib/obra-presupuesto";
import { cardClass, secondaryButtonClass } from "@/lib/ui";
import { ImportarPresupuesto } from "./importar-presupuesto";
import { GestionApu } from "./gestion-apu";
import { NuevaPartida } from "./nueva-partida";

function pct(value: number | null): string {
  if (value === null) return "—";
  return `${value >= 0 ? "+" : ""}${value.toFixed(2).replace(".", ",")}%`;
}

function FilaPartida({
  p,
  apu,
  writable,
}: {
  p: PartidaVista;
  apu: Map<string, ApuVista[]>;
  writable: boolean;
}) {
  const desviada = p.desviacion > 0;
  return (
    <>
      <tr className="border-b border-border last:border-0 hover:bg-primary-soft/30 transition-colors">
        <td className="px-3 py-2 align-top font-mono text-xs text-muted-foreground">{p.codigo}</td>
        <td className="px-3 py-2 align-top">
          <span className={p.esCapitulo ? "font-semibold text-foreground" : "text-foreground"}>
            {p.descripcion}
          </span>
          {p.estado === "ANULADA" ? (
            <span className="ml-2 text-[10px] uppercase text-subtle">anulada</span>
          ) : null}
          {p.estado === "VIGENTE" ? (
            <span className="ml-2">
              <GestionApu
                partidaId={p.id}
                partida={`${p.codigo} · ${p.descripcion}`}
                items={apu.get(p.id) ?? []}
                precioUnitario={p.precioUnitario}
                writable={writable}
              />
            </span>
          ) : null}
        </td>
        <td className="px-3 py-2 text-right align-top tabular text-xs text-muted-foreground">
          {p.esCapitulo ? "—" : `${p.cantidad} ${p.unidad}`}
        </td>
        <td className="px-3 py-2 text-right align-top tabular text-xs text-muted-foreground">
          {p.esCapitulo ? "—" : formatCLP(p.precioUnitario)}
        </td>
        <td className="px-3 py-2 text-right align-top tabular font-medium">{formatCLP(p.obligado)}</td>
        <td className="px-3 py-2 text-right align-top tabular">{p.real > 0 ? formatCLP(p.real) : "—"}</td>
        <td className="px-3 py-2 text-right align-top tabular">
          <span className={desviada ? "text-danger" : p.real > 0 ? "text-success" : "text-subtle"}>
            {p.real > 0 ? `${formatCLP(p.desviacion)} · ${pct(p.desviacionPct)}` : "—"}
          </span>
        </td>
        <td className="px-3 py-2 text-right align-top tabular text-xs text-muted-foreground">
          {p.cantidad > 0 ? `${(p.avance * 100).toFixed(0)}%` : "—"}
        </td>
      </tr>
    </>
  );
}

export default async function ObraPresupuestoPage() {
  const ctx = await requireObraContext("presupuesto");
  const { partidas, totales, sinImputar, apuPorPartida } = await cargarPresupuesto(ctx.obra.id);
  const writable = obraCanWrite(ctx, "presupuesto");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="mb-1 font-mono text-xs uppercase tracking-[0.18em] text-primary">
            Índice / 02 — Presupuesto
          </p>
          <h1 className="text-2xl font-bold tracking-tight">Presupuesto de {ctx.obra.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Itemizado por partidas, APU y costo real derivado de los documentos de Facturas.
          </p>
        </div>
        {writable ? <ImportarPresupuesto /> : null}
      </div>

      {/* KPIs: la identidad obligado / real / desviación se calcula en un solo lugar */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Obligado (presupuesto)", value: formatCLP(totales.obligado), tone: "text-foreground" },
          { label: "Costo real", value: formatCLP(totales.real), tone: "text-primary" },
          {
            label: "Desviación",
            value: totales.real === 0 ? "—" : `${formatCLP(totales.desviacion)} · ${pct(totales.desviacionPct)}`,
            tone: totales.desviacion > 0 ? "text-danger" : "text-success",
          },
          { label: "Avance físico", value: `${(totales.avanceFisico * 100).toFixed(1)}%`, tone: "text-foreground" },
        ].map((kpi) => (
          <div key={kpi.label} className={`${cardClass} p-4`}>
            <p className="text-xs text-muted-foreground">{kpi.label}</p>
            <p className={`tabular mt-1 text-xl font-bold ${kpi.tone}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span>{totales.partidas} partidas vigentes</span>
        <span>Avance valorizado: {formatCLP(totales.avanceValorizado)}</span>
        {sinImputar > 0 ? (
          <span className="text-accent">
            {formatCLP(sinImputar)} en documentos sin imputar a una partida
          </span>
        ) : null}
      </div>

      {partidas.length === 0 ? (
        <div className={`${cardClass} px-4 py-10 text-center`}>
          <p className="font-medium">Todavía no hay presupuesto cargado.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Importa tu itemizado desde Excel o agrega la primera partida a mano.
          </p>
        </div>
      ) : (
        <div className={`${cardClass} overflow-x-auto`}>
          <table className="w-full border-collapse text-sm">
            <thead className="sticky-table-head">
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-3 py-2">Código</th>
                <th className="px-3 py-2">Partida</th>
                <th className="px-3 py-2 text-right">Cantidad</th>
                <th className="px-3 py-2 text-right">P. unit.</th>
                <th className="px-3 py-2 text-right">Obligado</th>
                <th className="px-3 py-2 text-right">Real</th>
                <th className="px-3 py-2 text-right">Desviación</th>
                <th className="px-3 py-2 text-right">Avance</th>
              </tr>
            </thead>
            <tbody>
              {partidas.map((p) => (
                <FilaPartida key={p.id} p={p} apu={apuPorPartida} writable={writable} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {writable && partidas.length > 0 ? (
        <details className={cardClass + " p-5"}>
          <summary className="cursor-pointer font-semibold">Agregar partida manual</summary>
          <NuevaPartida />
        </details>
      ) : null}

      <p className="text-xs text-subtle">
        Estado de la obra: {OBRA_STATUS_LABELS[ctx.obra.status]} · Los costos se derivan de compras y
        gastos de Facturas vinculados a esta obra. <Link href="/admin/obras" className="link">Administrar obras</Link>
      </p>
    </div>
  );
}
