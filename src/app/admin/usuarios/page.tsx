import Link from "next/link";

import { formatDate } from "@/lib/money";
import { requirePlatformStaff } from "@/lib/platform";
import { searchUsers } from "@/lib/platform-queries";
import { cardClass, controlClass } from "@/lib/ui";

// Búsqueda global de usuarios: soporte («no me llega el correo», «quedó bloqueado»).
export default async function AdminUsersPage({ searchParams }: PageProps<"/admin/usuarios">) {
  await requirePlatformStaff("SUPPORT");
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q : "";
  const users = await searchUsers(query);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Usuarios</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Búsqueda global por nombre o correo. Muestra a qué cuentas pertenece cada persona.
        </p>
      </div>

      <form method="get" className="flex items-center gap-2">
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Nombre o correo"
          aria-label="Buscar usuarios"
          className={controlClass + " max-w-sm"}
        />
        <button
          type="submit"
          className="rounded-control border border-border bg-surface px-3 py-2 text-sm text-foreground hover:bg-background"
        >
          Buscar
        </button>
      </form>

      {users.length === 0 ? (
        <p className={cardClass + " px-4 py-6 text-sm text-muted-foreground"}>
          {query ? `Ningún usuario coincide con «${query}».` : "Escribe un nombre o correo."}
        </p>
      ) : (
        <ul className={cardClass + " divide-y divide-border"}>
          {users.map((user) => (
            <li key={user.id} className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  {user.name}
                  {!user.active ? (
                    <span className="ml-2 text-xs text-muted-foreground">(inactivo)</span>
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
                    : "sin organización"}{" "}
                  {user.memberships.length > 0
                    ? `— ${user.memberships.map((m) => m.company.name).join(" · ")}`
                    : ""}
                </p>
                {user.mustChangePassword ? (
                  <p className="mt-0.5 text-xs text-danger">Debe cambiar la contraseña al entrar.</p>
                ) : null}
              </div>
              <p className="text-xs text-muted-foreground">
                Alta {formatDate(user.createdAt)}
                {user.memberships.some((m) => m.company.organizationId)
                  ? ""
                  : " · sin empresa"}
              </p>
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs text-muted-foreground">
        Ver una empresa como su cliente es la Fase B2 (impersonar) y todavía no está disponible.{" "}
        <Link href="/admin/organizaciones" className="underline underline-offset-2">
          Ver organizaciones
        </Link>
      </p>
    </div>
  );
}
