import { deleteCompany, switchCompany, toggleCanSwitchCompanies, updateAlertSettings } from "@/app/actions/companies";
import { listInvitations } from "@/app/actions/invitations";
import { CompanyForm } from "@/app/dashboard/configuracion/company-form";
import { AddMemberForm, MemberRow, NewMemberForm } from "@/app/dashboard/configuracion/member-forms";
import { InviteForm } from "@/app/dashboard/configuracion/invite-form";
import { NewCompanyForm } from "@/app/dashboard/configuracion/new-company-form";
import { SiiCredentialsForm } from "@/app/dashboard/configuracion/sii-credentials-form";
import { DefontanaCredentialsForm } from "@/app/dashboard/configuracion/defontana-credentials-form";
import { getActiveMembership, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { roleLabel } from "@/lib/labels";
import type { Role } from "@/generated/prisma/client";
import { siiSecretKeyConfigured } from "@/lib/sii-credentials";
import { cardClass, dangerButtonClass, primaryButtonClass, secondaryButtonClass } from "@/lib/ui";

export default async function ConfigurationPage() {
  const user = await requireUser();
  const active = await getActiveMembership();
  const role = active?.role ?? null;
  const admin = role === "ADMIN";
  // Contabilidad ve los datos de la empresa y sus usuarios, pero no los administra.
  const canView = role === "ADMIN" || role === "ACCOUNTANT";
  // Empresas donde el usuario actual es administrador: alcance del selector
  // "Empresas visibles" al crear o agregar usuarios.
  const adminCompanies = user.memberships
    .filter((membership) => membership.role === "ADMIN")
    .map((membership) => ({ id: membership.company.id, name: membership.company.name }));

  const members =
    active && canView
      ? await db.membership.findMany({
          where: { companyId: active.company.id },
          include: { user: { select: { id: true, name: true, email: true } } },
          orderBy: [{ role: "asc" }, { createdAt: "asc" }],
        })
      : [];

  // Miembros de la organización (permiso multiempresa). Solo se muestra cuando la
  // empresa pertenece a una organización y el usuario actual es ADMIN de la empresa
  // activa.
  const orgMembers =
    admin && active?.company.organizationId
      ? await db.orgMember.findMany({
          where: { organizationId: active.company.organizationId },
          include: { user: { select: { id: true, name: true, email: true } } },
          orderBy: [{ canSwitchCompanies: "desc" }, { createdAt: "asc" }],
        })
      : [];

  // Invitaciones pendientes de la organización (solo ADMIN con permiso multiempresa).
  const invites = await listInvitations();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configuración</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Empresas, datos fiscales y usuarios con su rol en cada empresa.
        </p>
      </div>

      {!active ? (
        <p className={cardClass + " px-4 py-6 text-sm text-muted-foreground"}>
          No perteneces a ninguna empresa todavía. Pídele a un administrador que te agregue a la
          suya: las empresas solo las crea quien ya administra una.
        </p>
      ) : canView ? (
        <>
          <section className={cardClass + " p-5"}>
            <h2 className="font-semibold">Datos de {active.company.name}</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              El IVA y los datos de la empresa se usan al registrar movimientos.
            </p>
            {admin ? (
              <div className="mt-3">
                <a
                  href="/dashboard/configuracion/export"
                  className={secondaryButtonClass + " inline-flex py-1.5 text-sm"}
                >
                  Exportar mis datos (ZIP con CSV)
                </a>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Un archivo con todas las tablas de esta empresa: compras, ventas, gastos,
                  terceros, inventario, banco y auditoría. Para respaldo o portabilidad.
                </p>
              </div>
            ) : null}
            <div className="mt-4">
              <CompanyForm
                readOnly={!admin}
                defaults={{
                  name: active.company.name,
                  rut: active.company.rut ?? "",
                  email: active.company.email ?? "",
                  phone: active.company.phone ?? "",
                  address: active.company.address ?? "",
                  city: active.company.city ?? "",
                  ivaRate: active.company.ivaRate,
                  retentionRate: active.company.retentionRate,
                  afpRate: active.company.afpRate,
                  healthRate: active.company.healthRate,
                  unemploymentRate: active.company.unemploymentRate,
                  anualBonusRate: active.company.anualBonusRate,
                }}
              />
            </div>
          </section>

          {admin ? (
            <section className={cardClass + " p-5"}>
              <h2 className="font-semibold">Credenciales del SII</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Guarda el RUT y la Clave Tributaria de esta empresa para iniciar sesión en el SII
                con un clic desde Importar, sin volver a tipearlos cuando la sesión se cierra.
              </p>
              <SiiCredentialsForm
                defaultRut={active.company.rut ?? ""}
                storedRut={active.company.siiRut}
                hasCredentials={Boolean(active.company.siiRut && active.company.siiClaveEnc)}
                keyConfigured={siiSecretKeyConfigured()}
              />
            </section>
          ) : null}

          {admin ? (
            <section className={cardClass + " p-5"}>
              <h2 className="font-semibold">Credenciales de Defontana</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                El correo y la clave de la cuenta del ERP Defontana que tiene acceso a esta empresa.
                Permiten pedirle el XML de una factura de compra a pedido (sin importar todo el
                período).
              </p>
              <DefontanaCredentialsForm
                defaultEmail={active.company.email ?? ""}
                storedEmail={active.company.defontanaEmail}
                hasCredentials={Boolean(
                  active.company.defontanaEmail && active.company.defontanaClaveEnc,
                )}
                keyConfigured={siiSecretKeyConfigured()}
              />
            </section>
          ) : null}

          {admin ? (
            <section className={cardClass + " p-5"}>
              <h2 className="font-semibold">Alertas automáticas</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Umbrales para disparar notificaciones. Deja vacío para desactivar.
              </p>
              <form action={updateAlertSettings} className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs text-muted-foreground">Días para aviso de vencimiento</span>
                  <input
                    name="alertDueSoonDays"
                    type="number"
                    min={1}
                    defaultValue={active.company.alertDueSoonDays}
                    className="rounded-control border border-border bg-background px-3 py-2 text-sm text-foreground"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs text-muted-foreground">Límite &quot;por cobrar&quot; (null = desactivado)</span>
                  <input
                    name="alertPorCobrarLimit"
                    type="number"
                    min={0}
                    defaultValue={active.company.alertPorCobrarLimit ?? ""}
                    className="rounded-control border border-border bg-background px-3 py-2 text-sm text-foreground"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs text-muted-foreground">Límite &quot;por pagar&quot;</span>
                  <input
                    name="alertPorPagarLimit"
                    type="number"
                    min={0}
                    defaultValue={active.company.alertPorPagarLimit ?? ""}
                    className="rounded-control border border-border bg-background px-3 py-2 text-sm text-foreground"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs text-muted-foreground">Límite reembolsos pendientes</span>
                  <input
                    name="alertReembolsosLimit"
                    type="number"
                    min={0}
                    defaultValue={active.company.alertReembolsosLimit ?? ""}
                    className="rounded-control border border-border bg-background px-3 py-2 text-sm text-foreground"
                  />
                </label>
                <button type="submit" className={secondaryButtonClass + " py-1.5 text-sm sm:col-span-2"}>
                  Guardar umbrales
                </button>
              </form>
            </section>
          ) : null}

          <section className={cardClass + " p-5"}>
            <h2 className="font-semibold">Usuarios de {active.company.name}</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Cada usuario tiene un rol dentro de esta empresa.
            </p>

            <ul className="mt-4 divide-y divide-border">
              {members.map((membership) => (
                <MemberRow
                  key={membership.id}
                  canManage={admin}
                  isSelf={membership.userId === user.id}
                  membership={{
                    id: membership.id,
                    role: membership.role,
                    inventoryAccess: membership.inventoryAccess ?? "NONE",
                    userId: membership.userId,
                    userName: membership.user.name,
                    userEmail: membership.user.email,
                  }}
                />
              ))}
            </ul>

            {admin ? (
              <div className="mt-5 grid gap-4 border-t border-border pt-5 sm:grid-cols-2">
                <div>
                  <h3 className="text-sm font-semibold">Agregar usuario existente</h3>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    Le da acceso a esta empresa a un usuario que ya está en el sistema.
                  </p>
                  <div className="mt-3">
                    <AddMemberForm companies={adminCompanies} />
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold">Usuario nuevo</h3>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    Crea la cuenta y la asocia a esta empresa.
                  </p>
                  <div className="mt-3">
                    <NewMemberForm companies={adminCompanies} />
                  </div>
                </div>
              </div>
            ) : (
              <p className="mt-5 border-t border-border pt-5 text-sm text-muted-foreground">
                Solo un administrador puede agregar usuarios o cambiar sus roles.
              </p>
            )}
          </section>
        </>
      ) : (
        <p className={cardClass + " px-4 py-6 text-sm text-muted-foreground"}>
          Tu rol en {active.company.name} es {roleLabel(active.role)}. Solo un administrador o
          contabilidad puede ver los datos de la empresa y sus usuarios.
        </p>
      )}

      {invites.length > 0 ? (
        <section className={cardClass + " p-5"}>
          <h2 className="font-semibold">Invitaciones</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Enlaces copiables que se envían manualmente (WhatsApp, correo personal…).
            Expiran en 72 horas y se pueden usar una sola vez.
          </p>
          <ul className="mt-4 divide-y divide-border">
            {invites.map((invite) => (
              <li key={invite.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <div className="font-medium">{invite.email}</div>
                  <div className="text-xs text-muted-foreground">
                    {roleLabel(invite.role as Role)} · {invite.companyName ?? "Todas las empresas"} ·
                    {" " + new Date(invite.expiresAt).toLocaleString("es-CL")}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {admin && user.orgMembership?.canSwitchCompanies ? (
        <section className={cardClass + " p-5"}>
          <h2 className="font-semibold">Invitar a un usuario</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Genera un enlace copiable. El invitado abre el enlace, crea su cuenta (la
            contraseña es provisional y debe cambiarla al entrar) y queda miembro de la
            organización. Tú le mandas el enlace por donde quieras.
          </p>
          <div className="mt-4">
            <InviteForm companies={adminCompanies} />
          </div>
        </section>
      ) : null}

      {orgMembers.length > 0 ? (
        <section className={cardClass + " p-5"}>
          <h2 className="font-semibold">Organización</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {user.orgMembership?.organization.name ?? "Organización"} · Los miembros pueden revisar
            varias empresas dentro de esta organización si se les habilita el permiso.
          </p>
          <ul className="mt-4 divide-y divide-border">
            {orgMembers.map((orgMember) => {
              return (
                <li key={orgMember.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <div className="font-medium">{orgMember.user.name}</div>
                    <div className="text-xs text-muted-foreground">{orgMember.user.email}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">
                      {orgMember.canSwitchCompanies ? "Puede revisar empresas" : "Solo esta empresa"}
                    </span>
                    <form action={toggleCanSwitchCompanies}>
                      <input type="hidden" name="userId" value={orgMember.userId} />
                      <button
                        type="submit"
                        className={
                          orgMember.canSwitchCompanies
                            ? secondaryButtonClass + " py-1.5 text-sm"
                            : primaryButtonClass + " py-1.5 text-sm"
                        }
                      >
                        {orgMember.canSwitchCompanies ? "Quitar permiso" : "Dar permiso"}
                      </button>
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">
            El permiso es de la organización: habilitarlo permite ver todas las empresas del grupo,
            no solo las memberships activas.
          </p>
        </section>
      ) : null}

      <section className={cardClass + " p-5"}>
        <h2 className="font-semibold">Mis empresas</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {admin ? "Cambia la empresa activa o crea una nueva." : "Cambia la empresa activa."}
        </p>

        <ul className="mt-4 divide-y divide-border">
          {user.memberships.map((membership) => {
            const isActive = membership.companyId === active?.company.id;
            const isAdmin = membership.role === "ADMIN";

            return (
              <li key={membership.id} className="py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 font-medium">
                      {membership.company.name}
                      {isActive ? (
                        <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
                          Activa
                        </span>
                      ) : null}
                    </div>
                    <div className="text-xs text-muted-foreground">{roleLabel(membership.role)}</div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {isActive ? null : (
                      <form action={switchCompany}>
                        <input type="hidden" name="companyId" value={membership.companyId} />
                        <button type="submit" className={secondaryButtonClass + " py-1.5 text-sm"}>
                          Entrar
                        </button>
                      </form>
                    )}
                    {isActive ? null : (
                      <form action={switchCompany}>
                        <input type="hidden" name="companyId" value={membership.companyId} />
                        <input type="hidden" name="redirectTo" value="configuracion" />
                        <button type="submit" className={secondaryButtonClass + " py-1.5 text-sm"}>
                          Editar
                        </button>
                      </form>
                    )}
                  </div>
                </div>

                {isAdmin && !isActive ? (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-sm text-danger underline-offset-2 hover:underline">
                      Eliminar empresa
                    </summary>
                    <div className="mt-3 rounded-control border border-danger bg-danger-soft p-3">
                      <p className="text-sm text-danger">
                        Se borrarán todos los datos de «{membership.company.name}»: compras, ventas,
                        gastos, catálogos, notificaciones y auditoría. Esta acción no se puede deshacer.
                      </p>
                      <p className="mt-2 text-sm font-medium text-danger-foreground">
                        Para confirmar, escribe el nombre exacto de la empresa:
                      </p>
                      <form action={deleteCompany} className="mt-2 flex flex-wrap items-center gap-2">
                        <input type="hidden" name="companyId" value={membership.companyId} />
                        <input
                          type="text"
                          name="confirmName"
                          required
                          placeholder={membership.company.name}
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

        {admin ? (
          <div className="mt-5 border-t border-border pt-5">
            <h3 className="text-sm font-semibold">Nueva empresa</h3>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Quedarás como administrador de la empresa nueva. Sus datos quedan separados de las
              demás.
            </p>
            <div className="mt-3">
              <NewCompanyForm />
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
