import Link from "next/link";
import type { AuditAction } from "@/generated/prisma/client";
import { SelectDropdown } from "@/components/select-dropdown";
import { requireContext } from "@/lib/auth";
import { listAuditLogs } from "@/lib/audit";
import { auditActionLabels, entityTypeLabels } from "@/lib/labels";
import { cardClass, controlClass, labelClass } from "@/lib/ui";

const entityTypes = [
  "Purchase",
  "Sale",
  "Expense",
  "DispatchGuide",
  "Partner",
  "Category",
  "Area",
  "Salesperson",
  "Payer",
  "Product",
  "StockMovement",
  "StockCount",
  "Worker",
  "Remuneration",
  "Company",
  "Membership",
  "User",
  "ProductStock",
  "Warehouse",
  "CommissionAssignment",
];
const actions: AuditAction[] = ["CREATE", "UPDATE", "DELETE", "IMPORT"];

const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "sí" : "no";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export default async function AuditPage(props: PageProps<"/facturas/auditoria">) {
  const ctx = await requireContext("auditoria");
  const searchParams = await props.searchParams;

  const entityType = one(searchParams.tipo);
  const action = one(searchParams.accion);
  const actionFilter = actions.find((value) => value === action);
  const desde = one(searchParams.desde);
  const hasta = one(searchParams.hasta);
  const page = Math.max(1, Number(one(searchParams.p) ?? "1"));
  const pageSize = 50;
  const offset = (page - 1) * pageSize;

  const from = desde ? new Date(desde + "T00:00:00.000Z") : undefined;
  const to = hasta ? new Date(hasta + "T23:59:59.999Z") : undefined;

  const rawLogs = await listAuditLogs(ctx.company.id, {
    entityType: entityType && entityTypes.includes(entityType) ? entityType : undefined,
    action: actionFilter,
    from,
    to,
    limit: pageSize + 1,
    offset,
  });
  const hasMore = rawLogs.length > pageSize;
  const logs = hasMore ? rawLogs.slice(0, pageSize) : rawLogs;

  const buildHref = (p: number) => {
    const params = new URLSearchParams();
    if (entityType) params.set("tipo", entityType);
    if (actionFilter) params.set("accion", actionFilter);
    if (desde) params.set("desde", desde);
    if (hasta) params.set("hasta", hasta);
    params.set("p", String(p));
    return `/facturas/auditoria?${params.toString()}`;
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Auditoría</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Historial de cambios de {ctx.company.name}. Se muestran los últimos 100 registros.
        </p>
      </div>

      <form method="get" className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="tipo" className={labelClass}>
            Tipo de registro
          </label>
          <SelectDropdown
            id="tipo"
            name="tipo"
            value={entityType ?? ""}
            emptyLabel="Todos"
            options={entityTypes.map((value) => ({ value, label: entityTypeLabels[value] ?? value }))}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="accion" className={labelClass}>
            Acción
          </label>
          <SelectDropdown
            id="accion"
            name="accion"
            value={actionFilter ?? ""}
            emptyLabel="Todas"
            options={actions.map((value) => ({ value, label: auditActionLabels[value] }))}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="desde" className={labelClass}>
            Desde
          </label>
          <input
            id="desde"
            name="desde"
            type="text" data-date="1" pattern="^\d{2}-\d{2}-\d{4}$" placeholder="DD-MM-AAAA"
            defaultValue={desde ?? ""}
            className={controlClass}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="hasta" className={labelClass}>
            Hasta
          </label>
          <input
            id="hasta"
            name="hasta"
            type="text" data-date="1" pattern="^\d{2}-\d{2}-\d{4}$" placeholder="DD-MM-AAAA"
            defaultValue={hasta ?? ""}
            className={controlClass}
          />
        </div>
        <button
          type="submit"
          className="btn-liquid btn-liquid-secondary rounded-control border border-border bg-transparent px-3 py-2 text-sm text-foreground"
        >
          Filtrar
        </button>
      </form>

      {logs.length === 0 ? (
        <p className={cardClass + " px-4 py-6 text-sm text-muted-foreground"}>
          No hay registros de auditoría con esos filtros.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {logs.map((log) => {
            const changes = log.changes as unknown as Record<
              string,
              { before: unknown; after: unknown }
            > | null;
            const changeEntries = changes ? Object.entries(changes) : [];

            return (
              <li key={log.id} className={cardClass + " p-4"}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-primary-soft px-2 py-0.5 text-xs font-medium text-primary">
                      {auditActionLabels[log.action] ?? log.action}
                    </span>
                    <span className="font-medium">
                      {entityTypeLabels[log.entityType] ?? log.entityType}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Intl.DateTimeFormat("es-CL", {
                      dateStyle: "short",
                      timeStyle: "short",
                    }).format(log.createdAt)}
                  </span>
                </div>
                <p className="mt-1 text-sm">{log.summary}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">por {log.userName}</p>

                {changeEntries.length > 0 ? (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs text-primary underline-offset-2 hover:underline">
                      Ver cambios ({changeEntries.length})
                    </summary>
                    <ul className="mt-2 flex flex-col gap-1 text-xs">
                      {changeEntries.map(([field, change]) => (
                        <li key={field} className="text-muted-foreground">
                          <span className="font-medium text-foreground">{field}</span>:{" "}
                          {formatValue(change.before)} → {formatValue(change.after)}
                        </li>
                      ))}
                    </ul>
                  </details>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
      <div className="flex items-center justify-between gap-2">
        {page > 1 ? (
          <Link href={buildHref(page - 1)} className="text-sm text-primary underline-offset-2 hover:underline">
            ← Anterior
          </Link>
        ) : (
          <span />
        )}
        {hasMore ? (
          <Link href={buildHref(page + 1)} className="text-sm text-primary underline-offset-2 hover:underline">
            Siguiente →
          </Link>
        ) : null}
      </div>
    </div>
  );
}
