import { db } from "@/lib/db";
import { requireSchoolContext } from "@/lib/school-auth";
import { docenteDeUsuario } from "@/lib/school-team";
import { cardClass } from "@/lib/ui";

type AgendaItem = {
  id: string;
  title: string;
  tipo: "clase" | "cita" | "reunion";
  startsAt: Date;
  endsAt: Date | null;
  place: string | null;
  estado: string;
  color: string;
  href: string;
};

/** Agenda unificada del docente: clases, citas y reuniones en una línea de tiempo. */
export default async function AgendaPage() {
  const ctx = await requireSchoolContext("comunicacion");
  const teacherId = await obtenerDocenteId(ctx.user.id, ctx.school.id);

  if (!teacherId) {
    return (
      <div className={cardClass + " p-6"}>
        <h1 className="text-lg font-bold">Agenda del docente</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tu usuario no tiene una ficha de docente vinculada. Pídele a la
          secretaría que te vincule en Equipo.
        </p>
      </div>
    );
  }

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const manana = new Date(hoy);
  manana.setDate(manana.getDate() + 1);

  // Clases del día
  const sesiones = await db.classSession.findMany({
    where: {
      teacherId,
      date: { gte: hoy, lt: manana },
    },
    include: {
      course: { select: { id: true, name: true } },
      subject: { select: { id: true, name: true } },
      signature: { select: { id: true } },
    },
    orderBy: [{ period: "asc" }],
  });

  // Citas con familias (próximas 2 semanas)
  const citas = await db.appointment.findMany({
    where: {
      schoolId: ctx.school.id,
      teacherId,
      scheduledAt: { gte: hoy },
      status: { in: ["PENDIENTE", "CONFIRMADA"] },
    },
    orderBy: { scheduledAt: "asc" },
    take: 10,
  });

  // Reuniones de staff (próximas 2 semanas)
  const reuniones = await db.staffMeeting.findMany({
    where: {
      schoolId: ctx.school.id,
      startsAt: { gte: hoy },
    },
    orderBy: { startsAt: "asc" },
    take: 10,
  });

  const items: AgendaItem[] = [
    ...sesiones.map((s): AgendaItem => ({
      id: s.id,
      title: `${s.course.name} · ${s.subject.name}`,
      tipo: "clase",
      startsAt: s.date,
      endsAt: null,
      place: null,
      estado: s.signature ? "Firmada" : "Pendiente",
      color: s.signature ? "success" : "accent",
      href: `/colegios/asistencia?curso=${s.course.id}&clase=${s.id}`,
    })),
    ...citas.map((c): AgendaItem => ({
      id: c.id,
      title: c.title,
      tipo: "cita",
      startsAt: c.scheduledAt,
      endsAt: null,
      place: c.place,
      estado: c.status,
      color: c.status === "CONFIRMADA" ? "success" : "accent",
      href: `/colegios/citas`,
    })),
    ...reuniones.map((r): AgendaItem => ({
      id: r.id,
      title: r.title,
      tipo: "reunion",
      startsAt: r.startsAt,
      endsAt: r.endsAt,
      place: r.place,
      estado: "Programada",
      color: "primary",
      href: `/colegios/reuniones/${r.id}`,
    })),
  ];

  items.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());

  return (
    <div className="flex flex-col gap-4 p-4">
      <div>
        <h1 className="text-lg font-bold tracking-tight">Agenda del docente</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Tu día a la vista: clases, citas con familias y reuniones de staff.
        </p>
      </div>

      {items.length === 0 ? (
        <div className={cardClass + " p-6 text-center"}>
          <p className="text-sm text-muted-foreground">
            No tienes actividades programadas para los próximos días.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-3 py-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium border ${
                      item.color === "success"
                        ? "border-success bg-success-soft text-success"
                        : item.color === "danger"
                          ? "border-danger bg-danger-soft text-danger"
                          : item.color === "accent"
                            ? "border-accent bg-accent-soft text-accent"
                            : "border-primary bg-primary-soft text-primary"
                    }`}
                  >
                    {item.tipo === "clase" ? "Clase" : item.tipo === "cita" ? "Cita" : "Reunión"}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium ${
                      item.estado === "Firmada"
                        ? "bg-success-soft text-success"
                        : item.estado === "Pendiente" || item.estado === "PENDIENTE"
                          ? "bg-accent-soft text-accent"
                          : item.estado === "CONFIRMADA"
                            ? "bg-success-soft text-success"
                            : "bg-background text-muted-foreground"
                    }`}
                  >
                    {item.estado}
                  </span>
                </div>
                <p className="mt-0.5 text-sm font-medium">{item.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {item.startsAt.toLocaleString("es-CL", {
                    weekday: "short",
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {item.place ? ` · ${item.place}` : ""}
                </p>
              </div>
              <a
                href={item.href}
                className="text-xs font-semibold text-primary underline underline-offset-2 hover:text-primary/80"
              >
                Ver
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Obtiene el ID de docente vinculado al usuario actual. */
async function obtenerDocenteId(userId: string, schoolId: string): Promise<string | null> {
  const docente = await docenteDeUsuario(userId, schoolId);
  return docente?.id ?? null;
}
