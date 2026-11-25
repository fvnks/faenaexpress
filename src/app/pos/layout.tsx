import { redirect } from "next/navigation";

import { logout } from "@/app/actions/auth";
import { ServiceWorkerRegistration } from "@/components/sw-registration";
import { ModuleSidebar, type ModuleNavGroup } from "@/components/module-sidebar";
import { ModuleSwitcher } from "@/components/module-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { ToasterFlash } from "@/components/toaster-flash";
import { getActiveMembership, requireUser } from "@/lib/auth";
import { getFlash } from "@/lib/flash";
import { roleLabel } from "@/lib/labels";
import { enabledModules } from "@/lib/modules";

const GRUPOS: ModuleNavGroup[] = [
  {
    label: "Operación",
    items: [
      { href: "/pos/venta", label: "Vender", icon: "venta" },
      { href: "/pos/ventas", label: "Ventas", icon: "ventas" },
      { href: "/pos/credito", label: "Cuenta corriente", icon: "cuenta" },
      { href: "/pos/caja", label: "Caja", icon: "caja" },
    ],
  },
  {
    label: "Catálogo",
    items: [
      { href: "/pos/productos", label: "Productos", icon: "productos" },
      { href: "/pos/etiquetas", label: "Etiquetas", icon: "etiquetas" },
    ],
  },
  {
    label: "Sistema",
    items: [
      { href: "/pos/terminales", label: "Terminales", icon: "terminales" },
      { href: "/pos/tpv/config", label: "TPV", icon: "TPV" },
      { href: "/pos/kds", label: "Cocina (KDS)", icon: "cocina" },
      { href: "/pos/reportes", label: "Reportes", icon: "reportes" },
      { href: "/pos/sincronizar", label: "Sincronizar", icon: "sincronizar" },
    ],
  },
];

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
      <div className="lg:flex">
        <ModuleSidebar
          brand="Punto de Venta"
          brandIcon="pos"
          scopeName={active.company.name}
          groups={GRUPOS}
          homeHref="/pos"
          homeLabel="Resumen"
          userName={user.name}
          userEmail={user.email}
          roleLabel={roleLabel(active.role)}
          logout={logout}
          showConnection
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex flex-wrap items-center justify-end gap-2 px-4 pt-4 lg:px-8 lg:pt-6 print:hidden">
            <ModuleSwitcher
              modules={modules.map((module) => ({ code: module.code, name: module.name, href: module.href }))}
              activeCode="pos"
            />
            <span className="hidden max-w-[14rem] truncate text-xs text-muted-foreground md:inline-block" title={active.company.name}>
              {active.company.name}
            </span>
            <ThemeToggle />
          </div>
          <main className="catalog-grid min-w-0 flex-1 px-4 py-4 lg:px-8 lg:py-6 print:max-w-none print:p-0 print:bg-none">
            {children}
          </main>
        </div>
      </div>
      <ToasterFlash flash={flash} />
      <ServiceWorkerRegistration />
    </div>
  );
}
