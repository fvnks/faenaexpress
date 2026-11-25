import React from "react";
import { redirect } from "next/navigation";

import { logout } from "@/app/actions/auth";
import { ModuleSidebar, type ModuleNavGroup } from "@/components/module-sidebar";
import { ModuleSwitcher } from "@/components/module-switcher";
import { SchoolSwitcher } from "@/components/school-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { ToasterFlash } from "@/components/toaster-flash";
import { getCurrentUser } from "@/lib/auth";
import { getFlash } from "@/lib/flash";
import { enabledModules } from "@/lib/modules";
import { canAccessSchool, schoolRoleLabel, type SchoolSection } from "@/lib/school-permissions";
import { getActiveSchool, visibleSchools } from "@/lib/school-auth";

// Secciones del módulo Colegios. Cada una con su propio permiso: un docente
// ve el libro y la asistencia, no la cobranza.
const SECCIONES: { href: string; label: string; section: SchoolSection }[] = [
  { href: "/colegios", label: "Panel", section: "panel" },
  { href: "/colegios/asistencia", label: "Asistencia", section: "asistencia" },
  { href: "/colegios/calificaciones", label: "Calificaciones", section: "calificaciones" },
  { href: "/colegios/promocion", label: "Promoción", section: "promocion" },
  { href: "/colegios/promocion/art11", label: "Casos del Art. 11", section: "art11" },
  { href: "/colegios/estudiantes", label: "Alumnos", section: "estudiantes" },
  { href: "/colegios/apoderados", label: "Apoderados", section: "apoderados" },
  { href: "/colegios/cursos", label: "Cursos", section: "cursos" },
  { href: "/colegios/docentes", label: "Docentes", section: "docentes" },
  { href: "/colegios/equipo", label: "Equipo", section: "equipo" },
  { href: "/colegios/comunicacion", label: "Comunicación", section: "comunicacion" },
  { href: "/colegios/convivencia", label: "Convivencia", section: "convivencia" },
  { href: "/colegios/libro", label: "Libro de clases", section: "libro" },
  { href: "/colegios/citas", label: "Citas", section: "citas" },
  { href: "/colegios/reuniones", label: "Reuniones", section: "reuniones" },
  { href: "/colegios/agenda", label: "Agenda", section: "agenda" },
  { href: "/colegios/calendario", label: "Calendario", section: "calendario" },
];

const ICON_POR_HREF: Record<string, string> = {
  "/colegios/asistencia": "asistencia",
  "/colegios/calificaciones": "calificaciones",
  "/colegios/promocion": "promocion",
  "/colegios/promocion/art11": "promocion",
  "/colegios/estudiantes": "estudiantes",
  "/colegios/apoderados": "apoderados",
  "/colegios/cursos": "cursos",
  "/colegios/docentes": "docentes",
  "/colegios/equipo": "equipo",
  "/colegios/comunicacion": "comunicacion",
  "/colegios/convivencia": "convivencia",
  "/colegios/libro": "libro",
  "/colegios/citas": "citas",
  "/colegios/reuniones": "equipo",
  "/colegios/agenda": "calendario",
  "/colegios/calendario": "calendario",
};

function gruposColegio(role: Parameters<typeof canAccessSchool>[0]): ModuleNavGroup[] {
  const visibles = SECCIONES.filter((s) => canAccessSchool(role, s.section));
  const en = (hrefs: string[]) =>
    visibles
      .filter((s) => hrefs.includes(s.href))
      .map((s) => ({ href: s.href, label: s.label, icon: ICON_POR_HREF[s.href] ?? "panel" }));
  return [
    { label: "Gestión académica", items: en(["/colegios/asistencia", "/colegios/calificaciones", "/colegios/promocion", "/colegios/promocion/art11", "/colegios/libro"]) },
    { label: "Personas", items: en(["/colegios/estudiantes", "/colegios/apoderados", "/colegios/docentes", "/colegios/equipo"]) },
    { label: "Comunidad", items: en(["/colegios/comunicacion", "/colegios/convivencia", "/colegios/citas", "/colegios/reuniones", "/colegios/agenda", "/colegios/calendario"]) },
  ].filter((g) => g.items.length > 0);
}

// Shell del módulo Colegios: mismo andamiaje que Facturas/Obras (rail lateral
// fijo + barra superior de contexto), con su propio ámbito por colegio.
export default async function ColegiosLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.mustChangePassword) redirect("/perfil");

  const [ctx, schools, flash] = await Promise.all([
    getActiveSchool(),
    visibleSchools(user),
    getFlash(),
  ]);

  const modules = await enabledModules(user.id);

  if (!ctx) {
    const { hasPlatformLevel } = await import("@/lib/platform");
    redirect((await hasPlatformLevel(user.id, "SUPPORT")) ? "/admin/colegios" : "/modulos");
  }

  return (
    <div className="min-h-dvh">
      <div className="lg:flex">
        <ModuleSidebar
          brand="Colegios"
          brandIcon="school"
          scopeName={ctx.school.name}
          groups={gruposColegio(ctx.role)}
          homeHref="/colegios"
          homeLabel="Panel"
          userName={user.name}
          userEmail={user.email}
          roleLabel={schoolRoleLabel(ctx.role)}
          logout={logout}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex flex-wrap items-center justify-end gap-2 px-4 pt-4 lg:px-8 lg:pt-6 print:hidden">
            <ModuleSwitcher
              modules={modules.map((module) => ({ code: module.code, name: module.name, href: module.href }))}
              activeCode="colegios"
            />
            <SchoolSwitcher
              schools={schools.map((s) => ({ id: s.id, name: s.name }))}
              activeId={ctx.school.id}
            />
            <ThemeToggle />
          </div>
          <main className="catalog-grid min-w-0 flex-1 px-4 py-4 lg:px-10 lg:py-6 print:max-w-none print:p-0 print:bg-none">
            {children}
          </main>
        </div>
      </div>
      <ToasterFlash flash={flash} />
    </div>
  );
}
