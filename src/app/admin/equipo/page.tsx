import { AddStaffForm, StaffRowForm } from "@/app/admin/equipo/staff-forms";
import { platformLevelLabel, requirePlatformStaff } from "@/lib/platform";
import { listPlatformStaff } from "@/lib/platform-queries";
import { cardClass } from "@/lib/ui";

// Gestión del equipo de plataforma. Solo OWNER: es quien reparte el acceso al
// sistema entero. Un SUPPORT u OPERATOR no ve esta pantalla (ni el enlace ni la
// acción, que vuelve a exigir OWNER en el servidor).
export default async function AdminTeamPage() {
  const ctx = await requirePlatformStaff("OWNER");
  const staff = await listPlatformStaff();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Equipo de plataforma</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Quién puede entrar a esta consola y con qué nivel. Es el acceso más amplio del sistema:
          todas las cuentas a la vez.
        </p>
      </div>

      <section className={cardClass + " p-5"}>
        <h2 className="font-semibold">Agregar a alguien</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          La persona debe tener ya un usuario en el sistema. Se le da el acceso por su correo.
        </p>
        <div className="mt-4">
          <AddStaffForm />
        </div>
      </section>

      <section className={cardClass + " overflow-hidden"}>
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-2 font-medium">Persona</th>
              <th className="px-4 py-2 font-medium">Nivel</th>
              <th className="px-4 py-2 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {staff.map((member) => (
              <tr key={member.id}>
                <td className="px-4 py-3">
                  <p className="font-medium">
                    {member.user.name}
                    {member.userId === ctx.user.id ? (
                      <span className="ml-2 text-xs text-muted-foreground">(tú)</span>
                    ) : null}
                  </p>
                  <p className="text-xs text-muted-foreground">{member.user.email}</p>
                </td>
                <td className="px-4 py-3">{platformLevelLabel(member.level)}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-xs text-muted-foreground">
                      {member.active ? "Activo" : "Suspendido"}
                    </span>
                    <StaffRowForm
                      userId={member.userId}
                      level={member.level}
                      active={member.active}
                      isSelf={member.userId === ctx.user.id}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <p className="text-xs text-muted-foreground">
        Cambiar el nivel de alguien nunca deja la plataforma sin un dueño activo: si intentas
        degradar al último, el servidor lo impide.
      </p>
    </div>
  );
}
