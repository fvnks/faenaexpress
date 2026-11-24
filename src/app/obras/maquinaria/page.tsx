import { db } from "@/lib/db";
import { obraCanWrite, requireObraContext } from "@/lib/obra-auth";
import { cardClass } from "@/lib/ui";
import { NuevaMaquinaria, NuevoHorometro } from "./acciones";

export default async function ObraMaquinariaPage() {
  const ctx = await requireObraContext("maquinaria");
  const writable = obraCanWrite(ctx, "maquinaria");

  const maquinarias = await db.maquinaria.findMany({
    where: { obraId: ctx.obra.id },
    orderBy: { nombre: "asc" },
    include: {
      horometros: { orderBy: { fecha: "desc" }, take: 5 },
    },
  });

  const hoy = Date.now();
  const fmt = (v: number) => new Intl.NumberFormat("es-CL", { maximumFractionDigits: 1 }).format(v);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="mb-1 font-mono text-xs uppercase tracking-[0.18em] text-primary">Índice / 07 — Maquinaria</p>
        <h1 className="text-2xl font-bold tracking-tight">Maquinaria de {ctx.obra.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Horómetros, mantenciones y alertas por horas de uso.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Equipos activos", value: String(maquinarias.filter((m) => m.activa).length) },
          { label: "Horómetro total", value: `${fmt(maquinarias.reduce((s, m) => s + m.horometro, 0))} h` },
          { label: "Con mantención próxima", value: String(maquinarias.filter((m) => m.proximaMantencion != null && m.horometro >= m.proximaMantencion).length) },
        ].map((kpi) => (
          <div key={kpi.label} className={`${cardClass} p-4`}>
            <p className="text-xs text-muted-foreground">{kpi.label}</p>
            <p className="tabular mt-1 text-xl font-bold">{kpi.value}</p>
          </div>
        ))}
      </div>

      {writable ? (
        <>
          <section className={`${cardClass} p-5`}>
            <h2 className="font-semibold">Agregar maquinaria</h2>
            <div className="mt-3"><NuevaMaquinaria /></div>
          </section>
          {maquinarias.length > 0 ? (
            <section className={`${cardClass} p-5`}>
              <h2 className="font-semibold">Registrar horómetro o mantención</h2>
              <div className="mt-3"><NuevoHorometro maquinarias={maquinarias.map((m) => ({ id: m.id, nombre: m.nombre, horometro: m.horometro }))} /></div>
            </section>
          ) : null}
        </>
      ) : null}

      {maquinarias.length === 0 ? (
        <div className={`${cardClass} px-4 py-10 text-center`}>
          <p className="font-medium">Todavía no hay maquinaria registrada.</p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {maquinarias.map((m) => {
            const vencida = m.proximaMantencion != null && m.horometro >= m.proximaMantencion;
            const pct = m.proximaMantencion && m.proximaMantencion > 0 ? Math.min(100, (m.horometro / m.proximaMantencion) * 100) : 0;
            return (
              <article key={m.id} className={`${cardClass} p-5`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">{m.nombre}</h3>
                    <p className="text-xs text-muted-foreground">{m.patente ?? "sin patente"}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${vencida ? "bg-danger-soft text-danger" : "bg-success-soft text-success"}`}>
                    {vencida ? "Mantención debida" : "Al día"}
                  </span>
                </div>
                <p className="tabular mt-4 text-2xl font-bold">{fmt(m.horometro)} <span className="text-sm font-normal text-muted-foreground">h</span></p>
                {m.proximaMantencion != null ? (
                  <div className="mt-3">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-elevated">
                      <div className={vencida ? "h-full bg-danger" : "h-full bg-primary"} style={{ width: `${pct}%` }} />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">Próxima mantención a los {fmt(m.proximaMantencion)} h</p>
                  </div>
                ) : null}
                {m.horometros.length > 0 ? (
                  <ul className="mt-4 divide-y divide-border text-xs text-muted-foreground">
                    {m.horometros.map((h) => (
                      <li key={h.id} className="flex justify-between gap-3 py-1.5">
                        <span>{h.tipo === "MANTENCION" ? "Mantención" : "Lectura"}{h.descripcion ? ` · ${h.descripcion}` : ""}</span>
                        <span className="tabular">{fmt(h.horas)} h</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
