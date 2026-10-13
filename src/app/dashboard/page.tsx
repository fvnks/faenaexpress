import Link from "next/link";

import { Alert, type AlertVariant } from "@/components/alert";
import { MonthlyBarsChart, RankBars } from "@/components/charts";
import { requireContext } from "@/lib/auth";
import { formatCLP, formatPeriod, currentPeriod, monthRange, shiftPeriod } from "@/lib/money";
import { listNotifications } from "@/lib/notifications";
import { canAccess, type Section } from "@/lib/permissions";
import { expensesBreakdown, ivaSummary, monthlyTotals, pendingTotals, topClients } from "@/lib/reports";
import { cardClass } from "@/lib/ui";

type Module = {
  name: string;
  description: string;
  href: string;
  section: Section;
  icon: "compras" | "ventas" | "gastos" | "reportes" | "clientes" | "proveedores" | "catalogos" | "auditoria";
};

const modules: Module[] = [
  {
    name: "Compras",
    description: "Facturas y boletas de proveedores, con su estado de pago.",
    href: "/dashboard/compras",
    section: "compras",
    icon: "compras",
  },
  {
    name: "Ventas",
    description: "Facturas emitidas a clientes, con su estado de cobro.",
    href: "/dashboard/ventas",
    section: "ventas",
    icon: "ventas",
  },
  {
    name: "Gastos",
    description: "Gastos de la empresa y quién pagó cada uno.",
    href: "/dashboard/gastos",
    section: "gastos",
    icon: "gastos",
  },
  {
    name: "Reportes",
    description: "IVA mensual, libros de compras y ventas, y estado de pagos.",
    href: "/dashboard/reportes",
    section: "reportes",
    icon: "reportes",
  },
  {
    name: "Clientes",
    description: "Compradores a los que se emiten facturas de venta.",
    href: "/dashboard/clientes",
    section: "clientes",
    icon: "clientes",
  },
  {
    name: "Proveedores",
    description: "Proveedores de los que se registran compras.",
    href: "/dashboard/proveedores",
    section: "proveedores",
    icon: "proveedores",
  },
  {
    name: "Catálogos",
    description: "Áreas, categorías, vendedores y pagadores que se usan al registrar movimientos.",
    href: "/dashboard/catalogos",
    section: "catalogos",
    icon: "catalogos",
  },
  {
    name: "Auditoría",
    description: "Quién creó, editó o eliminó cada registro y cuándo.",
    href: "/dashboard/auditoria",
    section: "auditoria",
    icon: "auditoria",
  },
];

function ArrowUp({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M7 17L17 7" /><path d="M7 7h10v10" />
    </svg>
  );
}

function ArrowDown({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M7 7l10 10" /><path d="M17 7v10H7" />
    </svg>
  );
}

function StatCard({
  label,
  value,
  hint,
  diff,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  diff: number | null;
  tone?: "default" | "success" | "warning" | "danger";
}) {
  const hasDiff = diff !== null;
  const positive = hasDiff && diff >= 0;
  const iconColor = !hasDiff
    ? tone === "warning" ? "text-accent" : tone === "danger" ? "text-danger" : "text-muted-foreground"
    : positive ? "text-success" : "text-danger";
  const badgeBg = !hasDiff
    ? tone === "warning" ? "bg-accent-soft" : tone === "danger" ? "bg-danger-soft" : "bg-background"
    : positive ? "bg-success-soft" : "bg-danger-soft";

  return (
    <div className={cardClass + " p-6"}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            {label}
          </div>
          <div className="tabular mt-2 text-xl font-bold tracking-tight">{value}</div>
        </div>
        <div className={"flex h-12 w-12 shrink-0 items-center justify-center rounded-card " + badgeBg}>
          {hasDiff ? (
            positive ? <ArrowUp className={"h-6 w-6 " + iconColor} /> : <ArrowDown className={"h-6 w-6 " + iconColor} />
          ) : (
            <span className={"h-3 w-3 rounded-full " + (tone === "warning" ? "bg-accent" : tone === "danger" ? "bg-danger" : "bg-muted-foreground")} aria-hidden="true" />
          )}
        </div>
      </div>
      <div className="mt-4 border-t border-border pt-3 text-sm">
        {hasDiff ? (
          <span className="text-muted-foreground">
            <span className={"font-bold " + iconColor}>
              {positive ? "+" : ""}{diff}%
            </span>{" "}
            vs mes anterior
          </span>
        ) : hint ? (
          <span className="text-muted-foreground">{hint}</span>
        ) : null}
      </div>
    </div>
  );
}

