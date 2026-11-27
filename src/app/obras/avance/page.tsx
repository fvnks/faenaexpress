import { aprobarCubicacion, eliminarCubicacion } from "@/app/actions/obra-avance";
import { SincronizadorAvance } from "@/components/sincronizador-avance";
import { SubmitButton } from "@/components/submit-button";
import { db } from "@/lib/db";
import { obraCanWrite, requireObraContext } from "@/lib/obra-auth";
import { puedeAprobarAvance } from "@/lib/obra-permissions";
import { cardClass, secondaryButtonClass } from "@/lib/ui";
import { NuevaCubicacion } from "./nueva-cubicacion";
import { FotoCubicacion } from "./foto-cubicacion";
import { EstadoCuadrillaForm, NuevaCuadrillaForm } from "./cuadrillas-form";

export default async function ObraAvancePage() {
  const ctx = await requireObraContext("avance");
  const writable = obraCanWrite(ctx, "avance");
  const puedeAprobar = puedeAprobarAvance(ctx.role);

  const [partidas, cubicaciones, cuadrillas] = await Promise.all([
    db.partida.findMany({
      where: { obraId: ctx.obra.id, estado: "VIGENTE" },
      orderBy: { orden: "asc" },
      select: { id: true, codigo: true, descripcion: true, unidad: true, cantidad: true },
    }),
    db.cubicacion.findMany({
      where: { partida: { obraId: ctx.obra.id } },
      orderBy: [{ aprobada: "asc" }, { fecha: "desc" }],
      select: {
        id: true, partidaId: true, cantidad: true, fecha: true, aprobada: true,
        partida: { select: { codigo: true, descripcion: true, unidad: true } },
        registradoBy: { select: { name: true } },
        fotos: { select: { id: true, fileName: true } },
      },
    }),
    db.cuadrilla.findMany({
      where: { obraId: ctx.obra.id },
      orderBy: [{ activa: "desc" }, { nombre: "asc" }],
      select: { id: true, nombre: true, integrantes: true, activa: true },
    }),
  ]);

  const aprobadoPorPartida = new Map<string, number>();
  for (const c of cubicaciones.filter((x) => x.aprobada)) {
    aprobadoPorPartida.set(c.partidaId, (aprobadoPorPartida.get(c.partidaId) ?? 0) + c.cantidad);
  }
  const pendientes = partidas.map((p) => ({
    id: p.id,
    codigo: p.codigo,
    descripcion: p.descripcion,
    unidad: p.unidad,
    pendiente: p.cantidad - (aprobadoPorPartida.get(p.id) ?? 0),
  }));

  const pendientesAprobacion = cubicaciones.filter((c) => !c.aprobada);
  const aprobadas = cubicaciones.filter((c) => c.aprobada);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="mb-1 font-mono text-xs uppercase tracking-[0.18em] text-primary">
          Índice / 03 — Avance
        </p>
        <h1 className="text-2xl font-bold tracking-tight">Avance de {ctx.obra.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          El avance físico se mide en unidades contra la cubicación del itemizado, no en porcentajes estimados.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Cubicaciones aprobadas", value: String(aprobadas.length) },
          { label: "Pendientes de aprobación", value: String(pendientesAprobacion.length) },
          { label: "Partidas con avance", value: String(aprobadoPorPartida.size) },
        ].map((kpi) => (
          <div key={kpi.label} className={`${cardClass} p-4`}>
            <p className="text-xs text-muted-foreground">{kpi.label}</p>
            <p className="tabular mt-1 text-2xl font-bold">{kpi.value}</p>
          </div>
        ))}
      </div>

      <SincronizadorAvance />

      <section className={`${cardClass} p-5`}>
        <h2 className="font-semibold">Cuadrillas</h2>
        <p className="mb-3 mt-0.5 text-xs text-muted-foreground">
          Equipos de terreno. Al registrar avance puedes indicar cuál ejecutó la medición; el reporte de productividad lo usa.
        </p>
        {writable ? <NuevaCuadrillaForm /> : null}
        {cuadrillas.length > 0 ? (
          <ul className="mt-4 divide-y divide-border">
            {cuadrillas.map((cuadrilla) => (
              <li key={cuadrilla.id} className="flex flex-wrap items-center gap-3 py-2 first:pt-0">
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{cuadrilla.nombre}</span>
                  <span className="block text-xs text-muted-foreground">{cuadrilla.integrantes} integrantes</span>
                </span>
                <span className={`rounded-full px-2 py-0.5 text-xs ${cuadrilla.activa ? "bg-success-soft text-success" : "bg-surface-elevated text-muted-foreground"}`}>
                  {cuadrilla.activa ? "Activa" : "Inactiva"}
                </span>
                {writable ? <EstadoCuadrillaForm cuadrilla={cuadrilla} /> : null}
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      {writable && pendientes.length > 0 ? (
        <NuevaCubicacion
          partidas={pendientes}
          cuadrillas={cuadrillas.filter((cuadrilla) => cuadrilla.activa)}
          obraId={ctx.obra.id}
        />
      ) : null}

      {pendientesAprobacion.length > 0 ? (
        <section className={`${cardClass} overflow-x-auto`}>
          <div className="border-b border-border px-4 py-3">
            <h2 className="font-semibold">Pendientes de aprobación</h2>
            <p className="text-xs text-muted-foreground">
              {puedeAprobar ? "Tú puedes aprobarlas. Solo el avance aprobado se factura." : "La dirección de obra debe aprobarlas."}
            </p>
          </div>
          <table className="w-full text-sm">
            <thead className="sticky-table-head text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Partida</th>
                <th className="px-3 py-2 text-right">Cantidad</th>
                <th className="px-3 py-2 text-left">Fecha</th>
                <th className="px-3 py-2 text-left">Registró</th>
                <th className="px-3 py-2 text-left">Evidencia</th>
                <th className="px-3 py-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {pendientesAprobacion.map((c) => (
                <tr key={c.id}>
                  <td className="px-3 py-2">{c.partida.codigo} · {c.partida.descripcion}</td>
                  <td className="px-3 py-2 text-right tabular">{c.cantidad} {c.partida.unidad}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{new Date(c.fecha).toLocaleDateString("es-CL")}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{c.registradoBy.name}</td>
                  <td className="px-3 py-2"><FotoCubicacion cubicacionId={c.id} fotos={c.fotos} /></td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex justify-end gap-2">
                      {puedeAprobar ? (
                        <form action={aprobarCubicacion}>
                          <input type="hidden" name="id" value={c.id} />
                          <input type="hidden" name="aprobar" value="true" />
                          <SubmitButton pendingLabel="…" className={secondaryButtonClass}>Aprobar</SubmitButton>
                        </form>
                      ) : null}
                      {c.registradoBy.name === ctx.user.name ? (
                        <form action={eliminarCubicacion}>
                          <input type="hidden" name="id" value={c.id} />
                          <button type="submit" className="text-xs text-danger hover:underline">Eliminar</button>
                        </form>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      <section className={`${cardClass} overflow-x-auto`}>
        <div className="border-b border-border px-4 py-3">
          <h2 className="font-semibold">Historial aprobado</h2>
        </div>
        {aprobadas.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">Todavía no hay avance aprobado.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky-table-head text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Partida</th>
                <th className="px-3 py-2 text-right">Cantidad</th>
                <th className="px-3 py-2 text-left">Fecha</th>
                <th className="px-3 py-2 text-left">Evidencia</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {aprobadas.map((c) => (
                <tr key={c.id}>
                  <td className="px-3 py-2">{c.partida.codigo} · {c.partida.descripcion}</td>
                  <td className="px-3 py-2 text-right tabular">{c.cantidad} {c.partida.unidad}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{new Date(c.fecha).toLocaleDateString("es-CL")}</td>
                  <td className="px-3 py-2"><FotoCubicacion cubicacionId={c.id} fotos={c.fotos} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
