import Link from "next/link";

import { formatDate } from "@/lib/money";
import { requirePlatformStaff } from "@/lib/platform";
import { platformIncidents } from "@/lib/platform-queries";
import { cardClass } from "@/lib/ui";

// Incidencias: señales objetivas del estado de las cuentas, para mirarlas sin
// entrar al chat. Todavía no hay tickets: esto es lo que rompe en silencio.
export default async function AdminIncidentsPage() {
  await requirePlatformStaff("SUPPORT");
  const incidents = await platformIncidents();

  const hasAny =
    incidents.orgsWithoutOwner.length > 0 ||
    incidents.companiesWithoutAdmin.length > 0 ||
    incidents.pendingPasswordChange > 0 ||
    incidents.failedBankSyncs.length > 0 ||
    incidents.suspendedStaff.length > 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Incidencias</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Estados que suelen quedarse sin avisar: cuentas sin dueño, empresas sin administrador,
          sincronizaciones bancarias fallidas.
        </p>
      </div>

      {!hasAny ? (
        <p className={cardClass + " px-4 py-6 text-sm text-muted-foreground"}>
          Nada pendiente. Las cuentas están en orden.
        </p>
      ) : null}

      {incidents.orgsWithoutOwner.length > 0 ? (
        <section className={cardClass + " p-5"}>
          <h2 className="font-semibold">Organizaciones sin dueño</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Nadie puede otorgar permisos ni crear empresas. Se repara al abrir Organización, o
            desde aquí cambiando el rol de un miembro.
          </p>
          <ul className="mt-3 divide-y divide-border">
            {incidents.orgsWithoutOwner.map((org) => (
              <li key={org.id} className="py-2 text-sm">
                <Link
                  href={`/admin/organizaciones/${org.id}`}
                  className="font-medium hover:text-primary hover:underline"
                >
                  {org.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {incidents.companiesWithoutAdmin.length > 0 ? (
        <section className={cardClass + " p-5"}>
          <h2 className="font-semibold">Empresas sin administrador activo</h2>
          <ul className="mt-3 divide-y divide-border">
            {incidents.companiesWithoutAdmin.map((company) => (
              <li key={company.id} className="py-2 text-sm">
                {company.organizationId ? (
                  <Link
                    href={`/admin/organizaciones/${company.organizationId}`}
                    className="font-medium hover:text-primary hover:underline"
                  >
                    {company.name}
                  </Link>
                ) : (
                  <span className="font-medium">{company.name}</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {incidents.failedBankSyncs.length > 0 ? (
        <section className={cardClass + " p-5"}>
          <h2 className="font-semibold">Sincronización bancaria con error</h2>
          <ul className="mt-3 divide-y divide-border">
            {incidents.failedBankSyncs.map((sync) => (
              <li key={sync.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                <span className="font-medium">{sync.company.name}</span>
                <span className="text-xs text-muted-foreground">
                  {formatDate(sync.startedAt)}
                  {sync.message ? ` · ${sync.message}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {incidents.pendingPasswordChange > 0 ? (
        <section className={cardClass + " px-5 py-4"}>
          <p className="text-sm">
            <span className="font-semibold tabular">{incidents.pendingPasswordChange}</span> usuario
            {incidents.pendingPasswordChange === 1 ? "" : "s"} con contraseña provisional sin cambiar.
          </p>
        </section>
      ) : null}

      {incidents.suspendedStaff.length > 0 ? (
        <section className={cardClass + " p-5"}>
          <h2 className="font-semibold">Personal de plataforma suspendido</h2>
          <ul className="mt-3 divide-y divide-border">
            {incidents.suspendedStaff.map((staff) => (
              <li key={staff.id} className="py-2 text-sm">
                {staff.user.name} <span className="text-muted-foreground">{staff.user.email}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
