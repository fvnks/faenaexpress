import Link from "next/link";
import { notFound } from "next/navigation";

import { InviteFromAdminForm } from "@/app/admin/admin-forms";
import { ImpersonateForm } from "@/app/admin/impersonate-form";
import { InviteLinkPanel } from "@/app/admin/invite-link-panel";
import { ModuleToggle } from "@/app/admin/module-toggle";
import { NewCompanyForOrganizationForm } from "@/app/admin/new-company-for-org-form";
import { PlanForOrganizationForm } from "@/app/admin/plan-for-organization";
import { RecomputeUsageForm } from "@/app/admin/recompute-usage-form";
import { orgRoleLabel, roleLabel, subscriptionStatusLabel } from "@/lib/labels";
import { formatDate } from "@/lib/money";
import { organizationModuleStates } from "@/lib/org-module-state";
import { listPlans, subscriptionFor, usageFor } from "@/lib/plans";
import { requirePlatformStaff } from "@/lib/platform";
import { listPlatformAudit } from "@/lib/platform-audit";
import { getPendingInvite } from "@/lib/platform-invite";
import { impersonationCandidates, organizationDetail } from "@/lib/platform-queries";
import { cardClass } from "@/lib/ui";

// Ficha de una organización para el operador: sus empresas, sus miembros y el
// historial de lo que el equipo de plataforma hizo sobre esta cuenta.
export default async function AdminOrganizationDetailPage({
  params,
}: PageProps<"/admin/organizaciones/[id]">) {
  const ctx = await requirePlatformStaff("SUPPORT");
  const { id } = await params;

  const detail = await organizationDetail(id);
  if (!detail) notFound();
  const { organization, memberships } = detail;

  const audit = await listPlatformAudit({ organizationId: id, limit: 30 });
  // Enlace de la última invitación generada, si sigue vigente.
  const pendingInvite = await getPendingInvite();
  const showInvite = pendingInvite?.organizationId === id ? pendingInvite : null;
  // Entrar a la cuenta es de OPERATOR: SUPPORT solo lee.
  const candidates =
    ctx.staff.level === "SUPPORT" ? [] : await impersonationCandidates(id);
  const moduleStates = await organizationModuleStates(id);
  const [subscription, usage, plans] = await Promise.all([
    subscriptionFor(id),
    usageFor(id),
    listPlans(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/admin/organizaciones"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Organizaciones
        </Link>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">{organization.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {organization.companies.length} empresa
          {organization.companies.length === 1 ? "" : "s"} · {organization.members.length} miembro
          {organization.members.length === 1 ? "" : "s"} · creada {formatDate(organization.createdAt)}
        </p>
      </div>

      <section className={cardClass + " p-5"}>
        <h2 className="font-semibold">Empresas</h2>
        {organization.companies.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Esta cuenta todavía no tiene empresas. Sin al menos una, la persona que invites entra y
            no tiene dónde trabajar.
          </p>
        ) : null}

        {ctx.staff.level === "SUPPORT" ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Tu nivel (soporte) solo permite leer. Crear una empresa es de operador.
          </p>
        ) : (
          <div className="mt-4">
            <NewCompanyForOrganizationForm organizationId={organization.id} />
          </div>
        )}

        {organization.companies.length > 0 ? (
          <ul className="mt-4 divide-y divide-border">
            {organization.companies.map((company) => (
              <li key={company.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <div>
                  <p className="text-sm font-medium">{company.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {company.rut ?? "sin RUT"} · {company._count.memberships} usuario
                    {company._count.memberships === 1 ? "" : "s"}
                  </p>
                </div>
                <p className="tabular text-xs text-muted-foreground">
                  {company._count.sales} ventas · {company._count.purchases} compras
                </p>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className={cardClass + " p-5"}>
        <h2 className="font-semibold">Miembros de la organización</h2>
        {organization.members.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Sin miembros todavía.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {organization.members.map((member) => {
              const userCompanies = memberships
                .filter((m) => m.userId === member.userId)
                .map((m) => `${m.company.name} (${roleLabel(m.role)})`);
              return (
                <li key={member.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                  <div>
                    <p className="text-sm font-medium">
                      {member.user.name}
                      {!member.active ? (
                        <span className="ml-2 text-xs text-muted-foreground">(inactivo)</span>
                      ) : null}
                    </p>
                    <p className="text-xs text-muted-foreground">{member.user.email}</p>
                    {userCompanies.length > 0 ? (
                      <p className="text-xs text-muted-foreground">{userCompanies.join(" · ")}</p>
                    ) : null}
                  </div>
                  <p className="text-xs">
                    {orgRoleLabel(member.orgRole)}
                    {member.canSwitchCompanies ? " · revisa todas las empresas" : ""}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className={cardClass + " p-5"}>
        <h2 className="font-semibold">Invitar a esta cuenta</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Genera un enlace para el contacto. Sirve para el alta asistida: se lo mandas y la
          persona crea su acceso.
        </p>
        {showInvite ? (
          <InviteLinkPanel url={showInvite.url} email={showInvite.email} />
        ) : null}
        <div className="mt-4">
          <InviteFromAdminForm
            organizationId={organization.id}
            companies={organization.companies.map((c) => ({ id: c.id, name: c.name }))}
          />
        </div>
      </section>

      <section className={cardClass + " p-5"}>
        <h2 className="font-semibold">Plan y uso</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          El plan que tiene contratado esta cuenta y cuánto lleva usado este mes.
        </p>

        <div className="mt-3 grid gap-3 sm:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">Plan</p>
            <p className="text-sm font-medium">
              {subscription ? subscription.plan.name : "Sin plan"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Estado</p>
            <p className="text-sm font-medium">
              {subscription ? subscriptionStatusLabel(subscription.status) : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Documentos del mes</p>
            <p className="tabular text-sm font-medium">
              {usage?.documentsCreated ?? 0}
              {subscription?.plan.maxDocsPerMonth
                ? ` de ${subscription.plan.maxDocsPerMonth}`
                : ""}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Usuarios</p>
            <p className="tabular text-sm font-medium">
              {usage?.activeUsers ?? 0}
              {subscription?.plan.maxUsers ? ` de ${subscription.plan.maxUsers}` : ""}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          {ctx.staff.level === "SUPPORT" ? (
            <p className="text-sm text-muted-foreground">
              Tu nivel (soporte) solo permite leer. Cambiar el plan es de operador.
            </p>
          ) : (
            <>
              <PlanForOrganizationForm
                organizationId={organization.id}
                plans={plans.map((p) => ({ id: p.id, name: p.name, priceCLP: p.priceCLP }))}
                currentPlanId={subscription?.planId ?? null}
                currentStatus={subscription?.status ?? null}
              />
              <RecomputeUsageForm organizationId={organization.id} />
            </>
          )}
        </div>
      </section>

      <section className={cardClass + " p-5"}>
        <h2 className="font-semibold">Módulos de la cuenta</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Las partes del producto que esta cuenta tiene contratadas. El núcleo siempre está
          incluido.
        </p>
        <ul className="mt-3 divide-y divide-border">
          {moduleStates.map((s) => (
            <ModuleToggle
              key={s.module.code}
              organizationId={organization.id}
              moduleCode={s.module.code}
              moduleName={s.module.name}
              enabled={s.enabled}
              core={s.module.core}
            />
          ))}
        </ul>
      </section>

      <section className={cardClass + " p-5"}>
        <h2 className="font-semibold">Entrar a la cuenta</h2>        <p className="mt-0.5 text-sm text-muted-foreground">
          Abre la sesión de soporte dentro de la cuenta del cliente, para reproducir un problema o
          hacer un ajuste puntual con sus datos.
        </p>
        <div className="mt-4">
          {ctx.staff.level === "SUPPORT" ? (
            <p className="text-sm text-muted-foreground">
              Tu nivel (soporte) solo permite leer. Entrar a la cuenta del cliente es de operador.
            </p>
          ) : (
            <ImpersonateForm
              organizationId={organization.id}
              candidates={candidates.map((c) => ({
                id: c.user.id,
                name: c.user.name,
                email: c.user.email,
                orgRole: orgRoleLabel(c.orgRole),
              }))}
            />
          )}
        </div>
      </section>

      <section className={cardClass + " p-5"}>
        <h2 className="font-semibold">Historial de plataforma</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Lo que el equipo de Yellow ERP ha hecho sobre esta cuenta.
        </p>
        {audit.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Sin acciones registradas.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {audit.map((entry) => (
              <li key={entry.id} className="text-sm">
                <span className="text-muted-foreground">{formatDate(entry.createdAt)} · </span>
                {entry.summary}
                <span className="text-muted-foreground"> — {entry.staffUserName}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
