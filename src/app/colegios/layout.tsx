import Link from "next/link";
import { redirect } from "next/navigation";

import { logout } from "@/app/actions/auth";
import { SchoolSwitcher } from "@/components/school-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { ToasterFlash } from "@/components/toaster-flash";
import { getCurrentUser } from "@/lib/auth";
import { getFlash } from "@/lib/flash";
import { schoolRoleLabel } from "@/lib/school-permissions";
import { getActiveSchool, visibleSchools } from "@/lib/school-auth";

// Shell del módulo Colegios. Es paralelo al de Facturas, pero con su propia
// navegación: las secciones de un colegio no son las de una empresa.
export default async function ColegiosLayout({ children }: LayoutProps<"/colegios">) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [ctx, schools, flash] = await Promise.all([
    getActiveSchool(),
    visibleSchools(user),
    getFlash(),
  ]);

  // Sin colegio al que entrar: se vuelve al selector de módulos.
  if (!ctx) redirect("/modulos");

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
            <SchoolSwitcher
              schools={schools.map((s) => ({ id: s.id, name: s.name }))}
              activeId={ctx.school.id}
            />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">
              {user.name} · {schoolRoleLabel(ctx.role)}
            </span>
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
