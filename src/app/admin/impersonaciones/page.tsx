import Link from "next/link";

import { activeImpersonations } from "@/lib/platform-queries";
import { requirePlatformStaff } from "@/lib/platform";
import { db } from "@/lib/db";
import { cardClass, controlClass, secondaryButtonClass } from "@/lib/ui";

type Entrada = {
  id: string;
  inicio: Date;
  fin: Date | null;
  staffUserName: string;
  staffUserEmail: string;
  organizationId: string | null;
  organizationName: string;
  resumen: string;
  motivo: string;
};

const una = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function AdminImpersonacionesPage(props: PageProps<"/admin/impersonaciones">) {
  await requirePlatformStaff("SUPPORT");
  const sp = await props.searchParams;
  const q = una(sp.q).trim();

  const [auditorias, abiertas] = await Promise.all([
    db.platformAudit.findMany({
      where: { entityType: "Impersonation" },
      orderBy: { createdAt: "asc" },
      take: 1000,
      select: {
        id: true, createdAt: true, action: true, staffUserName: true, staffUserEmail: true,
        staffUserId: true, organizationId: true, summary: true, changes: true,
      },
    }),
    activeImpersonations(),
  ]);

  const idsOrg = [...new Set(auditorias.map((a) => a.organizationId).filter(Boolean) as string[])];
  const nombresOrg = idsOrg.length
    ? await db.organization.findMany({
        where: { id: { in: idsOrg } },
        select: { id: true, name: true },
      })
    : [];
  const nombreOrg = new Map(nombresOrg.map((o) => [o.id, o.name]));

  const sesiones: Entrada[] = [];
  for (const fila of auditorias) {
    if (fila.action === "CREATE") {
      const changes = fila.changes as { reason?: { after?: string } } | null;
      sesiones.push({
        id: fila.id,
        inicio: fila.createdAt,
        fin: null,
        staffUserName: fila.staffUserName,
        staffUserEmail: fila.staffUserEmail,
        organizationId: fila.organizationId,
        organizationName: fila.organizationId ? nombreOrg.get(fila.organizationId) ?? "Cuenta eliminada" : "—",
        resumen: fila.summary,
        motivo: changes?.reason?.after ?? "",
      });
    } else if (fila.action === "UPDATE") {
      // El cierre no guarda el id de la apertura: se empareja con la última
      // entrada del mismo operador y cuenta que siga abierta.
      const apertura = [...sesiones].reverse().find(
        (s) => s.fin === null && s.organizationId === fila.organizationId && s.staffUserEmail === fila.staffUserEmail,
      );
      if (apertura) apertura.fin = fila.createdAt;
    }
  }

  const visibles = q
    ? sesiones.filter((s) =>
        `${s.staffUserName} ${s.staffUserEmail} ${s.organizationName} ${s.resumen} ${s.motivo}`
          .toLowerCase().includes(q.toLowerCase()),
      )
    : sesiones;
  const ordenadas = [...visibles].sort((a, b) => b.inicio.getTime() - a.inicio.getTime());
  const duraciones = ordenadas.filter((s) => s.fin).map((s) => s.fin!.getTime() - s.inicio.getTime());
  const promedio = duraciones.length
    ? Math.round(duraciones.reduce((a, b) => a + b, 0) / duraciones.length / 60000)
    : 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-primary">Índice / Gobernanza</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Accesos de soporte</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Historial de impersonaciones: quién entró a qué cuenta, cuándo, por qué y cuánto duró. Las sesiones cerradas se borran, así que el rastro vivo está en la auditoría de plataforma.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Sesiones registradas", value: String(sesiones.length) },
          { label: "Abiertas ahora", value: String(abiertas.length) },
          { label: "Duración promedio", value: `${promedio} min` },
        ].map((kpi) => (
          <div key={kpi.label} className={`${cardClass} p-4`}>
            <p className="text-xs text-muted-foreground">{kpi.label}</p>
            <p className="tabular mt-1 text-xl font-bold">{kpi.value}</p>
          </div>
        ))}
      </div>

      <form method="get" className="flex flex-wrap items-end gap-2 rounded-card border border-border bg-surface p-4">
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Buscar
          <input name="q" defaultValue={q} placeholder="Persona, cuenta, motivo…" className={controlClass + " w-64"} />
        </label>
        <button type="submit" className={secondaryButtonClass}>Filtrar</button>
        <Link href="/admin/auditoria?entidad=Impersonation" className={secondaryButtonClass}>Ver auditoría completa</Link>
      </form>

      <section className={`${cardClass} overflow-x-auto`}>
        {ordenadas.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">No hay accesos de soporte registrados.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky-table-head text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Inicio</th>
                <th className="px-3 py-2 text-left">Operador</th>
                <th className="px-3 py-2 text-left">Cuenta</th>
                <th className="px-3 py-2 text-left">Duración</th>
                <th className="px-3 py-2 text-left">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {ordenadas.map((s) => (
                <tr key={s.id}>
                  <td className="px-3 py-2 text-xs text-muted-foreground tabular">
                    {s.inicio.toLocaleString("es-CL")}
                  </td>
                  <td className="px-3 py-2">
                    <span className="font-medium">{s.staffUserName}</span>
                    <span className="block text-xs text-muted-foreground">{s.staffUserEmail}</span>
                  </td>
                  <td className="px-3 py-2">
                    {s.organizationId ? (
                      <Link href={`/admin/organizaciones/${s.organizationId}`} className="text-primary hover:underline">
                        {s.organizationName}
                      </Link>
                    ) : s.organizationName}
                  </td>
                  <td className="px-3 py-2 text-xs tabular">
                    {s.fin
                      ? `${Math.round((s.fin.getTime() - s.inicio.getTime()) / 60000)} min`
                      : <span className="text-accent">en curso</span>}
                  </td>
                  <td className="px-3 py-2">
                    <span className="block text-xs">{s.resumen}</span>
                    {s.motivo ? <span className="block text-xs text-muted-foreground">Motivo: {s.motivo}</span> : null}
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
