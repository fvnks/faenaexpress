import { CreateObraForm } from "@/app/admin/create-forms";
import { ModuleToggle } from "@/app/admin/module-toggle";
import { db } from "@/lib/db";
import { organizationModuleStates } from "@/lib/org-module-state";
import { requirePlatformStaff } from "@/lib/platform";
import { listOrganizations } from "@/lib/platform-queries";
import { obraRoleLabel, obraStatusLabel } from "@/lib/obra-permissions";
import { cardClass } from "@/lib/ui";

// Obras desde la consola: los proyectos reales y quién puede entrar.
// Igual que Colegios: Obras es un producto aparte, así que el operador necesita
// ver las obras cargadas, su equipo y habilitar el módulo por organización.
export default async function AdminObrasPage() {
  const ctx = await requirePlatformStaff("SUPPORT");

  const [obras, orgs] = await Promise.all([
    db.obra.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        organization: { select: { id: true, name: true } },
        memberships: {
          where: { active: true },
          include: { user: { select: { id: true, name: true, email: true } } },
        },
      },
    }),
    listOrganizations(),
  ]);

  const modulos = await Promise.all(
    orgs.map(async (org) => {
      const estados = await organizationModuleStates(org.id);
      const obrasModulo = estados.find((e) => e.module.code === "obras");
      return {
        org,
        enabled: obrasModulo?.enabled ?? true,
      };
    }),
  );

  const puedeCrear = ctx.staff.level === "OPERATOR" || ctx.staff.level === "OWNER";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Obras</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Los proyectos cargados en la plataforma. Una obra pertenece a la organización que contrata
          el módulo; el aislamiento es por obra, no por empresa.
        </p>
      </div>

      {puedeCrear ? (
        <section className={cardClass + " p-5"}>
          <h2 className="font-semibold">Crear obra</h2>
          <p className="mt-0.5 mb-4 text-sm text-muted-foreground">
            Queda creada con tu usuario como administrador para que puedas entrar a configurarla.
          </p>
          <CreateObraForm organizations={orgs.map((o) => ({ id: o.id, name: o.name }))} />
        </section>
      ) : null}

      <section>
        <h2 className="mb-2 font-semibold">Obras ({obras.length})</h2>
        {obras.length === 0 ? (
          <p className={cardClass + " px-4 py-6 text-sm text-muted-foreground"}>
            Todavía no hay obras creadas.
          </p>
        ) : (
          <ul className={cardClass + " divide-y divide-border"}>
            {obras.map((obra) => (
              <li key={obra.id} className="px-4 py-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-medium">
                    {obra.name}
                    {obra.code ? <span className="ml-2 font-mono text-xs text-subtle">{obra.code}</span> : null}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {obraStatusLabel(obra.status)}
                    {obra.comuna ? ` · ${obra.comuna}` : ""}
                  </p>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {obra.organization ? obra.organization.name : "sin organización"}
                  {obra.mandante ? ` · Mandante: ${obra.mandante}` : ""}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {obra.memberships.length === 0
                    ? "sin equipo asignado"
                    : obra.memberships
                        .map((m) => `${m.user.name} (${obraRoleLabel(m.role)})`)
                        .join(" · ")}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {puedeCrear ? (
        <section>
          <h2 className="mb-2 font-semibold">Módulo Obras por cuenta</h2>
          <p className="mb-3 text-sm text-muted-foreground">
            Habilitar el módulo es lo que hace que la tarjeta de Obras aparezca en el selector. Sin
            una obra creada, la tarjeta igual no se muestra.
          </p>
          <ul className={cardClass + " divide-y divide-border px-4"}>
            {modulos.map(({ org, enabled }) => (
              <ModuleToggle
                key={org.id}
                organizationId={org.id}
                moduleCode="obras"
                moduleName={org.name}
                enabled={enabled}
              />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
