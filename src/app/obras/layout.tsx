import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { logout } from "@/app/actions/auth";
import { ModuleSwitcher } from "@/components/module-switcher";
import { ObraSwitcher } from "@/components/obra-switcher";
import { PlatformMark } from "@/components/platform-mark";
import { ThemeToggle } from "@/components/theme-toggle";
import { ToasterFlash } from "@/components/toaster-flash";
import { getCurrentUser } from "@/lib/auth";
import { getFlash } from "@/lib/flash";
import { enabledModules } from "@/lib/modules";
import { getActiveObra, visibleObras } from "@/lib/obra-auth";
import { canAccessObra, obraRoleLabel, type ObraSection } from "@/lib/obra-permissions";

// Secciones del módulo Obras. Cada una con su propio permiso: el capataz mide
// avance, el contador arma estados de pago, la dirección decide.
const SECCIONES: { href: string; label: string; section: ObraSection }[] = [
  { href: "/obras", label: "Panel", section: "panel" },
  { href: "/obras/presupuesto", label: "Presupuesto", section: "presupuesto" },
  { href: "/obras/avance", label: "Avance", section: "avance" },
  { href: "/obras/estados-pago", label: "Estados de pago", section: "estadosPago" },
  { href: "/obras/compras", label: "Compras", section: "compras" },
  { href: "/obras/gastos", label: "Gastos", section: "gastos" },
  { href: "/obras/subcontratos", label: "Subcontratos", section: "subcontratos" },
  { href: "/obras/bodega", label: "Bodega", section: "bodega" },
  { href: "/obras/maquinaria", label: "Maquinaria", section: "maquinaria" },
  { href: "/obras/documentos", label: "Documentos", section: "documentos" },
  { href: "/obras/equipo", label: "Equipo", section: "equipo" },
  { href: "/obras/administracion", label: "Administración", section: "administracion" },
];

// Shell del módulo Obras: paralelo al de Colegios, con navegación propia.
export default async function ObrasLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.mustChangePassword) redirect("/perfil");

  const [ctx, obras, flash] = await Promise.all([
    getActiveObra(),
    visibleObras(user),
    getFlash(),
  ]);

  const modules = await enabledModules(user.id);
  if (!modules.some((module) => module.code === "obras")) {
    redirect("/modulos");
  }

  if (!ctx) {
    const { hasPlatformLevel } = await import("@/lib/platform");
    redirect((await hasPlatformLevel(user.id, "SUPPORT")) ? "/admin/obras" : "/modulos");
  }

  const visibles = SECCIONES.filter((s) => canAccessObra(ctx.role, s.section));

  return (
    <div className="catalog-grid min-h-dvh">
      <header className="border-b border-border bg-surface print:hidden">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 lg:px-8">
          <div className="flex items-center gap-3">
            <PlatformMark compact />
            <span className="text-xs text-muted-foreground">/</span>
            <ObraSwitcher
              obras={obras.map((o) => ({ id: o.id, name: o.name }))}
              activeId={ctx.obra.id}
            />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">
              {user.name} · {obraRoleLabel(ctx.role)}
            </span>
            <ModuleSwitcher
              modules={modules.map((module) => ({ code: module.code, name: module.name }))}
              activeCode="obras"
            />
            <Link href="/perfil" className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground">
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

        <nav aria-label="Secciones de la obra" className="border-t border-border">
          <ul className="mx-auto flex max-w-7xl flex-wrap gap-1 px-4 lg:px-8">
            {visibles.map((s) => (
              <li key={s.href}>
                <Link
                  href={s.href}
                  className="inline-block px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  {s.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 lg:px-8 print:max-w-none print:p-0">{children}</main>

      <ToasterFlash flash={flash} />
    </div>
  );
}
