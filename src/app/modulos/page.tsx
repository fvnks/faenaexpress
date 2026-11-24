import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ModuleSelector, type ModuleCard } from "@/components/modulos/module-selector";
import { PlatformMark } from "@/components/platform-mark";
import { ThemeToggle } from "@/components/theme-toggle";
import { requireUser } from "@/lib/auth";
import { enabledModules, MODULE_COOKIE } from "@/lib/modules";

export const metadata: Metadata = {
  title: "Tus módulos — Yellow ERP",
  description: "Elige el módulo en el que quieres trabajar.",
};

/** Cabecera compartida de las variantes del selector. */
function SelectorHeader({ userName }: { userName: string }) {
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
        <PlatformMark />
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <span className="hidden text-sm text-muted-foreground sm:inline">{userName}</span>
        </div>
      </div>
    </header>
  );
}

export default async function ModulosPage() {
  const user = await requireUser();
  const modules = await enabledModules(user.id);

  // Con un solo módulo no hay nada que elegir: directo (igual que el login).
  if (modules.length === 1) {
    redirect(modules[0].href);
  }

  // Sin módulos: decir qué hacer, no mostrar un selector vacío.
  if (modules.length === 0) {
    return (
      <div className="min-h-dvh bg-background">
        <SelectorHeader userName={user.name} />
        <main className="mx-auto max-w-5xl px-6 py-14">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Todavía no tienes acceso
          </h1>
          <p className="mt-2 max-w-xl text-base text-muted-foreground">
            Tu usuario no está en ninguna empresa ni en ningún colegio todavía. Pídele a quien
            administra tu cuenta que te invite, y en cuanto lo haga te va a aparecer acá.
          </p>
        </main>
      </div>
    );
  }

  // Los pendientes son reales, en el ámbito de cada módulo.
  const cards: ModuleCard[] = await Promise.all(
    modules.map(async (module) => ({
      code: module.code,
      name: module.name,
      description: module.description,
      href: module.href,
      pendings: await module.pendings(user.id),
      suggested: false,
    })),
  );

  // El último módulo usado queda marcado como sugerencia (cookie del login/switcher).
  const sugerido = (await cookies()).get(MODULE_COOKIE)?.value;
  for (const card of cards) card.suggested = card.code === sugerido;
  if (!cards.some((card) => card.suggested) && cards.length > 0) cards[0].suggested = true;

  return (
    <div className="min-h-dvh bg-background">
      <SelectorHeader userName={user.name} />
      <ModuleSelector cards={cards} />
    </div>
  );
}
