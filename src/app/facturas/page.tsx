import Link from "next/link";
import { Percent, Receipt, ShoppingBag, TrendingUp } from "lucide-react";

import { Alert, type AlertVariant } from "@/components/alert";
import { MonthlyBarsChart, RankBars } from "@/components/charts";
import { Kpi01, Kpi04 } from "@/components/ui/studio-blocks";
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
    href: "/facturas/compras",
    section: "compras",
    icon: "compras",
  },
  {
    name: "Ventas",
    description: "Facturas emitidas a clientes, con su estado de cobro.",
    href: "/facturas/ventas",
    section: "ventas",
    icon: "ventas",
  },
  {
    name: "Gastos",
    description: "Gastos de la empresa y quién pagó cada uno.",
    href: "/facturas/gastos",
    section: "gastos",
    icon: "gastos",
  },
  {
    name: "Reportes",
    description: "IVA mensual, libros de compras y ventas, y estado de pagos.",
    href: "/facturas/reportes",
    section: "reportes",
    icon: "reportes",
  },
  {
    name: "Clientes",
    description: "Compradores a los que se emiten facturas de venta.",
    href: "/facturas/clientes",
    section: "clientes",
    icon: "clientes",
  },
  {
    name: "Proveedores",
    description: "Proveedores de los que se registran compras.",
    href: "/facturas/proveedores",
    section: "proveedores",
    icon: "proveedores",
  },
  {
    name: "Catálogos",
    description: "Áreas, categorías, vendedores y pagadores que se usan al registrar movimientos.",
    href: "/facturas/catalogos",
    section: "catalogos",
    icon: "catalogos",
  },
  {
    name: "Auditoría",
    description: "Quién creó, editó o eliminó cada registro y cuándo.",
    href: "/facturas/auditoria",
    section: "auditoria",
    icon: "auditoria",
  },
];

