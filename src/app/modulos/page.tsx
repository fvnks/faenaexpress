import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { logout } from "@/app/actions/auth";
import { CompanySwitcher } from "@/components/company-switcher";
import { ModuleSelector, type ModuleCard } from "@/components/modulos/module-selector";
import { PlatformMark } from "@/components/platform-mark";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";
import { getActiveMembership, isOrgManager, requireUser, visibleCompanies } from "@/lib/auth";
import { db } from "@/lib/db";
import { roleLabel } from "@/lib/labels";
import { enabledModules, MODULE_COOKIE } from "@/lib/modules";
import { isAnyStaff } from "@/lib/platform";
import { hashToken } from "@/lib/session";
import { hasTwoFactor, recomiendaTwoFactor } from "@/lib/two-factor";

export const metadata: Metadata = {
  title: "Tus módulos — Yellow ERP",
  description: "Elige el módulo en el que quieres trabajar.",
};

type HeaderData = {
  userName: string;
  userEmail: string;
  roleLabelValue: string;
  orgName: string | null;
  companies: Array<{ id: string; name: string }>;
  activeCompanyId: string | null;
  isOrgManagerValue: boolean;
  isPlatformStaffValue: boolean;
  mustChangePassword: boolean;
  twoFactorActive: boolean;
  twoFactorRecommended: boolean;
  otherSessions: number;
  lastModule: { name: string; href: string } | null;
};

/** Cabecera del selector: marca + switcher de empresa + tema + menú de cuenta. */
function SelectorHeader({ data }: { data: HeaderData }) {
  const showSwitcher = data.companies.length > 1;
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-6 py-4">
        <PlatformMark />
        <div className="flex items-center gap-2">
          {showSwitcher ? (
            <CompanySwitcher
              companies={data.companies}
              activeId={data.activeCompanyId}
              orgName={data.orgName}
              canManageOrganization={data.isOrgManagerValue}
            />
          ) : null}
          <ThemeToggle />
          <UserMenu
            variant="header"
            userName={data.userName}
            userEmail={data.userEmail}
            roleLabel={data.roleLabelValue}
            isPlatformStaff={data.isPlatformStaffValue}
            isOrgManager={data.isOrgManagerValue}
            mustChangePassword={data.mustChangePassword}
            twoFactorActive={data.twoFactorActive}
            twoFactorRecommended={data.twoFactorRecommended}
            otherSessions={data.otherSessions}
            lastModule={data.lastModule}
            logout={logout}
          />
        </div>
      </div>
    </header>
  );
}

export default async function ModulosPage() {
  const user = await requireUser();
  const modules = await enabledModules(user.id);
  const cookieStore = await cookies();
  const sugerido = cookieStore.get(MODULE_COOKIE)?.value;

  // Datos del header: se consultan una sola vez y se comparten con ambas ramas.
  const [active, companies, isStaff, twoFactor, dosFactorRecomendado, sessions] = await Promise.all([
    getActiveMembership(),
    visibleCompanies(user),
    isAnyStaff(),
    hasTwoFactor(user.id),
    recomiendaTwoFactor(user.id),
    db.session.findMany({ where: { userId: user.id }, select: { tokenHash: true } }),
  ]);
  const sessionToken = cookieStore.get("facturas_session")?.value;
  const currentHash = sessionToken ? hashToken(sessionToken) : null;
  const otherSessions = sessions.filter((s) => s.tokenHash !== currentHash).length;

  const sugeridoModule = modules.find((m) => m.code === sugerido) ?? null;
  const headerData: HeaderData = {
    userName: user.name,
    userEmail: user.email,
    roleLabelValue: active ? roleLabel(active.role) : "Sin empresa",
    orgName: user.orgMembership?.organization.name ?? null,
    companies: companies.map((c) => ({ id: c.id, name: c.name })),
    activeCompanyId: active?.company.id ?? null,
    isOrgManagerValue: isOrgManager(user),
    isPlatformStaffValue: isStaff,
    mustChangePassword: user.mustChangePassword,
    twoFactorActive: twoFactor,
    twoFactorRecommended: dosFactorRecomendado,
    otherSessions,
    lastModule: sugeridoModule ? { name: sugeridoModule.name, href: sugeridoModule.href } : null,
  };

  // Con un solo módulo no hay nada que elegir: directo (igual que el login).
  if (modules.length === 1) {
    redirect(modules[0].href);
  }

  // Sin módulos: decir qué hacer, no mostrar un selector vacío.
  if (modules.length === 0) {
    return (
      <div className="min-h-dvh bg-background">
        <SelectorHeader data={headerData} />
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
      suggested: module.code === sugerido,
    })),
  );
  if (!cards.some((card) => card.suggested) && cards.length > 0) cards[0].suggested = true;

  return (
    <div className="min-h-dvh bg-background">
      <SelectorHeader data={headerData} />
      <ModuleSelector cards={cards} />
    </div>
  );
}
