import React from "react";
import { redirect } from "next/navigation";

import { logout } from "@/app/actions/auth";
import { ModuleSwitcher } from "@/components/module-switcher";
import { ObraSidebar } from "@/components/obra-sidebar";
import { ObraSwitcher } from "@/components/obra-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { ToasterFlash } from "@/components/toaster-flash";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getFlash } from "@/lib/flash";
import { enabledModules } from "@/lib/modules";
import { getActiveObra, visibleObras } from "@/lib/obra-auth";
import { obraStatusLabel } from "@/lib/obra-permissions";

// Shell del módulo Obras: mismo andamiaje que Facturas (rail lateral fijo,
// barra superior de contexto y contenido catalog-grid), con propio ámbito.
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

  const [pendingEP] = await Promise.all([
    db.estadoPago.count({ where: { obraId: ctx.obra.id, estado: "BORRADOR" } }),
  ]);

  return (
    <div className="min-h-dvh">
      <div className="lg:flex">
        <ObraSidebar
          role={ctx.role}
          userName={user.name}
          userEmail={user.email}
          obraName={ctx.obra.name}
          pendingEP={pendingEP}
          logout={logout}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Barra superior: switchers, estado y tema, en el flujo del layout */}
          <div className="flex flex-wrap items-center justify-end gap-2 px-4 pt-4 lg:px-8 lg:pt-6 print:hidden">
            <span className="mr-auto hidden rounded-full border border-border bg-surface px-3 py-1 text-xs text-muted-foreground sm:inline-block">
              {obraStatusLabel(ctx.obra.status)}
            </span>
            <ModuleSwitcher
              modules={modules.map((module) => ({ code: module.code, name: module.name }))}
              activeCode="obras"
            />
            <ObraSwitcher
              obras={obras.map((o) => ({ id: o.id, name: o.name }))}
              activeId={ctx.obra.id}
            />
            <ThemeToggle />
          </div>
          <main className="catalog-grid min-w-0 flex-1 px-4 py-4 lg:px-10 lg:py-6 print:p-0 print:bg-none">
            {children}
          </main>
        </div>
      </div>
      <ToasterFlash flash={flash} />
    </div>
  );
}
