import Link from "next/link";
import { redirect } from "next/navigation";

import { ModuleSwitcher } from "@/components/module-switcher";
import { ServiceWorkerRegistration } from "@/components/sw-registration";
import { ThemeToggle } from "@/components/theme-toggle";
import { ToasterFlash } from "@/components/toaster-flash";
import { getActiveMembership, requireUser } from "@/lib/auth";
import { getFlash } from "@/lib/flash";
import { enabledModules } from "@/lib/modules";
import { PosNav } from "@/app/pos/pos-nav";

export default async function PosLayout({ children }: LayoutProps<"/pos">) {
  const user = await requireUser();
  if (user.mustChangePassword) redirect("/perfil");

  const active = await getActiveMembership();
  if (!active) redirect("/facturas/configuracion");

  const modules = await enabledModules(user.id);
  if (!modules.some((module) => module.code === "pos")) {
    redirect("/modulos");
  }
  const flash = await getFlash();

  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b border-border bg-surface print:hidden">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-3 px-4 py-3 lg:px-8">
          <Link href="/pos" className="flex items-center gap-2 font-semibold tracking-tight">
            <span
              aria-hidden="true"
              className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-[13px] font-bold text-primary-foreground"
            >
              P
            </span>
            <span className="hidden sm:inline">Punto de Venta</span>
          </Link>

          <PosNav />

          <div className="ml-auto flex items-center gap-2">
            <span className="hidden max-w-[14rem] truncate text-xs text-muted-foreground md:inline">
              {active.company.name}
            </span>
            <ModuleSwitcher
              modules={modules.map((module) => ({ code: module.code, name: module.name }))}
              activeCode="pos"
            />
            <ThemeToggle />
          </div>
        </div>
        <div className="mx-auto max-w-[1400px] px-4 pb-2 lg:px-8">
          <p className="truncate text-xs text-muted-foreground">
            {user.name} · {active.company.name}
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-4 py-5 lg:px-8 print:max-w-none print:p-0">
        {children}
      </main>
      <ToasterFlash flash={flash} />
      <ServiceWorkerRegistration />
    </div>
  );
}
