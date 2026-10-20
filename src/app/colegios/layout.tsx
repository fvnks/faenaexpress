import Link from "next/link";
import { redirect } from "next/navigation";

import { logout } from "@/app/actions/auth";
import { SchoolSwitcher } from "@/components/school-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { ToasterFlash } from "@/components/toaster-flash";
import { getCurrentUser } from "@/lib/auth";
import { getFlash } from "@/lib/flash";
import { canAccessSchool, schoolRoleLabel, type SchoolSection } from "@/lib/school-permissions";
import { getActiveSchool, visibleSchools } from "@/lib/school-auth";

// Secciones del módulo Colegios. Cada una tiene su propio permiso: un docente
// ve el libro y la asistencia, no la cobranza.
const SECCIONES: { href: string; label: string; section: SchoolSection }[] = [
  { href: "/colegios", label: "Panel", section: "panel" },
  { href: "/colegios/asistencia", label: "Asistencia", section: "asistencia" },
  { href: "/colegios/estudiantes", label: "Alumnos", section: "estudiantes" },
  { href: "/colegios/cursos", label: "Cursos", section: "cursos" },
  { href: "/colegios/libro", label: "Libro de clases", section: "libro" },
];

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

  const visibles = SECCIONES.filter((s) => canAccessSchool(ctx.role, s.section));

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

        <nav aria-label="Secciones del colegio" className="border-t border-border">
          <ul className="mx-auto flex max-w-6xl flex-wrap gap-1 px-4 lg:px-8">
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

      <main className="mx-auto max-w-6xl px-4 py-6 lg:px-8">{children}</main>

      <ToasterFlash flash={flash} />
    </div>
  );
}
