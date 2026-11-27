import Link from "next/link";

import { isOrgManager } from "@/lib/auth";
import { mandantesVisibles } from "@/lib/obra-mandantes";
import { requireObraContext } from "@/lib/obra-auth";
import { cardClass } from "@/lib/ui";
import { NuevoMandanteForm } from "./mandante-forms";

export default async function MandantesPage() {
  const ctx = await requireObraContext("panel");
  const [mandantes] = await Promise.all([mandantesVisibles(ctx.user)]);
  const organizationId = ctx.user.orgMembership?.organizationId ?? null;
  const puedeCrear = !organizationId || isOrgManager(ctx.user);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="mb-1 font-mono text-xs uppercase tracking-[0.18em] text-primary">
          Control de obra / Mandantes
        </p>
        <h1 className="text-2xl font-bold tracking-tight">Mandantes</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cada mandante agrupa sus obras. Entra a uno para ver todas las obras que le pertenecen.
        </p>
      </div>

      {puedeCrear ? <NuevoMandanteForm /> : null}

      <section className={`${cardClass} overflow-x-auto`}>
        <div className="border-b border-border px-4 py-3">
          <h2 className="font-semibold">Mandantes ({mandantes.length})</h2>
        </div>
        {mandantes.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">Todavía no hay mandantes con obras visibles.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky-table-head text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Mandante</th>
                <th className="px-3 py-2 text-left">RUT</th>
                <th className="px-3 py-2 text-left">Comuna</th>
                <th className="px-3 py-2 text-right">Obras</th>
                <th className="px-3 py-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {mandantes.map((mandante) => (
                <tr key={mandante.id}>
                  <td className="px-3 py-2">
                    <Link href={`/obras/mandantes/${mandante.id}`} className="font-medium text-foreground hover:text-primary hover:underline">
                      {mandante.name}
                    </Link>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{mandante.rut ?? "—"}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{mandante.comuna ?? "—"}</td>
                  <td className="px-3 py-2 text-right tabular">{mandante._count.obras}</td>
                  <td className="px-3 py-2 text-right">
                    <Link href={`/obras/mandantes/${mandante.id}`} className="text-xs text-primary hover:underline">
                      Ver obras →
                    </Link>
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