function ModuleIcon({ name }: { name: Module["icon"] }) {
  const cls = "h-6 w-6 text-primary";
  switch (name) {
    case "compras":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cls} aria-hidden="true">
          <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
        </svg>
      );
    case "ventas":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cls} aria-hidden="true">
          <path d="M12 1v22" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      );
    case "gastos":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cls} aria-hidden="true">
          <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
          <path d="M8 7h8" /><path d="M8 11h8" /><path d="M8 15h5" />
        </svg>
      );
    case "reportes":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cls} aria-hidden="true">
          <path d="M3 3v18h18" /><path d="M18 17V9" /><path d="M13 17V5" /><path d="M8 17v-3" />
        </svg>
      );
    case "clientes":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cls} aria-hidden="true">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case "proveedores":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cls} aria-hidden="true">
          <path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
          <path d="M17 18h1" /><path d="M12 18h1" /><path d="M7 18h1" />
        </svg>
      );
    case "catalogos":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cls} aria-hidden="true">
          <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
        </svg>
      );
    case "auditoria":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cls} aria-hidden="true">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      );
  }
}

export default async function DashboardPage(props: PageProps<"/dashboard">) {
  const ctx = await requireContext();
  const visible = modules.filter((module) => canAccess(ctx.role, module.section));

  const searchParams = await props.searchParams;
  const rawPeriod = typeof searchParams.period === "string" ? searchParams.period : "";
  const period = /^\d{4}-\d{2}$/.test(rawPeriod) ? rawPeriod : currentPeriod();
  const range = monthRange(period) ?? { from: new Date(), to: new Date() };
  const prevRange = monthRange(shiftPeriod(period, -1)) ?? { from: new Date(), to: new Date() };
  const mes = formatPeriod(period);
  const hoy = currentPeriod();
  const isCurrent = period === hoy;

  const [iva, prevIva, pending, notifications, monthly, clientes, gastosCat] = await Promise.all([
    ivaSummary(ctx.company.id, range),
    ivaSummary(ctx.company.id, prevRange),
    pendingTotals(ctx.company.id),
    listNotifications(ctx.company.id, 5),
    monthlyTotals(ctx.company.id),
    topClients(ctx.company.id, range),
    expensesBreakdown(ctx.company.id, range),
  ]);

  const unread = notifications.filter((notification) => notification.readAt === null);

  // Porcentaje de cambio vs mes anterior. null cuando no hay base de comparación.
  const diff = (current: number, previous: number): number | null => {
    if (previous === 0) return current === 0 ? 0 : null;
    return Math.round(((current - previous) / previous) * 100);
  };

  const stats = [
    {
      label: "Ventas (neto)",
      value: formatCLP(iva.sales.net),
      hint: `Total con IVA: ${formatCLP(iva.sales.total)}`,
      diff: diff(iva.sales.net, prevIva.sales.net),
    },
    {
      label: "Compras (neto)",
      value: formatCLP(iva.purchases.net),
      hint: `Total con IVA: ${formatCLP(iva.purchases.total)}`,
      diff: diff(iva.purchases.net, prevIva.purchases.net),
    },
    {
      label: "Gastos",
      value: formatCLP(iva.expenses.total),
      hint: "Incluye IVA",
      diff: diff(iva.expenses.total, prevIva.expenses.total),
    },
    {
      label: iva.ivaResultado >= 0 ? "IVA a pagar" : "Remanente de IVA",
      value: formatCLP(Math.abs(iva.ivaResultado)),
      hint:
        iva.ivaResultado >= 0
          ? `Débito: ${formatCLP(iva.debitoFiscal)}`
          : `Crédito: ${formatCLP(iva.creditoFiscal)}`,
      diff: diff(Math.abs(iva.ivaResultado), Math.abs(prevIva.ivaResultado)),
    },
    {
      label: "Por cobrar",
      value: formatCLP(pending.porCobrar),
      hint: "Ventas pendientes de cobro",
      diff: null,
    },
    {
      label: "Por pagar",
      value: formatCLP(pending.porPagar),
      hint: "Compras pendientes de pago",
      diff: null,
    },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Panel</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Resumen de {mes} y del estado de pagos de {ctx.company.name}.
          </p>
        </div>
        <nav className="flex items-center gap-1 md:hidden" aria-label="Período del panel">
          <Link
            href={`/dashboard?period=${shiftPeriod(period, -1)}`}
            aria-label="Mes anterior"
            className="flex h-8 w-8 items-center justify-center rounded-control border border-border bg-surface text-sm text-foreground transition-colors hover:bg-primary-soft/50"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </Link>
          <div className="flex items-center gap-2 rounded-control border border-border bg-surface px-3 py-2 text-sm">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-muted-foreground" aria-hidden="true">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span className="font-medium tabular">{mes}</span>
          </div>
          <Link
            href={`/dashboard?period=${shiftPeriod(period, 1)}`}
            aria-label="Mes siguiente"
            className="flex h-8 w-8 items-center justify-center rounded-control border border-border bg-surface text-sm text-foreground transition-colors hover:bg-primary-soft/50"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </Link>
          {isCurrent ? null : (
            <Link
              href="/dashboard"
              className="btn-liquid btn-liquid-secondary ml-1 rounded-control border border-border bg-transparent px-3 py-1.5 text-sm text-foreground"
            >
              Hoy
            </Link>
          )}
        </nav>
      </div>

      <section className="mt-6" aria-labelledby="kpis-title">
        <h2 id="kpis-title" className="text-sm font-semibold text-muted-foreground">
          Indicadores de {mes}
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {stats.map((stat) => (
            <StatCard key={stat.label} label={stat.label} value={stat.value} hint={stat.hint} diff={stat.diff} tone={stat.label === "Por cobrar" ? "warning" : stat.label === "Por pagar" ? "danger" : undefined} />
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Reembolsos pendientes a pagadores: {formatCLP(pending.reembolsosPendientes)}.{" "}
          <Link href="/dashboard/reportes" className="text-primary underline-offset-2 hover:underline">
            Ver reportes
          </Link>
        </p>
      </section>

      <section className="mt-8" aria-labelledby="charts-title">
        <h2 id="charts-title" className="text-sm font-semibold text-muted-foreground">
          Evolución de los últimos 12 meses
        </h2>
        <div className={cardClass + " mt-3 p-5"}>
          <MonthlyBarsChart data={monthly} />
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className={cardClass + " p-5"}>
            <h3 className="font-semibold">Top clientes de {mes}</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Por total facturado (neto + IVA), con notas de crédito descontadas.
            </p>
            <div className="mt-4">
              <RankBars items={clientes.map((c) => ({ label: c.name, total: c.total }))} emptyLabel={`Sin ventas en este período.`} />
            </div>
          </div>
          <div className={cardClass + " p-5"}>
            <h3 className="font-semibold">Gastos por categoría de {mes}</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Incluye IVA.{" "}
              <Link href="/dashboard/reportes/gastos" className="text-primary underline-offset-2 hover:underline">
                Ver detalle por área
              </Link>
            </p>
            <div className="mt-4">
              <RankBars
                items={gastosCat.byCategory.slice(0, 5).map((c) => ({ label: c.name, total: c.total }))}
                emptyLabel={`Sin gastos en este período.`}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="mt-8" aria-labelledby="alerts-title">
        <div className="flex items-center justify-between gap-3">
          <h2 id="alerts-title" className="text-sm font-semibold text-muted-foreground">
            Alertas
          </h2>
          <Link
            href="/dashboard/notificaciones"
            className="text-xs text-primary underline-offset-2 hover:underline"
          >
            {unread.length > 0 ? `${unread.length} sin leer · ` : ""}Ver todas
          </Link>
        </div>

        {notifications.length === 0 ? (
          <p className={cardClass + " mt-3 px-4 py-4 text-sm text-muted-foreground"}>
            Sin alertas por ahora. Aquí aparecerán las compras y ventas por vencer o vencidas.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {notifications.map((notification) => {
              const unreadItem = notification.readAt === null;
              const variant: AlertVariant = !unreadItem
                ? "info"
                : notification.type === "PURCHASE_OVERDUE" || notification.type === "SALE_OVERDUE"
                  ? "destructive"
                  : "warning";

              return (
                <li key={notification.id}>
                  <Alert variant={variant} title={notification.title}>
                    {notification.message}
                  </Alert>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <h2 className="mt-8 text-sm font-semibold text-muted-foreground">Módulos</h2>
      <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {visible.map((module) => (
          <li key={module.name}>
            <Link
              href={module.href}
              className="group flex h-full flex-col rounded-card border border-border bg-surface p-5 transition-all hover:border-primary hover:shadow-md"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-control bg-primary-soft">
                <ModuleIcon name={module.icon} />
              </div>
              <h3 className="mt-3 font-semibold">{module.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{module.description}</p>
              <span className="mt-auto pt-3 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                Ir al módulo
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}