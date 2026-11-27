import { db } from "@/lib/db";
import { searchUsers } from "@/lib/platform-queries";
import { obraCanWrite, requireObraContext } from "@/lib/obra-auth";
import { OBRA_ROLE_LABELS } from "@/lib/obra-permissions";
import { cardClass } from "@/lib/ui";
import {
  AgregarMiembroForm,
  EstadoMiembroForm,
  RolMiembroForm,
} from "./equipo-forms";

export default async function ObraEquipoPage() {
  const ctx = await requireObraContext("equipo");
  const editable = obraCanWrite(ctx, "equipo");
  const organizationId = ctx.user.orgMembership?.organizationId ?? null;

  const [miembros, usuarios] = await Promise.all([
    db.obraMembership.findMany({
      where: { obraId: ctx.obra.id },
      orderBy: [{ active: "desc" }, { createdAt: "asc" }],
      select: {
        id: true, role: true, active: true, createdAt: true,
        user: { select: { id: true, name: true, email: true } },
      },
    }),
    editable
      ? searchUsers({ organizationId: organizationId ?? undefined, estado: "activo", limit: 200 })
      : Promise.resolve([]),
  ]);

  const activos = miembros.filter((miembro) => miembro.active);
  const yaMiembros = new Set(miembros.map((miembro) => miembro.user.id));
  const disponibles = usuarios
    .filter((usuario) => !yaMiembros.has(usuario.id))
    .map((usuario) => ({ id: usuario.id, name: usuario.name, email: usuario.email }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="mb-1 font-mono text-xs uppercase tracking-[0.18em] text-primary">Índice / 12 — Equipo</p>
        <h1 className="text-2xl font-bold tracking-tight">Equipo de {ctx.obra.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Quién tiene acceso a esta obra y con qué rol. El permiso se valida en cada acción, no solo en el menú.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Miembros activos", value: String(activos.length) },
          { label: "Dirección de obra", value: String(activos.filter((m) => m.role === "ADMIN_OBRA").length) },
          { label: "Capataces y contadores", value: String(activos.filter((m) => m.role === "CAPATAZ" || m.role === "CONTADOR").length) },
        ].map((kpi) => (
          <div key={kpi.label} className={`${cardClass} p-4`}>
            <p className="text-xs text-muted-foreground">{kpi.label}</p>
            <p className="tabular mt-1 text-2xl font-bold">{kpi.value}</p>
          </div>
        ))}
      </div>

      {editable ? (
        <section className={`${cardClass} p-5`}>
          <h2 className="font-semibold">Agregar persona</h2>
          <p className="mb-3 mt-0.5 text-xs text-muted-foreground">
            Solo personas de tu organización. Quien agregues podrá entrar a esta obra con el rol elegido.
          </p>
          <AgregarMiembroForm usuarios={disponibles} />
        </section>
      ) : null}

      <section className={`${cardClass} overflow-x-auto`}>
        <div className="border-b border-border px-4 py-3">
          <h2 className="font-semibold">Miembros</h2>
        </div>
        {miembros.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">Esta obra todavía no tiene miembros asignados.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky-table-head text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Persona</th>
                <th className="px-3 py-2 text-left">Correo</th>
                <th className="px-3 py-2 text-left">Rol en la obra</th>
                <th className="px-3 py-2 text-left">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {miembros.map((miembro) => (
                <tr key={miembro.id}>
                  <td className="px-3 py-2 font-medium">{miembro.user.name}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{miembro.user.email}</td>
                  <td className="px-3 py-2">
                    {editable ? (
                      <RolMiembroForm id={miembro.id} role={miembro.role} />
                    ) : (
                      OBRA_ROLE_LABELS[miembro.role] ?? miembro.role
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${miembro.active ? "bg-success-soft text-success" : "bg-danger-soft text-danger"}`}>
                        {miembro.active ? "Activo" : "Inactivo"}
                      </span>
                      {editable ? <EstadoMiembroForm id={miembro.id} active={miembro.active} /> : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className={`${cardClass} p-5`}>
        <h2 className="font-semibold">Qué permite cada rol</h2>
        <ul className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
          <li><span className="font-medium text-foreground">Dirección de obra:</span> edita presupuesto, aprueba avance y estados de pago, administra la obra y su equipo.</li>
          <li><span className="font-medium text-foreground">Capataz:</span> mide avance, mueve bodega y registra maquinaria.</li>
          <li><span className="font-medium text-foreground">Contador:</span> arma estados de pago e imputa compras y gastos.</li>
          <li><span className="font-medium text-foreground">Solo lectura:</span> consulta sin poder modificar.</li>
        </ul>
      </section>
    </div>
  );
}
