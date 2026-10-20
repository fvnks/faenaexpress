import Link from "next/link";

import { requirePlatformStaff } from "@/lib/platform";
import { listPlatformAuditRecent, listOrganizations, platformOverview } from "@/lib/platform-queries";
import { formatDate } from "@/lib/money";
import { cardClass } from "@/lib/ui";

// Tablero del operador: el estado de todas las cuentas de un vistazo.
export default async function AdminDashboardPage() {
  await requirePlatformStaff("SUPPORT");

  const [overview, orgs, audit] = await Promise.all([
    platformOverview(),
    listOrganizations(),
    listPlatformAuditRecent(8),
  ]);

  // Orden por actividad reciente: primero lo que se está usando.
  const recent = [...orgs]
    .sort((a, b) => (b.lastActivity?.getTime() ?? 0) - (a.lastActivity?.getTime() ?? 0))
    .slice(0, 8);

  const metrics = [
    { label: "Organizaciones", value: overview.organizations },
    { label: "Empresas", value: overview.companies },
    { label: "Usuarios activos", value: overview.users },
    { label: "Equipo de plataforma", value: overview.staff },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tablero</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Estado de las cuentas de Yellow ERP. Desde aquí operas el servicio sin entrar a la
          Configuración de ningún cliente.
        </p>
      </div>

      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {metrics.map((m) => (
          <li key={m.label} className={cardClass + " px-4 py-3"}>
            <p className="text-xs text-muted-foreground">{m.label}</p>
            <p className="tabular mt-1 text-2xl font-semibold">{m.value}</p>
          </li>
        ))}
      </ul>

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
        <h2 className="font-semibold">Últimas acciones del equipo</h2>
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
