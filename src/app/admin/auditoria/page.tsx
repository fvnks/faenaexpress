import Link from "next/link";

import { countPlatformAudit, queryPlatformAudit } from "@/lib/platform-audit";
import { requirePlatformStaff } from "@/lib/platform";
import { cardClass, controlClass, secondaryButtonClass } from "@/lib/ui";
import type { AuditAction, PlatformLevel } from "@/generated/prisma/client";

const POR_PAGINA = 50;
const ACCIONES: AuditAction[] = ["CREATE", "UPDATE", "DELETE", "IMPORT"];
const NIVELES: PlatformLevel[] = ["SUPPORT", "OPERATOR", "OWNER"];
const ENTIDADES = ["User", "Organization", "Company", "School", "Obra", "Plan", "Subscription", "Module", "Impersonation"];

const una = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const dia = (v: string, fin = false) => (v ? new Date(`${v}T${fin ? "23:59:59.999" : "00:00:00.000"}Z`) : undefined);

export default async function AdminAuditoriaPage(props: PageProps<"/admin/auditoria">) {
  await requirePlatformStaff("SUPPORT");
  const sp = await props.searchParams;
  const q = una(sp.q).trim();
  const accionRaw = una(sp.accion);
  const nivelRaw = una(sp.nivel);
  const entidad = una(sp.entidad);
  const organizacion = una(sp.organizacion);
  const desdeRaw = una(sp.desde);
  const hastaRaw = una(sp.hasta);
  const pagina = Math.max(1, Number(una(sp.pagina)) || 1);

  const accion = ACCIONES.includes(accionRaw as AuditAction) ? (accionRaw as AuditAction) : undefined;
  const nivel = NIVELES.includes(nivelRaw as PlatformLevel) ? (nivelRaw as PlatformLevel) : undefined;
  const desde = dia(desdeRaw);
  const hasta = dia(hastaRaw, true);
  const filtros = {
    q: q || undefined,
    action: accion,
    level: nivel,
    entityType: entidad || undefined,
    organizationId: organizacion || undefined,
    desde: desde && !Number.isNaN(desde.getTime()) ? desde : undefined,
    hasta: hasta && !Number.isNaN(hasta.getTime()) ? hasta : undefined,
    limit: POR_PAGINA,
    offset: (pagina - 1) * POR_PAGINA,
  };

  const [rows, total] = await Promise.all([
    queryPlatformAudit(filtros),
    countPlatformAudit(filtros),
  ]);
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const query = new URLSearchParams(
    Object.entries({
      q, accion: accion ?? "", nivel: nivel ?? "", entidad, organizacion, desde: desdeRaw, hasta: hastaRaw,
    }).filter(([, v]) => v),
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-primary">Índice / Gobernanza</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Auditoría de plataforma</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Todo lo que el equipo de Yellow ERP hace sobre las cuentas. Los filtros viajan en la URL y se pueden exportar.
        </p>
      </div>

      <form method="get" className="flex flex-wrap items-end gap-2 rounded-card border border-border bg-surface p-4">
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Buscar
          <input name="q" defaultValue={q} placeholder="Texto, persona, entidad…" className={controlClass + " w-52"} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Acción
          <select name="accion" defaultValue={accion ?? ""} className={controlClass + " w-32"}>
            <option value="">Todas</option>
            {ACCIONES.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Nivel
          <select name="nivel" defaultValue={nivel ?? ""} className={controlClass + " w-32"}>
            <option value="">Todos</option>
            {NIVELES.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Entidad
          <select name="entidad" defaultValue={entidad} className={controlClass + " w-40"}>
            <option value="">Todas</option>
            {ENTIDADES.map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Desde
          <input name="desde" type="date" defaultValue={desdeRaw} className={controlClass + " w-40"} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Hasta
          <input name="hasta" type="date" defaultValue={hastaRaw} className={controlClass + " w-40"} />
        </label>
        <button type="submit" className={secondaryButtonClass}>Filtrar</button>
        <Link href={`/admin/auditoria/export?${query.toString()}`} className={secondaryButtonClass}>Exportar CSV</Link>
      </form>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Acciones encontradas", value: String(total) },
          { label: "Página", value: `${pagina} de ${paginas}` },
          { label: "Última acción", value: rows[0]?.createdAt.toLocaleDateString("es-CL") ?? "—" },
        ].map((kpi) => (
          <div key={kpi.label} className={`${cardClass} p-4`}>
            <p className="text-xs text-muted-foreground">{kpi.label}</p>
            <p className="tabular mt-1 text-xl font-bold">{kpi.value}</p>
          </div>
        ))}
      </div>

      <section className={`${cardClass} overflow-x-auto`}>
        {rows.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">No hay acciones con esos filtros.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky-table-head text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Fecha</th>
                <th className="px-3 py-2 text-left">Equipo</th>
                <th className="px-3 py-2 text-left">Acción</th>
                <th className="px-3 py-2 text-left">Entidad</th>
                <th className="px-3 py-2 text-left">Detalle</th>
                <th className="px-3 py-2 text-left">Cuenta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="px-3 py-2 text-xs text-muted-foreground tabular">
                    {row.createdAt.toLocaleString("es-CL")}
                  </td>
                  <td className="px-3 py-2">
                    <span className="font-medium">{row.staffUserName}</span>
                    <span className="block text-xs text-muted-foreground">{row.level}</span>
                  </td>
                  <td className="px-3 py-2">
                    <span className="rounded-full bg-surface-elevated px-2 py-0.5 text-xs font-medium">{row.action}</span>
                  </td>
                  <td className="px-3 py-2 text-xs">{row.entityType}</td>
                  <td className="px-3 py-2">
                    <span className="block">{row.summary}</span>
                    {row.changes ? (
                      <details className="mt-1">
                        <summary className="cursor-pointer text-xs text-primary">Cambios</summary>
                        <pre className="mt-1 max-h-40 overflow-auto rounded-control bg-surface-elevated p-2 text-[11px]">
                          {JSON.stringify(row.changes, null, 2)}
                        </pre>
                      </details>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {row.organizationId ? (
                      <Link href={`/admin/organizaciones/${row.organizationId}`} className="text-primary hover:underline">Ver cuenta</Link>
                    ) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {paginas > 1 ? (
        <div className="flex items-center gap-3">
          {pagina > 1 ? (
            <Link href={`/admin/auditoria?${query}&pagina=${pagina - 1}`} className={secondaryButtonClass}>← Anterior</Link>
          ) : null}
          <span className="text-sm text-muted-foreground">{pagina} / {paginas}</span>
          {pagina < paginas ? (
            <Link href={`/admin/auditoria?${query}&pagina=${pagina + 1}`} className={secondaryButtonClass}>Siguiente →</Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
