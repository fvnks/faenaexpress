import Link from "next/link";

import { updateAlertSettings } from "@/app/actions/companies";
import { CompanyForm } from "@/app/facturas/configuracion/company-form";
import { AddMemberForm, MemberRow, NewMemberForm } from "@/app/facturas/configuracion/member-forms";
import { DefontanaCredentialsForm } from "@/app/facturas/configuracion/defontana-credentials-form";
import { SiiCredentialsForm } from "@/app/facturas/configuracion/sii-credentials-form";
import { getActiveMembership, isOrgManager, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { roleLabel } from "@/lib/labels";
import { siiSecretKeyConfigured } from "@/lib/sii-credentials";
import { cardClass, secondaryButtonClass } from "@/lib/ui";

// Configuración de la EMPRESA ACTIVA: datos fiscales, credenciales de servicios,
// alertas y usuarios de esta empresa. La cuenta (organización: empresas del grupo,
// miembros e invitaciones) vive en /facturas/organizacion.
export default async function ConfigurationPage() {
  const user = await requireUser();
  const active = await getActiveMembership();
  const role = active?.role ?? null;
  const admin = role === "ADMIN";
  // Contabilidad ve los datos de la empresa y sus usuarios, pero no los administra.
  const canView = role === "ADMIN" || role === "ACCOUNTANT";
  // La cuenta solo se puede administrar desde la organización.
  const canManageOrganization = isOrgManager(user);

  const members =
    active && canView
      ? await db.membership.findMany({
          where: { companyId: active.company.id },
          include: { user: { select: { id: true, name: true, email: true } } },
          orderBy: [{ active: "desc" }, { role: "asc" }, { createdAt: "asc" }],
        })
      : [];

  const activeAdmins = members.filter((m) => m.role === "ADMIN" && m.active).length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configuración</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {active
            ? `Datos fiscales, credenciales y usuarios de ${active.company.name}.`
            : "Empresas, datos fiscales y usuarios con su rol en cada empresa."}
        </p>
      </div>

      {canManageOrganization ? (
        <section className={cardClass + " flex flex-wrap items-center justify-between gap-3 p-5"}>
          <div>
            <h2 className="font-semibold">Organización</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Las empresas de la cuenta, sus miembros y las invitaciones se administran
              desde la organización, no dentro de una empresa.
            </p>
          </div>
          <Link href="/facturas/organizacion" className={secondaryButtonClass + " inline-flex"}>
            Ir a Organización
          </Link>
        </section>
      ) : null}

      {!active ? (
        <p className={cardClass + " px-4 py-6 text-sm text-muted-foreground"}>
          No perteneces a ninguna empresa todavía. Pídele a un administrador de tu
          organización que te agregue: las empresas las crea el dueño o un administrador
          de la cuenta.
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
                  href="/facturas/configuracion/export"
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
              Cada usuario tiene un rol dentro de esta empresa. Para dar acceso a otra
              empresa, cámbiate a ella y agrégalo de nuevo: los accesos son por empresa.
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
                    active: membership.active,
                    isLastAdmin: activeAdmins <= 1 && membership.role === "ADMIN",
                  }}
                />
              ))}
            </ul>

            {admin ? (
              <div className="mt-5 grid gap-4 border-t border-border pt-5 sm:grid-cols-2">
                <div>
                  <h3 className="text-sm font-semibold">Agregar usuario existente</h3>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    Le da acceso solo a esta empresa a un usuario que ya está en el sistema.
                  </p>
                  <div className="mt-3">
                    <AddMemberForm />
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold">Usuario nuevo</h3>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    Crea la cuenta y la asocia a esta empresa.
                  </p>
                  <div className="mt-3">
                    <NewMemberForm />
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
    </div>
  );
}
