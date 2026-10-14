import { deleteCompany, switchCompany, updateAlertSettings } from "@/app/actions/companies";
import { CompanyForm } from "@/app/dashboard/configuracion/company-form";
import { AddMemberForm, MemberRow, NewMemberForm } from "@/app/dashboard/configuracion/member-forms";
import { NewCompanyForm } from "@/app/dashboard/configuracion/new-company-form";
import { SiiCredentialsForm } from "@/app/dashboard/configuracion/sii-credentials-form";
import { getActiveMembership, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { roleLabel } from "@/lib/labels";
import { siiSecretKeyConfigured } from "@/lib/sii-credentials";
import { cardClass, dangerButtonClass, secondaryButtonClass } from "@/lib/ui";

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
          No perteneces a ninguna empresa todavía. Crea una para comenzar.
        </p>
      ) : canView ? (
        <>
          <section className={cardClass + " p-5"}>
            <h2 className="font-semibold">Datos de {active.company.name}</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              El IVA y los datos de la empresa se usan al registrar movimientos.
            </p>
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

      <section className={cardClass + " p-5"}>
        <h2 className="font-semibold">Mis empresas</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Cambia la empresa activa o crea una nueva.
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

        <div className="mt-5 border-t border-border pt-5">
          <h3 className="text-sm font-semibold">Nueva empresa</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Quedarás como administrador de la empresa nueva. Sus datos quedan separados de las demás.
          </p>
          <div className="mt-3">
            <NewCompanyForm />
          </div>
        </div>
      </section>
    </div>
  );
}
