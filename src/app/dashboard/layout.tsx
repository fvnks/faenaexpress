import Link from "next/link";

import { logout } from "@/app/actions/auth";
import { CompanySwitcher } from "@/components/company-switcher";
import { PeriodNav } from "@/components/period-nav";
import { Sidebar } from "@/components/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { LiveSearchInputs } from "@/components/live-search-inputs";
import { ToasterFlash } from "@/components/toaster-flash";
import { getActiveMembership, requireUser, visibleCompanies } from "@/lib/auth";
import { countPendingMovements } from "@/lib/banco";
import { getFlash } from "@/lib/flash";
import { roleLabel } from "@/lib/labels";
import { countUnreadNotifications, syncDueNotifications } from "@/lib/notifications";
import { canAccess } from "@/lib/permissions";
import { pendingCounts } from "@/lib/reports";

export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  const user = await requireUser();
  const active = await getActiveMembership();
  // Companies visibles: usa `visibleCompanies` para respetar el permiso
  // `canSwitchCompanies` de la organización. Sin él, solo se ven las memberships
  // activas del usuario (comportamiento actual).
  const companies = await visibleCompanies(user);
  const orgName = user.orgMembership?.organization.name ?? null;

  // Las alertas de vencimiento se recalculan en cada entrada al panel.
  if (active) {
    await syncDueNotifications(active.company.id);
  }

  const [unread, pending, pendingBank, flash] = await Promise.all([
    active ? countUnreadNotifications(active.company.id) : Promise.resolve(0),
    active ? pendingCounts(active.company.id) : Promise.resolve({ sales: 0 }),
    // Solo administración y contabilidad ven el banco: para el resto no se
    // consulta siquiera.
    active && canAccess(active.role, "banco")
      ? countPendingMovements(active.company.id)
      : Promise.resolve(0),
    getFlash(),
  ]);

  return (
    <div className="min-h-dvh lg:flex">
      <Sidebar
        role={active?.role ?? null}
        inventoryAccess={active?.inventoryAccess ?? undefined}
        userName={user.name}
        userEmail={user.email}
        roleLabel={active ? roleLabel(active.role) : "Sin empresa"}
        companyName={active?.company.name ?? "Sin empresa"}
        pendingSales={pending.sales}
        pendingBank={pendingBank}
        logout={logout}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Barra superior: período + empresa + tema + campana, en el flujo del layout */}
        <div className="flex items-center justify-end gap-2 px-4 pt-4 lg:px-8 lg:pt-6">
          <PeriodNav className="hidden md:flex" />
          <CompanySwitcher companies={companies} activeId={active?.company.id ?? null} orgName={orgName} />
          <ThemeToggle />
          <Link
            href="/dashboard/notificaciones"
            aria-label={unread > 0 ? `Notificaciones: ${unread} sin leer` : "Notificaciones"}
            className="relative flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface text-muted-foreground shadow-sm transition-colors hover:bg-background"
            style={{ fontSize: "14px" }}
          >
            {unread > 0 ? (
              <svg
                key="bell-solid"
                viewBox="0 0 448 512"
                height="1em"
                xmlns="http://www.w3.org/2000/svg"
                className="bell-icon-in"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M224 0c-17.7 0-32 14.3-32 32V51.2C119 66 64 130.6 64 208v18.8c0 47-17.3 92.4-48.5 127.6l-7.4 8.3c-8.4 9.4-10.4 22.9-5.3 34.4S19.4 416 32 416H416c12.6 0 24-7.4 29.2-18.9s3.1-25-5.3-34.4l-7.4-8.3C401.3 319.2 384 273.9 384 226.8V208c0-77.4-55-142-128-156.8V32c0-17.7-14.3-32-32-32zm45.3 493.3c12-12 18.7-28.3 18.7-45.3H224 160c0 17 6.7 33.3 18.7 45.3s28.3 18.7 45.3 18.7s33.3-6.7 45.3-18.7s18.7-28.3 18.7-45.3z" />
              </svg>
            ) : (
              <svg
                key="bell-regular"
                viewBox="0 0 448 512"
                height="1em"
                xmlns="http://www.w3.org/2000/svg"
                className="bell-icon-in"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M224 0c-17.7 0-32 14.3-32 32V49.9C119.5 61.4 64 124.2 64 200v33.4c0 45.4-15.5 89.5-43.8 124.9L5.3 377c-5.8 7.2-6.9 17.1-2.9 25.4S14.8 416 24 416H424c9.2 0 17.6-5.3 21.6-13.6s2.9-18.2-2.9-25.4l-14.9-18.6C399.5 322.9 384 278.8 384 233.4V200c0-75.8-55.5-138.6-128-150.1V32c0-17.7-14.3-32-32-32zm0 96h8c57.4 0 104 46.6 104 104v33.4c0 47.9 13.9 94.6 39.7 134.6H72.3C98.1 328 112 281.3 112 233.4V200c0-57.4 46.6-104 104-104h8zm64 352H224 160c0 17 6.7 33.3 18.7 45.3s28.3 18.7 45.3 18.7s33.3-6.7 45.3-18.7s18.7-28.3 18.7-45.3z" />
              </svg>
            )}
            {unread > 0 ? (
              <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-danger px-1 text-center text-[10px] font-semibold leading-4 text-danger-foreground">
                {unread > 99 ? "99+" : unread}
              </span>
            ) : null}
          </Link>
        </div>
        <main className="min-w-0 flex-1 px-4 py-4 lg:px-10 lg:py-6">{children}</main>
      </div>
      <LiveSearchInputs />
      <ToasterFlash flash={flash} />
    </div>
  );
}