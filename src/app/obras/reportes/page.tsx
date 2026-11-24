import { ObraCurvaS } from "@/components/obra-curva-s";
import { db } from "@/lib/db";
import { calcularTotalesObra, curvaS } from "@/lib/obra-budget";
import { requireObraContext } from "@/lib/obra-auth";
import { cardClass } from "@/lib/ui";

const fmt = (v: number) => new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(v);

export default async function ObraReportesPage() {
  const ctx = await requireObraContext("panel");
  const obraId = ctx.obra.id;

  const [partidas, costos, cubicaciones, estados] = await Promise.all([
    db.partida.findMany({
      where: { obraId },
      select: { id: true, codigo: true, descripcion: true, cantidad: true, precioUnitario: true, total: true, estado: true },
    }),
    db.costoObra.findMany({ where: { obraId }, select: { partidaId: true, monto: true } }),
    db.cubicacion.findMany({
      where: { partida: { obraId }, aprobada: true },
      select: { partidaId: true, cantidad: true, fecha: true, partida: { select: { precioUnitario: true } } },
    }),
    db.estadoPago.findMany({
      where: { obraId, estado: { in: ["APROBADO", "FACTURADO", "PAGADO"] } },
      select: { total: true, periodo: true },
    }),
  ]);

  const totales = calcularTotalesObra(partidas, costos, cubicaciones);

  // Valorizado por mes desde cubicaciones aprobadas.
  const porMes = new Map<string, number>();
  for (const c of cubicaciones) {
    const mes = c.fecha.toISOString().slice(0, 7);
    const valor = Math.round(c.cantidad * c.partida.precioUnitario);
    porMes.set(mes, (porMes.get(mes) ?? 0) + valor);
  }
  const puntos = curvaS(
    totales.obligado,
    ctx.obra.fechaInicio ?? null,
    ctx.obra.fechaTermino ?? null,
    [...porMes.entries()].map(([mes, valor]) => ({ mes, valor })),
  );

  const totalFacturado = estados.reduce((s, e) => s + e.total, 0);
  const porPartida = partidas
    .filter((p) => p.estado === "VIGENTE" && p.total > 0)
    .map((p) => {
      const real = costos.filter((c) => c.partidaId === p.id).reduce((s, c) => s + c.monto, 0);
      const desv = real - p.total;
      return { id: p.id, obligado: p.total, real, desv, pct: p.total ? Math.round((desv / p.total) * 10000) / 100 : null };
    })
    .sort((a, b) => Math.abs(b.desv) - Math.abs(a.desv))
    .slice(0, 8);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="mb-1 font-mono text-xs uppercase tracking-[0.18em] text-primary">Índice / 08 — Reportes</p>
        <h1 className="text-2xl font-bold tracking-tight">Reportes de {ctx.obra.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Curva S y desviación presupuestaria con datos derivados de los documentos.</p>
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
        {porPartida.length === 0 ? (
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
              {porPartida.map((p) => {
                const partida = partidas.find((x) => x.id === p.id);
                return (
                  <tr key={p.id}>
                    <td className="px-3 py-2"><span className="font-mono text-xs text-muted-foreground">{partida?.codigo}</span> {partida?.descripcion}</td>
                    <td className="px-3 py-2 text-right tabular">{fmt(p.obligado)}</td>
                    <td className="px-3 py-2 text-right tabular">{p.real > 0 ? fmt(p.real) : "—"}</td>
                    <td className={`px-3 py-2 text-right tabular font-medium ${p.desv > 0 ? "text-danger" : "text-success"}`}>
                      {p.real > 0 ? `${fmt(p.desv)} · ${pct(p.pct ?? null)}` : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

function pct(value: number | null): string {
  if (value === null) return "—";
  return `${value >= 0 ? "+" : ""}${value.toFixed(2).replace(".", ",")}%`;
}
