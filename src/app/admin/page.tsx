import Link from "next/link";

import { DateRangeFilter } from "@/components/date-range-filter";
import { db } from "@/lib/db";
import { formatCLP, formatDate } from "@/lib/money";
import { requirePlatformStaff } from "@/lib/platform";
import { activeImpersonations, listPlatformAuditRecent, listOrganizations, moduleSummary, platformOverview } from "@/lib/platform-queries";
import { listPlans } from "@/lib/plans";
import { cardClass } from "@/lib/ui";

const una = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

// Tablero del operador: el estado de todas las cuentas de un vistazo.
export default async function AdminDashboardPage(props: PageProps<"/admin">) {
  await requirePlatformStaff("SUPPORT");
  const sp = await props.searchParams;
  const desdeRaw = una(sp.desde);
  const hastaRaw = una(sp.hasta);
  const desde = desdeRaw ? new Date(`${desdeRaw}T00:00:00.000Z`) : undefined;
  const hasta = hastaRaw ? new Date(`${hastaRaw}T23:59:59.999Z`) : undefined;
  const rango = desde || hasta
    ? {
        createdAt: {
          ...(desde && !Number.isNaN(desde.getTime()) ? { gte: desde } : {}),
          ...(hasta && !Number.isNaN(hasta.getTime()) ? { lte: hasta } : {}),
        },
      }
    : {};

  const [overview, orgs, audit, openSessions, modulos, planes, porCobrar, vencidas, cobrado, suscripciones, altas] = await Promise.all([
    platformOverview(),
    listOrganizations(),
    listPlatformAuditRecent(8),
    activeImpersonations(),
    moduleSummary(),
    listPlans(),
    db.platformInvoice.aggregate({ where: { status: { in: ["PENDING", "PARTIAL"] } }, _sum: { totalCLP: true } }),
    db.platformInvoice.count({ where: { status: "OVERDUE" } }),
    db.platformInvoice.aggregate({ where: { status: "PAID" }, _sum: { totalCLP: true } }),
    db.subscription.findMany({
      where: { status: { in: ["ACTIVE", "TRIAL"] } },
      select: { plan: { select: { priceCLP: true } } },
    }),
    Promise.all([
      db.organization.count({ where: rango }),
      db.user.count({ where: { ...rango, active: true } }),
      db.platformAudit.count({ where: rango }),
    ]),
  ]);

  // Orden por actividad reciente: primero lo que se está usando.
  const recent = [...orgs]
    .sort((a, b) => (b.lastActivity?.getTime() ?? 0) - (a.lastActivity?.getTime() ?? 0))
    .slice(0, 8);

  const mrr = suscripciones.reduce((sum, s) => sum + s.plan.priceCLP, 0);

  const metrics = [
    { label: "Organizaciones", value: overview.organizations },
    { label: "Empresas", value: overview.companies },
    { label: "Usuarios activos", value: overview.users },
    { label: "Equipo de plataforma", value: overview.staff },
    { label: "MRR (planes activos)", value: formatCLP(mrr) },
    { label: "Por cobrar", value: formatCLP(porCobrar._sum.totalCLP ?? 0) },
    { label: "Facturas vencidas", value: String(vencidas) },
    { label: "Cobrado", value: formatCLP(cobrado._sum.totalCLP ?? 0) },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tablero</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Estado de las cuentas de Yellow ERP. Desde aquí operas el servicio sin entrar a la
            Configuración de ningún cliente.
          </p>
        </div>
        <DateRangeFilter from={desdeRaw} to={hastaRaw} />
      </div>

      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {metrics.map((m) => (
          <li key={m.label} className={cardClass + " px-4 py-3"}>
            <p className="text-xs text-muted-foreground">{m.label}</p>
            <p className="tabular mt-1 text-2xl font-semibold">{m.value}</p>
          </li>
        ))}
      </ul>

      <p className="text-xs text-muted-foreground">
        En el período: {altas[0]} cuenta(s) nueva(s) · {altas[1]} usuario(s) activo(s) · {altas[2]} acción(es) del equipo.
      </p>

      <section className={cardClass + " p-5"}>
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold">Cuentas con actividad reciente</h2>
          <Link href="/admin/organizaciones" className="text-sm text-primary underline underline-offset-2">
            Ver todas
          </Link>
        </div>

        {recent.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Todavía no hay organizaciones.</p>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {recent.map((org) => (
              <li key={org.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <Link
                  href={`/admin/organizaciones/${org.id}`}
                  className="text-sm font-medium hover:text-primary hover:underline"
                >
                  {org.name}
                </Link>
                <span className="text-xs text-muted-foreground">
                  {org._count.companies} empresa{org._count.companies === 1 ? "" : "s"} ·{" "}
                  {org.activeMembers} usuario{org.activeMembers === 1 ? "" : "s"} ·{" "}
                  {org.lastActivity ? `última venta ${formatDate(org.lastActivity)}` : "sin ventas"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={cardClass + " p-5"}>
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold">Cuentas por plan</h2>
          <Link href="/admin/facturacion" className="text-sm text-primary underline underline-offset-2">Facturación SaaS</Link>
        </div>
        {planes.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No hay planes en el catálogo.</p>
        ) : (
          <ul className="mt-3 flex flex-wrap gap-3">
            {planes.map((plan) => (
              <li key={plan.id} className="rounded-control border border-border px-3 py-2 text-sm">
                <span className="font-medium">{plan.name}</span>
                <span className="ml-2 text-muted-foreground">{plan._count.subscriptions} cuenta(s)</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={cardClass + " p-5"}>
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold">Módulos por cuenta</h2>
          <Link href="/admin/modulos" className="text-sm text-primary underline underline-offset-2">
            Gestionar
          </Link>
        </div>
        {modulos.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No hay módulos contratables.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {modulos.map((m) => (
              <li key={m.module.code} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="text-muted-foreground">{m.module.name}</span>
                <span className="tabular">
                  {m.enabled} de {m.total} cuenta{m.total === 1 ? "" : "s"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={cardClass + " p-5"}>
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold">Sesiones de soporte abiertas</h2>
          <Link href="/admin/impersonaciones" className="text-sm text-primary underline underline-offset-2">Historial</Link>
        </div>
        {openSessions.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Nadie está dentro de la cuenta de un cliente ahora mismo.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {openSessions.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <div>
                  <p className="text-sm font-medium">{s.organizationName}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.staffName} está dentro como {s.targetName}
                    {s.reason ? ` · ${s.reason}` : ""}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatDate(s.startedAt)} · hasta las{" "}
                  {s.until.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={cardClass + " p-5"}>
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold">Últimas acciones del equipo</h2>
          <Link href="/admin/auditoria" className="text-sm text-primary underline underline-offset-2">Ver auditoría</Link>
        </div>
        {audit.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Sin movimientos registrados todavía. Cada acción de la consola queda aquí.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {audit.map((entry) => (
              <li key={entry.id} className="text-sm">
                <span className="text-muted-foreground">{formatDate(entry.createdAt)} · </span>
                {entry.summary}
                <span className="text-muted-foreground"> — {entry.staffUserName}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
