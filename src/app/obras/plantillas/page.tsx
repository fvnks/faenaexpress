import Link from "next/link";

import { eliminarPlantillaItemizado } from "@/app/actions/obra-plantillas";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/money";
import { obraCanWrite, requireObraContext } from "@/lib/obra-auth";
import { cardClass, dangerButtonClass } from "@/lib/ui";

export default async function PlantillasItemizadoPage() {
  const ctx = await requireObraContext("presupuesto");
  const writable = obraCanWrite(ctx, "presupuesto");
  const organizationId = ctx.user.orgMembership?.organizationId ?? null;
  const plantillas = await db.plantillaItemizado.findMany({
    where: { organizationId },
    orderBy: { nombre: "asc" },
    include: { _count: { select: { lineas: true } } },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="mb-1 font-mono text-xs uppercase tracking-[0.18em] text-primary">
          Control de obra / Itemizado
        </p>
        <h1 className="text-2xl font-bold tracking-tight">Plantillas de itemizado</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Presupuestos guardados que puedes aplicar en cualquier obra. Se crean desde Presupuesto → «Guardar como plantilla».
        </p>
        <p className="mt-1">
          <Link href="/obras/presupuesto" className="text-primary hover:underline">← Volver al presupuesto</Link>
        </p>
      </div>

      <section className={`${cardClass} overflow-x-auto`}>
        <div className="border-b border-border px-4 py-3">
          <h2 className="font-semibold">Plantillas ({plantillas.length})</h2>
        </div>
        {plantillas.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">Todavía no hay plantillas guardadas.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky-table-head text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Nombre</th>
                <th className="px-3 py-2 text-left">Descripción</th>
                <th className="px-3 py-2 text-right">Partidas</th>
                <th className="px-3 py-2 text-left">Creada</th>
                {writable ? <th className="px-3 py-2 text-right">Acciones</th> : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {plantillas.map((plantilla) => (
                <tr key={plantilla.id}>
                  <td className="px-3 py-2 font-medium">{plantilla.nombre}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{plantilla.descripcion ?? "—"}</td>
                  <td className="px-3 py-2 text-right tabular">{plantilla._count.lineas}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{formatDate(plantilla.createdAt)}</td>
                  {writable ? (
                    <td className="px-3 py-2 text-right">
                      <form action={eliminarPlantillaItemizado}>
                        <input type="hidden" name="id" value={plantilla.id} />
                        <ConfirmSubmit
                          title="Eliminar plantilla"
                          description={`¿Eliminar la plantilla «${plantilla.nombre}»? Las obras que ya la usaron no se modifican.`}
                          confirmLabel="Eliminar"
                          className={dangerButtonClass + " px-3 py-1 text-xs"}
                        >
                          Eliminar
                        </ConfirmSubmit>
                      </form>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
