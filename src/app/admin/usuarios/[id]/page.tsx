import Link from "next/link";
import { notFound } from "next/navigation";

import { InviteExistingUserForm, ResetTwoFactorForm, ToggleUserActiveForm } from "@/app/admin/usuarios/user-forms";
import { SectionAccessForm } from "@/components/section-access-form";
import { setPlatformMemberSectionAccess } from "@/app/actions/platform";
import { orgRoleLabel, roleLabel } from "@/lib/labels";
import { formatDate } from "@/lib/money";
import { requirePlatformStaff } from "@/lib/platform";
import { listOrganizations, userDetail } from "@/lib/platform-queries";
import { cardClass } from "@/lib/ui";

// Ficha de un usuario: quién es, en qué cuentas está, con qué rol en cada
// empresa, y qué se puede hacer con él.
export default async function AdminUserDetailPage({ params }: PageProps<"/admin/usuarios/[id]">) {
  const ctx = await requirePlatformStaff("SUPPORT");
  const { id } = await params;

  const detail = await userDetail(id);
  if (!detail) notFound();
  const { user, audit } = detail;

  const orgs = await listOrganizations();
  const suyas = new Set(user.orgMembers.map((m) => m.organizationId));
  const otrasCuentas = orgs
    .filter((o) => !suyas.has(o.id))
    .map((o) => ({
      id: o.id,
      name: o.name,
      companies: o.companies.map((c) => ({ id: c.id, name: c.name })),
    }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/usuarios" className="text-sm text-muted-foreground hover:text-foreground">
          ← Usuarios
        </Link>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">
          {user.name}
          {!user.active ? (
            <span className="ml-2 text-base font-normal text-muted-foreground">(desactivado)</span>
          ) : null}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {user.email} · creada {formatDate(user.createdAt)}
          {user.mustChangePassword ? " · contraseña provisional sin cambiar" : ""}
        </p>
      </div>

      <section className={cardClass + " p-5"}>
        <h2 className="font-semibold">Cuentas</h2>
        {user.orgMembers.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            No pertenece a ninguna cuenta: es un usuario suelto.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {user.orgMembers.map((member) => (
              <li key={member.id} className="py-2.5">
                <p className="text-sm font-medium">
                  {member.organization.name}
                  {!member.active ? (
                    <span className="ml-2 text-xs text-muted-foreground">(inactivo)</span>
                  ) : null}
                </p>
                <p className="text-xs text-muted-foreground">
                  {orgRoleLabel(member.orgRole)}
                  {member.canSwitchCompanies ? " · revisa todas las empresas" : ""}
                </p>
              </li>
            ))}
          </ul>
        )}

        {user.memberships.length > 0 ? (
          <>
            <h3 className="mt-4 text-sm font-semibold">Empresas</h3>
            <ul className="mt-2 divide-y divide-border">
              {user.memberships.map((membership) => (
                <li key={membership.id} className="py-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm">{membership.company.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {roleLabel(membership.role)}
                      {!membership.active ? " · inactivo" : ""}
                    </span>
                  </div>
                  {ctx.staff.level !== "SUPPORT" ? (
                    <details className="mt-1">
                      <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                        Permisos por sección
                      </summary>
                      <SectionAccessForm
                        action={setPlatformMemberSectionAccess}
                        membershipId={membership.id}
                        role={membership.role}
                        sectionAccess={
                          (membership.sectionAccess as Record<string, string> | null) ?? null
                        }
                      />
                    </details>
                  ) : null}
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </section>

      <section className={cardClass + " p-5"}>
        <h2 className="font-semibold">Estado de la cuenta</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Desactivar cierra sus sesiones en todas las empresas y le impide entrar. No se borra: su
          historial y los documentos que creó se quedan.
        </p>
        <div className="mt-3">
          <ToggleUserActiveForm userId={user.id} userName={user.name} active={user.active} />
        </div>
      </section>

      <section className={cardClass + " p-5"}>
        <h2 className="font-semibold">Añadir a otra cuenta</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Genera un enlace de invitación. La persona lo abre y entra: nadie se auto-asigna un rol.
        </p>
        <div className="mt-4">
          <InviteExistingUserForm
            userId={user.id}
            userEmail={user.email}
            organizations={otrasCuentas}
          />
        </div>
      </section>

      {ctx.staff.level !== "SUPPORT" ? (
        <section className={cardClass + " p-5"}>
          <h2 className="font-semibold">Acceso al equipo de plataforma</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {user.platformStaff
              ? `Es parte del equipo con nivel ${user.platformStaff.level}${
                  user.platformStaff.active ? "" : " (suspendido)"
                }.`
              : "No es parte del equipo de plataforma."}
          </p>

          <h3 className="mt-4 text-sm font-semibold">Segundo factor</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {user.totpEnabled
              ? "Activo: pide un código además de la contraseña."
              : "No activo. Si es dueño de una organización o del equipo, tendría que activarlo."}
          </p>
          <div className="mt-2">
            <ResetTwoFactorForm
              userId={user.id}
              userName={user.name}
              enabled={user.totpEnabled}
            />
          </div>
        </section>
      ) : null}

      <section className={cardClass + " p-5"}>
        <h2 className="font-semibold">Historial de plataforma</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Acciones del equipo de Yellow ERP sobre esta persona.
        </p>
        {audit.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Sin acciones registradas.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {audit.map((entry) => (
              <li key={entry.id} className="py-2 text-sm">
                <span className="text-muted-foreground">
                  {new Date(entry.createdAt).toLocaleString("es-CL")} ·{" "}
                </span>
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
