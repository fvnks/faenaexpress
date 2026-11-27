import { ObraCurvaS } from "@/components/obra-curva-s";
import { requireObraContext } from "@/lib/obra-auth";
import { cargarReporteObra } from "@/lib/obra-reportes";
import { cardClass } from "@/lib/ui";

const fmt = (v: number) => new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(v);

function pct(value: number | null): string {
  if (value === null) return "—";
  return `${value >= 0 ? "+" : ""}${value.toFixed(2).replace(".", ",")}%`;
}

export default async function ObraReportesPage() {
  const ctx = await requireObraContext("panel");
  const reporte = await cargarReporteObra(ctx.obra.id);
  const { totales, puntos, desviaciones, cuadrillas, totalFacturado } = reporte;
  const base = `/obras/reportes/export`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="mb-1 font-mono text-xs uppercase tracking-[0.18em] text-primary">Índice / 08 — Reportes</p>
          <h1 className="text-2xl font-bold tracking-tight">Reportes de {ctx.obra.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Curva S, desviación y productividad con datos derivados de los documentos.</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <a href={`${base}?tipo=desviaciones`} className="rounded-control border border-border px-3 py-2 text-foreground hover:border-primary">CSV desviaciones</a>
          <a href={`${base}?tipo=curva`} className="rounded-control border border-border px-3 py-2 text-foreground hover:border-primary">CSV curva S</a>
          <a href={`${base}?tipo=cuadrillas`} className="rounded-control border border-border px-3 py-2 text-foreground hover:border-primary">CSV cuadrillas</a>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Obligado", value: fmt(totales.obligado) },
          { label: "Avance valorizado", value: fmt(totales.avanceValorizado) },
          { label: "Costo real", value: fmt(totales.real) },
          { label: "Facturado (EP)", value: fmt(totalFacturado) },
        ].map((kpi) => (
          <div key={kpi.label} className={`${cardClass} p-4`}>
            <p className="text-xs text-muted-foreground">{kpi.label}</p>
            <p className="tabular mt-1 text-xl font-bold">{kpi.value}</p>
          </div>
        ))}
      </div>

      <section className={`${cardClass} p-5`}>
        <h2 className="font-semibold">Curva S — planificado vs. real</h2>
        <p className="mb-4 mt-0.5 text-xs text-muted-foreground">
          El plan se reparte en línea recta entre inicio y término; el real acumula cubicaciones aprobadas por mes.
        </p>
        <ObraCurvaS puntos={puntos} />
      </section>

      <section className={`${cardClass} overflow-x-auto`}>
        <div className="border-b border-border px-4 py-3">
          <h2 className="font-semibold">Mayores desviaciones por partida</h2>
          <p className="text-xs text-muted-foreground">Ordenado por diferencia absoluta entre costo real y presupuesto.</p>
        </div>
        {desviaciones.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">Sin partidas con presupuesto para comparar.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky-table-head text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Partida</th>
                <th className="px-3 py-2 text-right">Obligado</th>
                <th className="px-3 py-2 text-right">Real</th>
                <th className="px-3 py-2 text-right">Desviación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {desviaciones.slice(0, 8).map((partida) => (
                <tr key={partida.id}>
                  <td className="px-3 py-2"><span className="font-mono text-xs text-muted-foreground">{partida.codigo}</span> {partida.descripcion}</td>
                  <td className="px-3 py-2 text-right tabular">{fmt(partida.obligado)}</td>
                  <td className="px-3 py-2 text-right tabular">{partida.real > 0 ? fmt(partida.real) : "—"}</td>
                  <td className={`px-3 py-2 text-right tabular font-medium ${partida.desviacion > 0 ? "text-danger" : "text-success"}`}>
                    {partida.real > 0 ? `${fmt(partida.desviacion)} · ${pct(partida.desviacionPct)}` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className={`${cardClass} overflow-x-auto`}>
        <div className="border-b border-border px-4 py-3">
          <h2 className="font-semibold">Productividad por cuadrilla</h2>
          <p className="text-xs text-muted-foreground">Avance valorizado aprobado por equipo y por integrante.</p>
        </div>
        {cuadrillas.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">
            No hay cuadrillas creadas. Créalas en Avance y asígnalas al registrar cubicaciones.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky-table-head text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Cuadrilla</th>
                <th className="px-3 py-2 text-right">Integrantes</th>
                <th className="px-3 py-2 text-right">Mediciones</th>
                <th className="px-3 py-2 text-right">Cantidad</th>
                <th className="px-3 py-2 text-right">Valorizado</th>
                <th className="px-3 py-2 text-right">Por integrante</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {cuadrillas.map((cuadrilla) => (
                <tr key={cuadrilla.id}>
                  <td className="px-3 py-2 font-medium">{cuadrilla.nombre}</td>
                  <td className="px-3 py-2 text-right tabular">{cuadrilla.integrantes}</td>
                  <td className="px-3 py-2 text-right tabular">{cuadrilla.mediciones}</td>
                  <td className="px-3 py-2 text-right tabular">{cuadrilla.cantidad}</td>
                  <td className="px-3 py-2 text-right tabular">{fmt(cuadrilla.valorizado)}</td>
                  <td className="px-3 py-2 text-right tabular font-medium">{fmt(cuadrilla.porIntegrante)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
