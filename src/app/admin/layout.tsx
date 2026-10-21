import Link from "next/link";

import { logout } from "@/app/actions/auth";
import { AdminNav } from "@/components/admin-nav";
import { ImpersonationBanner } from "@/components/impersonation-banner";
import { ThemeToggle } from "@/components/theme-toggle";
import { ToasterFlash } from "@/components/toaster-flash";
import { getFlash } from "@/lib/flash";
import { getImpersonationContext } from "@/lib/impersonation";
import { platformLevelLabel, requirePlatformStaff } from "@/lib/platform";

// Consola de operador (Nivel 2). El layout corta ANTES de renderizar cualquier
// página: quien no sea personal de plataforma activo no ve nada de /admin, ni
// siquiera el armazón. Cada página y cada acción vuelven a exigir el nivel.
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const ctx = await requirePlatformStaff("SUPPORT");
  const [flash, impersonation] = await Promise.all([getFlash(), getImpersonationContext()]);

  return (
    <div className="min-h-dvh">
      {/* Mientras hay impersonación activa, el banner manda: el operador no
          puede creer que está en su propia cuenta. */}
      {impersonation ? (
        <ImpersonationBanner
          organizationName={impersonation.organization.name}
          targetName={impersonation.target.name}
          reason={impersonation.reason}
          until={impersonation.until.toISOString()}
        />
      ) : null}

      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 lg:px-8">
          <div className="flex items-baseline gap-3">
            <Link href="/admin" className="text-sm font-bold tracking-tight">
              Yellow ERP
            </Link>
            <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
              Consola de operador
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">
              {ctx.user.name} · {platformLevelLabel(ctx.staff.level)}
            </span>
            <Link
              href="/perfil"
              className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
            >
              Mi cuenta
            </Link>
            <ThemeToggle />
            <form action={logout}>
              <button type="submit" className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground">
                Salir
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-5 lg:flex-row lg:px-8">
        <AdminNav level={ctx.staff.level} />
        <main className="min-w-0 flex-1">{children}</main>
      </div>

      <ToasterFlash flash={flash} />
    </div>
  );
}