export default async function DashboardPage(props: PageProps<"/facturas">) {
  const ctx = await requireContext();
  const visible = modules.filter((module) => canAccess(ctx.role, module.section));

  const searchParams = await props.searchParams;
  const rawPeriod = typeof searchParams.period === "string" ? searchParams.period : "";
  const period = /^\d{4}-\d{2}$/.test(rawPeriod) ? rawPeriod : currentPeriod();

  // Aviso cuando una acción quedó bloqueada por la impersonación: el operador
  // tiene que saber POR QUÉ no puede seguir, no solo que no puede.
  const rawBloqueo = typeof searchParams.bloqueo === "string" ? searchParams.bloqueo : "";
  const bloqueo =
    rawBloqueo === "rrhh"
      ? {
          titulo: "RRHH no se puede ver en una sesión de soporte",
          detalle:
            "Los sueldos y remuneraciones del cliente no se abren desde una impersonación: es el dato más sensible de la cuenta y requiere la sesión del cliente.",
        }
      : rawBloqueo === "modulo"
        ? {
            titulo: "Esta sección no está habilitada en tu cuenta",
            detalle:
              "El módulo que la contiene no está contratado. Si debería estarlo, escríbenos y lo activamos.",
          }
        : null;
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

  // Tendencia para las tarjetas KPI: el porcentaje con su signo, o nada si no
  // hay mes anterior contra el cual comparar.
  const trend = (current: number, previous: number) => {
    const d = diff(current, previous);
    return d === null
      ? undefined
      : { value: `${d >= 0 ? "+" : ""}${d}%`, label: "vs mes anterior", positive: d >= 0 };
  };

  // "Neto + IVA" solo da el total cuando el documento no tiene retención ni
  // montos exentos. Cuando no da, el hint lo dice, con el número real y la
  // razón de la diferencia: si no, el panel parece estar mal.
  const hintVentas =
    iva.sales.net + iva.sales.iva === iva.sales.total
      ? `Total con IVA: ${formatCLP(iva.sales.total)}`
      : `Total: ${formatCLP(iva.sales.total)}`;
  const hintCompras =
    iva.purchases.net + iva.purchases.iva === iva.purchases.total
      ? `Total con IVA: ${formatCLP(iva.purchases.total)}`
      : `Total: ${formatCLP(iva.purchases.total)}`;

  const ajustesVentas = [
    iva.ajustes.retencionesVentas !== 0
      ? `retenciones ${formatCLP(Math.abs(iva.ajustes.retencionesVentas))}`
      : null,
    iva.ajustes.exentoVentas !== 0
      ? `exento ${formatCLP(Math.abs(iva.ajustes.exentoVentas))}`
      : null,
  ].filter((x): x is string => x !== null);

  const ajustesCompras = [
    iva.ajustes.exentoCompras !== 0
      ? `exento ${formatCLP(Math.abs(iva.ajustes.exentoCompras))}`
      : null,
    iva.ajustes.recargoCompras !== 0
      ? `recargo ${formatCLP(Math.abs(iva.ajustes.recargoCompras))}`
      : null,
  ].filter((x): x is string => x !== null);

  const footerVentas =
    ajustesVentas.length > 0 ? `${hintVentas} · ${ajustesVentas.join(" · ")}` : hintVentas;
  const footerCompras =
    ajustesCompras.length > 0 ? `${hintCompras} · ${ajustesCompras.join(" · ")}` : hintCompras;

  return (
    <div>
      {bloqueo ? (
        <div className="mb-4">
          <Alert variant="warning" title={bloqueo.titulo}>
            {bloqueo.detalle}
          </Alert>
        </div>
      ) : null}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Panel</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Resumen de {mes} y del estado de pagos de {ctx.company.name}.
          </p>
        </div>
        <nav className="flex items-center gap-1 md:hidden" aria-label="Período del panel">
          <Link
            href={`/facturas?period=${shiftPeriod(period, -1)}`}
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
            href={`/facturas?period=${shiftPeriod(period, 1)}`}
            aria-label="Mes siguiente"
            className="flex h-8 w-8 items-center justify-center rounded-control border border-border bg-surface text-sm text-foreground transition-colors hover:bg-primary-soft/50"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </Link>
          {isCurrent ? null : (
            <Link
              href="/facturas"
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
          <Kpi01
            title="Ventas (neto)"
            value={iva.sales.net}
            icon={<TrendingUp aria-hidden="true" className="size-4" />}
            trend={trend(iva.sales.net, prevIva.sales.net)}
            footer={footerVentas}
          />
          <Kpi01
            title="Compras (neto)"
            value={iva.purchases.net}
            icon={<ShoppingBag aria-hidden="true" className="size-4" />}
            trend={trend(iva.purchases.net, prevIva.purchases.net)}
            footer={footerCompras}
          />
          <Kpi01
            title="Gastos"
            value={iva.expenses.total}
            icon={<Receipt aria-hidden="true" className="size-4" />}
            trend={trend(iva.expenses.total, prevIva.expenses.total)}
            footer="Incluye IVA"
          />
          <Kpi01
            title={iva.ivaResultado >= 0 ? "IVA a pagar" : "Remanente de IVA"}
            value={Math.abs(iva.ivaResultado)}
            icon={<Percent aria-hidden="true" className="size-4" />}
            trend={trend(Math.abs(iva.ivaResultado), Math.abs(prevIva.ivaResultado))}
            footer={
              iva.ivaResultado >= 0
                ? `Débito: ${formatCLP(iva.debitoFiscal)}`
                : `Crédito: ${formatCLP(iva.creditoFiscal)}`
            }
          />
          <Kpi04
            title="Por cobrar"
            value={pending.porCobrar}
            footer="Ventas pendientes de cobro"
          />
          <Kpi04
            title="Por pagar"
            value={pending.porPagar}
            footer="Compras pendientes de pago"
          />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Reembolsos pendientes a pagadores: {formatCLP(pending.reembolsosPendientes)}.{" "}
          <Link href="/facturas/reportes" className="text-primary underline-offset-2 hover:underline">
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
              <Link href="/facturas/reportes/gastos" className="text-primary underline-offset-2 hover:underline">
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
            href="/facturas/notificaciones"
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
