import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getActiveMembership, requireUser } from "@/lib/auth";
import { enabledModules, MODULE_COOKIE } from "@/lib/modules";

export const metadata: Metadata = {
  title: "Tus módulos — Yellow ERP",
  description: "Elige el módulo en el que quieres trabajar.",
};

export default async function ModulosPage() {
  const user = await requireUser();
  const modules = await enabledModules(user.id);

  // Con un solo módulo no hay nada que elegir: directo (igual que el login).
  if (modules.length === 1) {
    redirect(modules[0].href);
  }

  // Los pendientes son de la empresa activa: el estado real de cada módulo.
  const active = await getActiveMembership();
  const cards = await Promise.all(
    modules.map(async (module) => ({
      module,
      pendings: active ? await module.pendings(active.company.id) : [],
    })),
  );

  // El último módulo usado queda marcado como sugerencia (cookie del login/switcher).
  const sugerido = (await cookies()).get(MODULE_COOKIE)?.value;

  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <span className="flex items-center gap-2 font-semibold tracking-tight">
            <span
              aria-hidden="true"
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-yellow-400 text-[13px] font-bold text-black"
            >
              Y
            </span>
            Yellow ERP
          </span>
          <p className="text-sm text-muted-foreground">{user.name}</p>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-14">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          ¿A dónde vamos?
        </h1>
        <p className="mt-2 text-base text-muted-foreground">
          Elige el módulo en el que quieres trabajar. Cada tarjeta muestra el estado
          real de esa área en {active?.company.name ?? "tu empresa"}.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {cards.map(({ module, pendings }) => (
            <Link
              key={module.code}
              href={module.href}
              className={
                "group block rounded-2xl border bg-surface p-6 transition-colors hover:border-foreground/30 " +
                (module.code === sugerido ? "border-foreground/40" : "border-border")
              }
            >
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-semibold text-foreground">{module.name}</h2>
                {module.code === sugerido ? (
                  <span className="rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-medium text-primary">
                    Último usado
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{module.description}</p>

              <dl className="mt-5 space-y-1.5">
                {pendings.map((p) => (
                  <div key={p.label} className="flex items-baseline justify-between gap-4">
                    <dt className="text-sm text-muted-foreground">{p.label}</dt>
                    <dd className="tabular text-sm font-medium text-foreground">{p.value}</dd>
                  </div>
                ))}
              </dl>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
