import Link from "next/link";

import {
  activarVersionPresupuesto,
  eliminarVersionPresupuesto,
} from "@/app/actions/obra-versiones";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { db } from "@/lib/db";
import { formatCLP, formatDate } from "@/lib/money";
import { obraCanWrite, requireObraContext } from "@/lib/obra-auth";
import { cardClass, dangerButtonClass, secondaryButtonClass } from "@/lib/ui";
import { NuevaVersionForm } from "./nueva-version-form";

export default async function VersionesPresupuestoPage() {
  const ctx = await requireObraContext("presupuesto");
  const writable = obraCanWrite(ctx, "presupuesto");
  const versiones = await db.presupuestoVersion.findMany({
    where: { obraId: ctx.obra.id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { partidas: true } } },
  });
  const vigente = versiones.find((version) => version.id === ctx.obra.presupuestoVigenteId);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="mb-1 font-mono text-xs uppercase tracking-[0.18em] text-primary">
          Control de obra / Presupuesto
        </p>
        <h1 className="text-2xl font-bold tracking-tight">Versiones del presupuesto</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cada importación o plantilla deja una copia del itemizado anterior. Puedes volver a cualquier versión.
        </p>
        <p className="mt-1">
          <Link href="/obras/presupuesto" className="text-primary hover:underline">← Volver al presupuesto</Link>
        </p>
      </div>

      {vigente ? (
        <div className={`${cardClass} p-4`}>
          <p className="text-xs text-muted-foreground">Versión vigente</p>
          <p className="mt-1 text-lg font-semibold">{vigente.nombre}</p>
          <p className="tabular mt-1 text-sm">{formatCLP(vigente.total)} · {vigente._count.partidas} partidas</p>
        </div>
      ) : null}

      {writable ? <NuevaVersionForm /> : null}

      <section className={`${cardClass} overflow-x-auto`}>
        <div className="border-b border-border px-4 py-3">
          <h2 className="font-semibold">Historial ({versiones.length})</h2>
        </div>
        {versiones.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">
            Todavía no hay versiones. La primera aparecerá al importar un presupuesto o aplicar una plantilla.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky-table-head text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Versión</th>
                <th className="px-3 py-2 text-right">Total</th>
                <th className="px-3 py-2 text-right">Partidas</th>
                <th className="px-3 py-2 text-left">Guardada</th>
                <th className="px-3 py-2 text-left">Por</th>
                <th className="px-3 py-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {versiones.map((version) => (
                <tr key={version.id}>
                  <td className="px-3 py-2">
                    <span className="font-medium">{version.nombre}</span>
                    {version.descripcion ? <span className="block text-xs text-muted-foreground">{version.descripcion}</span> : null}
                    {version.vigente ? <span className="ml-2 rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-medium text-primary">Vigente</span> : null}
                  </td>
                  <td className="px-3 py-2 text-right tabular">{formatCLP(version.total)}</td>
                  <td className="px-3 py-2 text-right tabular">{version._count.partidas}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{formatDate(version.createdAt)}</td>
                  <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{version.createdById.slice(0, 8)}</td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex flex-wrap justify-end gap-2">
                      {writable && !version.vigente ? (
                        <>
                          <form action={activarVersionPresupuesto}>
                            <input type="hidden" name="id" value={version.id} />
                            <ConfirmSubmit
                              title="Activar versión"
                              description={`¿Volver a «${version.nombre}»? Las partidas vigentes actuales se anulan y se conservan en el historial.`}
                              confirmLabel="Activar"
                              className={secondaryButtonClass + " px-3 py-1 text-xs"}
                              confirmClassName={secondaryButtonClass + " px-3 py-1 text-xs"}
                            >
                              Activar
                            </ConfirmSubmit>
                          </form>
                          <form action={eliminarVersionPresupuesto}>
                            <input type="hidden" name="id" value={version.id} />
                            <ConfirmSubmit
                              title="Eliminar versión"
                              description={`¿Eliminar la versión «${version.nombre}»? No afecta al presupuesto vigente.`}
                              confirmLabel="Eliminar"
                              className={dangerButtonClass + " px-3 py-1 text-xs"}
                            >
                              Eliminar
                            </ConfirmSubmit>
                          </form>
                        </>
                      ) : null}
                    </div>
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
