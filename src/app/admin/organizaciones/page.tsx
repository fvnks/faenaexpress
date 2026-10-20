import Link from "next/link";

import { CreateOrganizationForm } from "@/app/admin/admin-forms";
import { formatDate } from "@/lib/money";
import { requirePlatformStaff } from "@/lib/platform";
import { listOrganizations } from "@/lib/platform-queries";
import { cardClass, controlClass } from "@/lib/ui";

// Listado de organizaciones con buscador (nombre, RUT de alguna empresa, slug).
export default async function AdminOrganizationsPage({ searchParams }: PageProps<"/admin/organizaciones">) {
  const ctx = await requirePlatformStaff("SUPPORT");
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q : "";
  const orgs = await listOrganizations(query);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Organizaciones</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Las cuentas de Yellow ERP. Busca por nombre, empresa o RUT.
        </p>
      </div>

      <form method="get" className="flex items-center gap-2">
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Nombre, empresa o RUT"
          aria-label="Buscar organizaciones"
          className={controlClass + " max-w-sm"}
        />
        <button
          type="submit"
          className="rounded-control border border-border bg-surface px-3 py-2 text-sm text-foreground hover:bg-background"
        >
          Buscar
        </button>
      </form>

      {/* Alta asistida: crear la cuenta desde la consola. Es de OPERATOR. */}
      {ctx.staff.level !== "SUPPORT" ? (
        <section className={cardClass + " p-5"}>
          <h2 className="font-semibold">Nueva organización</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Crea la cuenta y luego invita al contacto con el enlace de la ficha. Las empresas las
            crea el cliente al entrar, con sus datos fiscales.
          </p>
          <div className="mt-4">
            <CreateOrganizationForm />
          </div>
        </section>
      ) : null}

      {orgs.length === 0 ? (
        <p className={cardClass + " px-4 py-6 text-sm text-muted-foreground"}>
          {query ? `Ninguna organización coincide con «${query}».` : "Todavía no hay organizaciones."}
        </p>
      ) : (
        <div className={cardClass + " overflow-hidden"}>
          <table className="w-full text-sm">
            <thead className="border-b border-border text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Organización</th>
                <th className="px-4 py-2 font-medium">Empresas</th>
                <th className="px-4 py-2 font-medium">Usuarios</th>
                <th className="px-4 py-2 font-medium">Última venta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {orgs.map((org) => (
                <tr key={org.id}>
                  <td className="px-4 py-2.5">
                    <Link
                      href={`/admin/organizaciones/${org.id}`}
                      className="font-medium hover:text-primary hover:underline"
                    >
                      {org.name}
                    </Link>
                    {org.companies.length > 0 ? (
                      <p className="text-xs text-muted-foreground">
                        {org.companies
                          .map((c) => c.name)
                          .slice(0, 3)
                          .join(" · ")}
                        {org.companies.length > 3 ? " …" : ""}
                      </p>
                    ) : null}
                  </td>
                  <td className="tabular px-4 py-2.5">{org._count.companies}</td>
                  <td className="tabular px-4 py-2.5">{org.activeMembers}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {org.lastActivity ? formatDate(org.lastActivity) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
