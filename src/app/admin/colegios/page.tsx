import { CreateSchoolForm } from "@/app/admin/create-forms";
import { ModuleToggle } from "@/app/admin/module-toggle";
import { organizationModuleStates } from "@/lib/org-module-state";
import { requirePlatformStaff } from "@/lib/platform";
import { listOrganizations } from "@/lib/platform-queries";
import { schoolLevelLabel } from "@/lib/school-permissions";
import { cardClass } from "@/lib/ui";
import { db } from "@/lib/db";

// Colegios desde la consola: los establecimientos reales y quién puede entrar.
//
// Esta pantalla existe porque el módulo Colegios es un producto aparte: el
// operador necesita ver los colegios cargados, quién es miembro de cada uno y
// habilitar el módulo para la organización que lo contrató.
export default async function AdminSchoolsPage() {
  const ctx = await requirePlatformStaff("SUPPORT");

  const [schools, orgs] = await Promise.all([
    db.school.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        organization: { select: { id: true, name: true } },
        memberships: {
          where: { active: true },
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        _count: { select: { students: true, courses: true } },
      },
    }),
    listOrganizations(),
  ]);

  // Estado del módulo Colegios por organización: qué cuenta lo tiene habilitado.
  const modulos = await Promise.all(
    orgs.map(async (org) => {
      const estados = await organizationModuleStates(org.id);
      const colegios = estados.find((e) => e.module.code === "colegios");
      return {
        org,
        colegios: colegios ?? { enabled: true, source: "defecto", module: null },
      };
    }),
  );

  const puedeCrear = ctx.staff.level === "OPERATOR" || ctx.staff.level === "OWNER";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Colegios</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Los establecimientos cargados en la plataforma. Un colegio pertenece a un sostenedor (la
          organización que contrata el módulo).
        </p>
      </div>

      {puedeCrear ? (
        <section className={cardClass + " p-5"}>
          <h2 className="font-semibold">Crear colegio</h2>
          <p className="mt-0.5 mb-4 text-sm text-muted-foreground">
            Queda creado con tu usuario como director para que puedas entrar a configurarlo.
            Después se le asigna el equipo del establecimiento.
          </p>
          <CreateSchoolForm organizations={orgs.map((o) => ({ id: o.id, name: o.name }))} />
        </section>
      ) : null}

      <section>
        <h2 className="mb-2 font-semibold">Establecimientos ({schools.length})</h2>
        {schools.length === 0 ? (
          <p className={cardClass + " px-4 py-6 text-sm text-muted-foreground"}>
            Todavía no hay colegios creados.
          </p>
        ) : (
          <ul className={cardClass + " divide-y divide-border"}>
            {schools.map((school) => (
              <li key={school.id} className="px-4 py-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-medium">{school.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {schoolLevelLabel(school.level)}
                    {school.commune ? ` · ${school.commune}` : ""}
                  </p>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {school.organization ? school.organization.name : "sin sostenedor"}
                  {school.rut ? ` · RUT ${school.rut}` : ""}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {school._count.students} alumnos · {school._count.courses} cursos ·{" "}
                  {school.memberships.length === 0
                    ? "sin equipo asignado"
                    : school.memberships
                        .map((m) => `${m.user.name} (${m.role})`)
                        .join(" · ")}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {puedeCrear ? (
        <section>
          <h2 className="mb-2 font-semibold">Módulo Colegios por cuenta</h2>
          <p className="mb-3 text-sm text-muted-foreground">
            Habilitar el módulo es lo que hace que la tarjeta de Colegios aparezca en el selector de
            la cuenta. Sin un colegio creado, la tarjeta igual no se muestra.
          </p>
          <ul className={cardClass + " divide-y divide-border px-4"}>
            {modulos.map(({ org, colegios }) => (
              <ModuleToggle
                key={org.id}
                organizationId={org.id}
                moduleCode="colegios"
                moduleName={org.name}
                enabled={colegios.enabled}
              />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
