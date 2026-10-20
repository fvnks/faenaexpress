import Link from "next/link";

import { deleteCompany, switchCompany, toggleCanSwitchCompanies } from "@/app/actions/companies";
import { listInvitations } from "@/app/actions/invitations";
import { InviteForm } from "@/app/facturas/configuracion/invite-form";
import { NewCompanyForm } from "@/app/facturas/configuracion/new-company-form";
import { OrgMemberRow } from "@/app/facturas/organizacion/org-member-row";
import { OrganizationNameForm } from "@/app/facturas/organizacion/organization-name-form";
import { getActiveMembership, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { roleLabel } from "@/lib/labels";
import type { Role } from "@/generated/prisma/client";
import { ensureOrgOwner, syncOrgName } from "@/lib/organizations";
import { cardClass, dangerButtonClass, secondaryButtonClass } from "@/lib/ui";

// Nivel 1 del panel de administración: la CUENTA (organización).
//
// Aquí vive la administración de la organización: sus empresas, sus miembros y sus
// invitaciones. No es la empresa activa (eso es /facturas/configuracion): esta
// pantalla no habla de IVA ni de credenciales de servicios.
export default async function OrganizationPage() {
  const user = await requireUser();
  const active = await getActiveMembership();
  const organization = user.orgMembership?.organization ?? null;

  if (!organization) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-bold tracking-tight">Organización</h1>
        <p className={cardClass + " px-4 py-6 text-sm text-muted-foreground"}>
          Tu cuenta no pertenece a una organización. Las empresas de una organización
          se administran juntas desde aquí; si esperabas ver tu empresa, revisa que tu
          usuario esté asociado a la organización correcta.
        </p>
      </div>
    );
  }

  // Repara el estado de arranque: si la organización no tiene un OWNER (las
  // invitaciones crearon a todos como MEMBER), se promueve al administrador más
  // antiguo. Es idempotente.
  await ensureOrgOwner(organization.id);

  // Con una sola empresa la cuenta se llama como la empresa (idempotente).
  await syncOrgName(organization.id);

  // El rol se relee de la base: `ensureOrgOwner` pudo acabar de promover a este
  // usuario, y la sesión cargada antes de la reparación todavía lo ve como ADMIN.
  const selfMember = await db.orgMember.findUnique({
    where: { userId_organizationId: { userId: user.id, organizationId: organization.id } },
    select: { orgRole: true, active: true },
  });

  const canManage = selfMember?.active === true && (selfMember.orgRole === "OWNER" || selfMember.orgRole === "ADMIN");
  const isOwner = selfMember?.active === true && selfMember.orgRole === "OWNER";

  if (!canManage) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-bold tracking-tight">Organización</h1>
        <p className={cardClass + " px-4 py-6 text-sm text-muted-foreground"}>
          Solo el dueño o un administrador de {organization.name} pueden ver y
          administrar las empresas y los usuarios de la cuenta.
        </p>
      </div>
    );
  }

  const [companies, orgMembers, invites, organizationRow] = await Promise.all([
    db.company.findMany({
      where: { organizationId: organization.id },
      orderBy: { createdAt: "asc" },
      include: { _count: { select: { memberships: true } } },
    }),
    db.orgMember.findMany({
      where: { organizationId: organization.id },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: [{ active: "desc" }, { orgRole: "asc" }, { createdAt: "asc" }],
    }),
    listInvitations(),
    db.organization.findUnique({
      where: { id: organization.id },
      select: { name: true },
    }),
  ]);

  // Nombre fresco: `syncOrgName` pudo acabar de ajustarlo.
  const orgName = organizationRow?.name ?? organization.name;

  // Historial de accesos del equipo de Yellow ERP a esta cuenta (solo el dueño).
  const accessLog = isOwner
    ? await db.platformAudit.findMany({
        where: { organizationId: organization.id, entityType: "Impersonation" },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { id: true, summary: true, createdAt: true },
      })
    : [];

  // Empresas de la organización: destino posible de una invitación.
  const orgCompanies = companies.map((company) => ({ id: company.id, name: company.name }));

  const ownerCount = orgMembers.filter((m) => m.orgRole === "OWNER" && m.active).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Organización</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {orgName} · Empresas de la cuenta, sus usuarios y las invitaciones
            pendientes. Los datos fiscales de cada empresa se editan al entrar a ella.
          </p>
        </div>
        {/* El nombre de la cuenta solo se edita cuando agrupa más de una empresa:
            con una sola, la cuenta se llama como la empresa. */}
        {companies.length > 1 ? (
          <OrganizationNameForm name={orgName} />
        ) : null}
      </div>

      <section className={cardClass + " p-5"}>
        <h2 className="font-semibold">Empresas de la organización</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Cada empresa tiene sus propios datos y su aislamiento. Entra a una para verla o
          configurarla.
        </p>

        <ul className="mt-4 divide-y divide-border">
          {companies.map((company) => {
            const isActive = company.id === active?.company.id;
            const membership = user.memberships.find((m) => m.companyId === company.id);
            const isCompanyAdmin = membership?.role === "ADMIN";
            return (
              <li key={company.id} className="py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 font-medium">
                      {company.name}
                      {isActive ? (
                        <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
                          Activa
                        </span>
                      ) : null}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {company.rut ? `${company.rut} · ` : ""}
                      {company._count.memberships}{" "}
                      {company._count.memberships === 1 ? "usuario" : "usuarios"} ·{" "}
                      {membership ? roleLabel(membership.role) : "Sin rol asignado"}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {isActive ? null : (
                      <form action={switchCompany}>
                        <input type="hidden" name="companyId" value={company.id} />
                        <button type="submit" className={secondaryButtonClass + " py-1.5 text-sm"}>
                          Entrar
                        </button>
                      </form>
                    )}
                    {membership?.role === "ADMIN" ? (
                      <Link
                        href="/facturas/configuracion"
                        className={secondaryButtonClass + " inline-flex py-1.5 text-sm"}
                      >
                        Configurar
                      </Link>
                    ) : null}
                  </div>
                </div>

                {isCompanyAdmin && !isActive ? (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-sm text-danger underline-offset-2 hover:underline">
                      Eliminar empresa
                    </summary>
                    <div className="mt-3 rounded-control border border-danger bg-danger-soft p-3">
                      <p className="text-sm text-danger">
                        Se borrarán todos los datos de «{company.name}»: compras, ventas,
                        gastos, catálogos, notificaciones y auditoría. Esta acción no se puede deshacer.
                      </p>
                      <p className="mt-2 text-sm font-medium text-danger-foreground">
                        Para confirmar, escribe el nombre exacto de la empresa:
                      </p>
                      <form action={deleteCompany} className="mt-2 flex flex-wrap items-center gap-2">
                        <input type="hidden" name="companyId" value={company.id} />
                        <input
                          type="text"
                          name="confirmName"
                          required
                          placeholder={company.name}
                          className="rounded-control border border-danger bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
                        />
                        <button type="submit" className={dangerButtonClass}>
                          Borrar definitivamente
                        </button>
                      </form>
                    </div>
                  </details>
                ) : null}
              </li>
            );
          })}
        </ul>

        <div className="mt-5 border-t border-border pt-5">
          <h3 className="text-sm font-semibold">Nueva empresa</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Queda dentro de {orgName} y tú serás su administrador. Sus datos
            están separados de las demás.
          </p>
          <div className="mt-3">
            <NewCompanyForm />
          </div>
        </div>
      </section>

      <section className={cardClass + " p-5"}>
        <h2 className="font-semibold">Miembros de la organización</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          El rol de organización es distinto del rol por empresa. El{" "}
          <strong className="font-medium text-foreground">dueño</strong> reparte los roles
          y otorga el permiso de revisar todas las empresas; quien no lo tenga solo ve las
          empresas donde tenga un rol asignado.
          {ownerCount === 1 ? (
            <>
              {" "}
              Debe quedar siempre un dueño activo.
            </>
          ) : null}
        </p>

        <ul className="mt-4 divide-y divide-border">
          {orgMembers.map((member) => (
            <OrgMemberRow
              key={member.id}
              canManage={isOwner}
              canToggleSwitch={isOwner}
              isSelf={member.userId === user.id}
              isLastOwner={member.orgRole === "OWNER" && ownerCount <= 1}
              member={{
                id: member.id,
                userId: member.userId,
                orgRole: member.orgRole,
                canSwitchCompanies: member.canSwitchCompanies,
                active: member.active,
                userName: member.user.name,
                userEmail: member.user.email,
              }}
              toggleSwitchAction={toggleCanSwitchCompanies}
            />
          ))}
        </ul>

        {!isOwner ? (
          <p className="mt-4 border-t border-border pt-4 text-sm text-muted-foreground">
            Solo el dueño de {orgName} puede cambiar roles u otorgar el permiso
            de revisar todas las empresas.
          </p>
        ) : null}
      </section>

      {/* Transparencia: el dueño de la cuenta ve quién entró a ella y cuándo.
          El soporte de Yellow ERP deja rastro, y ese rastro es del cliente. */}
      {isOwner ? (
        <section className={cardClass + " p-5"}>
          <h2 className="font-semibold">Accesos de Yellow ERP a esta cuenta</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Cada vez que el equipo de Yellow ERP entra a tu cuenta para prestarte soporte queda
            anotado aquí, con el motivo y el tiempo que duró.
          </p>
          {accessLog.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Nadie del equipo de Yellow ERP ha entrado a esta cuenta.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-border">
              {accessLog.map((entry) => (
                <li key={entry.id} className="py-2.5 text-sm">
                  <span className="text-muted-foreground">
                    {new Date(entry.createdAt).toLocaleString("es-CL")} ·{" "}
                  </span>
                  {entry.summary}
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {invites.length > 0 ? (
        <section className={cardClass + " p-5"}>
          <h2 className="font-semibold">Invitaciones pendientes</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Enlaces copiables que se envían a mano (WhatsApp, correo). Expiran en 72 horas
            y se usan una sola vez.
          </p>
          <ul className="mt-4 divide-y divide-border">
            {invites.map((invite) => (
              <li key={invite.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <div className="font-medium">{invite.email}</div>
                  <div className="text-xs text-muted-foreground">
                    {roleLabel(invite.role as Role)} · {invite.companyName ?? "Todas las empresas"} ·{" "}
                    {new Date(invite.expiresAt).toLocaleString("es-CL")}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className={cardClass + " p-5"}>
        <h2 className="font-semibold">Invitar a un usuario</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Genera un enlace copiable. El invitado abre el enlace, crea su cuenta (la
          contraseña es provisional y debe cambiarla al entrar) y queda miembro de la
          organización. Tú le mandas el enlace por donde quieras.
        </p>
        <div className="mt-4">
          <InviteForm companies={orgCompanies} canInviteAll={isOwner} />
        </div>
      </section>

      <p className="text-xs text-muted-foreground">
        Los datos fiscales de cada empresa (RUT, IVA, retenciones y credenciales de
        servicios) se editan dentro de la empresa:{" "}
        <Link href="/facturas/configuracion" className="font-medium text-primary underline underline-offset-2">
          Configuración de la empresa activa
        </Link>
        .
      </p>
    </div>
  );
}
