import Link from "next/link";

import { formatDate } from "@/lib/money";
import { requirePlatformStaff } from "@/lib/platform";
import { listOrganizations, searchUsers } from "@/lib/platform-queries";
import { cardClass, controlClass } from "@/lib/ui";

// Búsqueda global de usuarios: soporte («no me llega el correo», «quedó
// bloqueado»). Se filtra por cuenta y por estado, porque el caso típico es
// «mira estos usuarios de esta cuenta».
export default async function AdminUsersPage({ searchParams }: PageProps<"/admin/usuarios">) {
  await requirePlatformStaff("SUPPORT");
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q : "";
  const organizationId = typeof params.organizacion === "string" ? params.organizacion : "";
  const estado = typeof params.estado === "string" ? params.estado : "todos";

  const [users, orgs] = await Promise.all([
    searchUsers({ query, organizationId, estado }),
    listOrganizations(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Usuarios</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Todas las personas del sistema y las cuentas donde están. Entra a una ficha para ver su
          detalle y administrarla.
        </p>
      </div>

      <form method="get" className="flex flex-wrap items-end gap-2">
        <div className="min-w-52 flex-1">
          <label htmlFor="users-q" className="text-sm font-medium">
            Buscar
          </label>
          <input
            id="users-q"
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Nombre o correo"
            className={controlClass}
          />
        </div>
        <div className="min-w-48">
          <label htmlFor="users-org" className="text-sm font-medium">
            Cuenta
          </label>
          <select id="users-org" name="organizacion" defaultValue={organizationId} className={controlClass}>
            <option value="">Todas las cuentas</option>
            {orgs.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-40">
          <label htmlFor="users-estado" className="text-sm font-medium">
            Estado
          </label>
          <select id="users-estado" name="estado" defaultValue={estado} className={controlClass}>
            <option value="todos">Todos</option>
            <option value="activo">Activos</option>
            <option value="inactivo">Inactivos</option>
          </select>
        </div>
        <button
          type="submit"
          className="rounded-control border border-border bg-surface px-3 py-2 text-sm text-foreground hover:bg-background"
        >
          Filtrar
        </button>
      </form>

      {users.length === 0 ? (
        <p className={cardClass + " px-4 py-6 text-sm text-muted-foreground"}>
          {query || organizationId || estado !== "todos"
            ? "Ningún usuario coincide con el filtro."
            : "Escribe un nombre o correo para buscar."}
        </p>
      ) : (
        <ul className={cardClass + " divide-y divide-border"}>
          {users.map((user) => (
            <li key={user.id} className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  <Link
                    href={`/admin/usuarios/${user.id}`}
                    className="hover:text-primary hover:underline"
                  >
                    {user.name}
                  </Link>
                  {!user.active ? (
                    <span className="ml-2 text-xs text-muted-foreground">(desactivado)</span>
                  ) : null}
                  {user.platformStaff?.active ? (
                    <span className="ml-2 rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
                      equipo
                    </span>
                  ) : null}
                </p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {user.orgMembers.length > 0
                    ? user.orgMembers.map((m) => m.organization.name).join(" · ")
                    : "sin organización"}
                  {user.memberships.length > 0
                    ? ` — ${user.memberships.map((m) => m.company.name).join(" · ")}`
                    : ""}
                </p>
                {user.mustChangePassword ? (
                  <p className="mt-0.5 text-xs text-danger">
                    Debe cambiar la contraseña al entrar.
                  </p>
                ) : null}
              </div>
              <p className="text-xs text-muted-foreground">Alta {formatDate(user.createdAt)}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
