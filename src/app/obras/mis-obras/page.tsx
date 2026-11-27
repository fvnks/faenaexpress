import Link from "next/link";

import { CambiarObraLink } from "@/components/cambiar-obra-link";
import { isOrgManager } from "@/lib/auth";
import { db } from "@/lib/db";
import { mandantesVisibles } from "@/lib/obra-mandantes";
import { requireObraContext, visibleObras } from "@/lib/obra-auth";
import { OBRA_ROLE_LABELS, obraStatusLabel } from "@/lib/obra-permissions";
import { cardClass } from "@/lib/ui";
import { NuevaObraForm } from "./nueva-obra-form";

export default async function MisObrasPage() {
  const ctx = await requireObraContext("panel");
  const obras = await visibleObras(ctx.user);
  const ids = obras.map((obra) => obra.id);

  const [detalles, membresias, mandantes] = await Promise.all([
    db.obra.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        _count: { select: { documentos: true, partidas: true } },
      },
    }),
    db.obraMembership.findMany({
      where: { userId: ctx.user.id, obraId: { in: ids }, active: true },
      select: { obraId: true, role: true },
    }),
    mandantesVisibles(ctx.user),
  ]);

  const conteo = new Map(detalles.map((detalle) => [detalle.id, detalle._count]));
  const roles = new Map(membresias.map((m) => [m.obraId, m.role]));
  // En standalone no hay rol de organización: cualquier usuario del módulo crea obras.
  const organizationId = ctx.user.orgMembership?.organizationId ?? null;
  const puedeCrear = !organizationId || isOrgManager(ctx.user);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="mb-1 font-mono text-xs uppercase tracking-[0.18em] text-primary">
          Índice / 01 — Mis obras
        </p>
        <h1 className="text-2xl font-bold tracking-tight">Mis obras</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Todas las obras a las que tienes acceso. Cada una tiene su propio presupuesto, avance y control documental.
        </p>
        <p className="mt-1">
          <Link href="/obras" className="text-primary hover:underline">← Volver al panel de la obra abierta</Link>
        </p>
      </div>

      {puedeCrear ? (
        <NuevaObraForm mandantes={mandantes.map((m) => ({ id: m.id, name: m.name }))} />
      ) : null}

      <section className={`${cardClass} overflow-x-auto`}>
        <div className="border-b border-border px-4 py-3">
          <h2 className="font-semibold">Obras ({obras.length})</h2>
        </div>
        {obras.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">
            Todavía no tienes obras asignadas.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky-table-head text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Obra</th>
                <th className="px-3 py-2 text-left">Mandante</th>
                <th className="px-3 py-2 text-left">Estado</th>
                <th className="px-3 py-2 text-left">Tu rol</th>
                <th className="px-3 py-2 text-right">Partidas</th>
                <th className="px-3 py-2 text-right">Documentos</th>
                <th className="px-3 py-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {obras.map((obra) => {
                const c = conteo.get(obra.id);
                const rol = roles.get(obra.id);
                return (
                  <tr key={obra.id}>
                    <td className="px-3 py-2">
                      <span className="font-medium">{obra.name}</span>
                      {obra.code ? <span className="block font-mono text-xs text-muted-foreground">{obra.code}</span> : null}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {mandantes.find((m) => m.id === obra.mandanteId)?.name ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-xs">{obraStatusLabel(obra.status)}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {rol ? OBRA_ROLE_LABELS[rol] ?? rol : "—"}
                    </td>
                    <td className="px-3 py-2 text-right tabular">{c?.partidas ?? 0}</td>
                    <td className="px-3 py-2 text-right tabular">{c?.documentos ?? 0}</td>
                    <td className="px-3 py-2 text-right">
                      {obra.id === ctx.obra.id ? (
                        <span className="rounded-full bg-primary-soft px-2 py-0.5 text-xs font-medium text-primary">Abierta</span>
                      ) : (
                        <CambiarObraLink obraId={obra.id} nombre={obra.name} />
                      )}
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
