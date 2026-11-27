import Link from "next/link";
import { notFound } from "next/navigation";

import { CambiarObraLink } from "@/components/cambiar-obra-link";
import { isOrgManager } from "@/lib/auth";
import { db } from "@/lib/db";
import { mandantesVisibles } from "@/lib/obra-mandantes";
import { requireObraContext, visibleObras } from "@/lib/obra-auth";
import { obraStatusLabel } from "@/lib/obra-permissions";
import { cardClass } from "@/lib/ui";
import { EditarMandanteForm, EliminarMandanteForm } from "../mandante-forms";

export default async function MandanteDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await requireObraContext("panel");
  const { id } = await params;

  const [mandantes, obrasVisibles] = await Promise.all([
    mandantesVisibles(ctx.user),
    visibleObras(ctx.user),
  ]);
  const mandante = mandantes.find((item) => item.id === id);
  if (!mandante) notFound();

  const ids = obrasVisibles.map((obra) => obra.id);
  const obras = await db.obra.findMany({
    where: { mandanteId: id, id: { in: ids } },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      code: true,
      status: true,
      _count: { select: { documentos: true, partidas: true } },
    },
  });

  const organizationId = ctx.user.orgMembership?.organizationId ?? null;
  const puedeGestionar = !organizationId || isOrgManager(ctx.user);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="mb-1 font-mono text-xs uppercase tracking-[0.18em] text-primary">
          Mandantes / Ficha
        </p>
        <h1 className="text-2xl font-bold tracking-tight">{mandante.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          <Link href="/obras/mandantes" className="text-primary hover:underline">← Volver a mandantes</Link>
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Obras visibles", value: String(obras.length) },
          { label: "RUT", value: mandante.rut ?? "—" },
          { label: "Comuna", value: mandante.comuna ?? "—" },
        ].map((kpi) => (
          <div key={kpi.label} className={`${cardClass} p-4`}>
            <p className="text-xs text-muted-foreground">{kpi.label}</p>
            <p className="mt-1 truncate text-lg font-bold">{kpi.value}</p>
          </div>
        ))}
      </div>

      {mandante.direccion || mandante.contacto || mandante.notas ? (
        <section className={`${cardClass} p-5`}>
          <h2 className="font-semibold">Datos del mandante</h2>
          <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
            {mandante.direccion ? <div><dt className="text-xs text-muted-foreground">Dirección</dt><dd>{mandante.direccion}</dd></div> : null}
            {mandante.contacto ? <div><dt className="text-xs text-muted-foreground">Contacto</dt><dd>{mandante.contacto}</dd></div> : null}
            {mandante.notas ? <div className="sm:col-span-2"><dt className="text-xs text-muted-foreground">Notas</dt><dd>{mandante.notas}</dd></div> : null}
          </dl>
        </section>
      ) : null}

      <section className={`${cardClass} overflow-x-auto`}>
        <div className="border-b border-border px-4 py-3">
          <h2 className="font-semibold">Obras de {mandante.name}</h2>
        </div>
        {obras.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">No hay obras visibles de este mandante.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky-table-head text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Obra</th>
                <th className="px-3 py-2 text-left">Estado</th>
                <th className="px-3 py-2 text-right">Partidas</th>
                <th className="px-3 py-2 text-right">Documentos</th>
                <th className="px-3 py-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {obras.map((obra) => (
                <tr key={obra.id}>
                  <td className="px-3 py-2">
                    <span className="font-medium">{obra.name}</span>
                    {obra.code ? <span className="block font-mono text-xs text-muted-foreground">{obra.code}</span> : null}
                  </td>
                  <td className="px-3 py-2 text-xs">{obraStatusLabel(obra.status)}</td>
                  <td className="px-3 py-2 text-right tabular">{obra._count.partidas}</td>
                  <td className="px-3 py-2 text-right tabular">{obra._count.documentos}</td>
                  <td className="px-3 py-2 text-right">
                    {obra.id === ctx.obra.id ? (
                      <span className="rounded-full bg-primary-soft px-2 py-0.5 text-xs font-medium text-primary">Abierta</span>
                    ) : (
                      <CambiarObraLink obraId={obra.id} nombre={obra.name} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {puedeGestionar ? (
        <div className="flex flex-col gap-4">
          <EditarMandanteForm
            datos={{
              id: mandante.id,
              name: mandante.name,
              rut: mandante.rut,
              direccion: mandante.direccion,
              comuna: mandante.comuna,
              contacto: mandante.contacto,
              notas: mandante.notas,
            }}
          />
          <div className="flex justify-end">
            <EliminarMandanteForm id={mandante.id} nombre={mandante.name} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
