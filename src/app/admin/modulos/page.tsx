import Link from "next/link";

import { ModuleToggle } from "@/app/admin/module-toggle";
import { requirePlatformStaff } from "@/lib/platform";
import { organizationModuleStates } from "@/lib/org-module-state";
import { ALL_ORG_MODULES } from "@/lib/org-modules";
import { listOrganizations } from "@/lib/platform-queries";
import { cardClass } from "@/lib/ui";

// Catálogo de módulos y quién tiene cada uno. Es la vista de "manejar todos los
// módulos": de un vistazo se ve qué organización tiene qué, y se cambia desde
// aquí mismo.
export default async function AdminModulesPage() {
  await requirePlatformStaff("SUPPORT");

  const orgs = await listOrganizations();
  const estados = await Promise.all(
    orgs.map((org) => organizationModuleStates(org.id)),
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Módulos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Las partes del producto que se pueden vender por separado. Cada cuenta los tiene
          activados o no; el núcleo siempre está.
        </p>
      </div>

      <section className={cardClass + " p-5"}>
        <h2 className="font-semibold">Catálogo</h2>
        <ul className="mt-3 divide-y divide-border">
          {ALL_ORG_MODULES.map((module) => (
            <li key={module.code} className="py-2.5">
              <p className="text-sm font-medium">{module.name}</p>
              <p className="text-xs text-muted-foreground">{module.description}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Código: <code>{module.code}</code>
                {module.core ? " · núcleo (no se puede deshabilitar)" : ""}
              </p>
            </li>
          ))}
        </ul>
      </section>

      {orgs.length === 0 ? (
        <p className={cardClass + " px-4 py-6 text-sm text-muted-foreground"}>
          Todavía no hay organizaciones.
        </p>
      ) : (
        orgs.map((org, i) => {
          const state = estados[i];
          const estadosDeEsta = state.filter((s) => !s.module.core);
          return (
            <section key={org.id} className={cardClass + " p-5"}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-semibold">
                  <Link
                    href={`/admin/organizaciones/${org.id}`}
                    className="hover:text-primary hover:underline"
                  >
                    {org.name}
                  </Link>
                </h2>
                <p className="text-xs text-muted-foreground">
                  {org._count.companies} empresa{org._count.companies === 1 ? "" : "s"} ·{" "}
                  {estadosDeEsta.filter((s) => s.enabled).length} de {estadosDeEsta.length} módulos
                  contratables
                </p>
              </div>
              <ul className="mt-2 divide-y divide-border">
                {state.map((s) => (
                  <ModuleToggle
                    key={s.module.code}
                    organizationId={org.id}
                    moduleCode={s.module.code}
                    moduleName={s.module.name}
                    enabled={s.enabled}
                    core={s.module.core}
                  />
                ))}
              </ul>
            </section>
          );
        })
      )}
    </div>
  );
}
