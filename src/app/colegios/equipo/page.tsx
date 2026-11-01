import { TeamForm } from "@/app/colegios/equipo/team-form";
import { TeamRow } from "@/app/colegios/equipo/team-row";
import { db } from "@/lib/db";
import { requireSchoolContext, schoolCanWrite } from "@/lib/school-auth";
import { schoolRoleLabel } from "@/lib/school-permissions";
import { listarEquipo } from "@/lib/school-team";
import { cardClass } from "@/lib/ui";

/**
 * El equipo del colegio: quién entra, con qué rol y a qué ficha de docente
 * pertenece.
 *
 * Esta pantalla es la que hace posible que el módulo sea operante por más de
 * una persona: hasta ahora solo la dirección podía trabajar en el colegio,
 * porque no había forma de sumar a nadie.
 */
export default async function EquipoPage() {
  const ctx = await requireSchoolContext("equipo");
  const schoolId = ctx.school.id;
  const puedeEditar = schoolCanWrite(ctx, "equipo");

  const [equipo, docentes] = await Promise.all([
    listarEquipo(schoolId),
    db.teacher.findMany({
      where: { schoolId },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        userId: true,
        _count: { select: { assignments: true } },
      },
    }),
  ]);

  const fichas = docentes.map((d) => ({ id: d.id, nombre: d.name }));
  const sinFicha = docentes.filter((d) => !d.userId);
  const activos = equipo.filter((m) => m.activo);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Equipo del colegio</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Quién entra y con qué rol. Cada persona ve solo lo que le corresponde: un docente, sus
          cursos y sus asignaturas.
        </p>
      </div>

      {puedeEditar ? (
        <section className={cardClass + " p-5"}>
          <TeamForm docentes={fichas} />
        </section>
      ) : null}

      {sinFicha.length > 0 ? (
        <section className="rounded-card border border-accent/40 bg-accent-soft p-5">
          <h2 className="font-semibold text-accent">Fichas de docente sin cuenta</h2>
          <p className="mt-1 text-sm text-accent/90">
            Estas fichas no están vinculadas a ninguna persona: el plan del curso las pide, pero
            nadie las va a registrar. Vincúlalas desde la lista de abajo.
          </p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {sinFicha.map((d) => (
              <li
                key={d.id}
                className="rounded-control border border-border bg-surface px-2.5 py-1 text-xs"
              >
                {d.name}
                <span className="ml-1.5 text-muted-foreground">
                  {d._count.assignments > 0
                    ? `${d._count.assignments} ${d._count.assignments === 1 ? "asignatura" : "asignaturas"}`
                    : "sin asignaturas"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className={cardClass + " p-5"}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-semibold">Personas con acceso</h2>
          <p className="text-xs text-muted-foreground">
            {activos.length} {activos.length === 1 ? "persona" : "personas"} con acceso
            {equipo.length > activos.length ? ` · ${equipo.length - activos.length} sin acceso` : ""}
          </p>
        </div>

        {equipo.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Todavía no hay nadie más en el equipo. Sin otra persona con cuenta, el colegio se
            trabaja de a una persona a la vez.
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-border">
            {equipo.map((m) => (
              <TeamRow
                key={m.membershipId}
                miembro={{
                  membershipId: m.membershipId,
                  nombre: m.nombre,
                  email: m.email,
                  role: m.role,
                  activo: m.activo,
                  debeCambiarClave: m.debeCambiarClave,
                  docenteId: m.docenteId,
                  docenteNombre: m.docenteNombre,
                  ultimaEntrada: m.ultimaEntrada ? m.ultimaEntrada.toISOString() : null,
                }}
                docentes={fichas}
                soyYo={m.userId === ctx.user.id}
              />
            ))}
          </ul>
        )}
      </section>

      <section className={cardClass + " p-5"}>
        <h2 className="font-semibold">Qué puede hacer cada rol</h2>
        <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
          <li>
            <span className="font-medium text-foreground">{schoolRoleLabel("DIRECTOR")}</span>: ve y
            decide todo, y administra el equipo.
          </li>
          <li>
            <span className="font-medium text-foreground">{schoolRoleLabel("UTP")}</span>: lo
            académico: cursos, notas, promoción y los casos del Art. 11.
          </li>
          <li>
            <span className="font-medium text-foreground">{schoolRoleLabel("ADMIN")}</span>:
            secretaría, apoderados y comunicación.
          </li>
          <li>
            <span className="font-medium text-foreground">{schoolRoleLabel("TEACHER")}</span>: sus
            cursos, sus clases y sus notas. Nada más.
          </li>
          <li>
            <span className="font-medium text-foreground">{schoolRoleLabel("STAFF")}</span>:
            asistencia y reemplazos.
          </li>
          <li>
            <span className="font-medium text-foreground">{schoolRoleLabel("VIEWER")}</span>: mira
            sin escribir.
          </li>
        </ul>
      </section>
    </div>
  );
}
