import Link from "next/link";
import { redirect } from "next/navigation";

import { logout } from "@/app/actions/auth";
import { ModuleSwitcher } from "@/components/module-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { ToasterFlash } from "@/components/toaster-flash";
import { getCurrentUser } from "@/lib/auth";
import { getFlash } from "@/lib/flash";
import { enabledModules } from "@/lib/modules";

// Shell del módulo Facturación SaaS. Paralelo al de Colegios y Facturas, pero
// con su propia navegación: el usuario gestiona plan, facturas y métodos de
// pago de la organización aquí.
export default async function BillingLayout({ children }: LayoutProps<"/billing">) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [modules, flash] = await Promise.all([enabledModules(user.id), getFlash()]);

  return (
    <div className="min-h-dvh">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 lg:px-8">
          <div className="flex items-center gap-3">
            <Link
              href="/modulos"
              className="text-sm font-bold tracking-tight text-muted-foreground hover:text-foreground"
            >
              Yellow ERP
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">
              {user.name} · {user.email}
            </span>
            <ModuleSwitcher
              modules={modules.map((module) => ({ code: module.code, name: module.name }))}
              activeCode="billing"
            />
            <Link
              href="/perfil"
              className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
            >
              Mi cuenta
            </Link>
            <ThemeToggle />
            <form action={logout}>
              <button
                type="submit"
                className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
              >
                Salir
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 lg:px-8">{children}</main>

      <ToasterFlash flash={flash} />
    </div>
  );
}
