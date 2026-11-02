import { db } from "@/lib/db";
import { requireSchoolContext } from "@/lib/school-auth";
import { docenteDeUsuario } from "@/lib/school-team";
import { cardClass } from "@/lib/ui";

const DIAS_SEMANA = [
  { key: "lunes", label: "Lunes" },
  { key: "martes", label: "Martes" },
  { key: "miércoles", label: "Miércoles" },
  { key: "jueves", label: "Jueves" },
  { key: "viernes", label: "Viernes" },
  { key: "sábado", label: "Sábado" },
  { key: "domingo", label: "Domingo" },
] as const;

type CalendarioItem = {
  id: string;
  title: string;
  tipo: "clase" | "cita" | "reunion";
  startsAt: Date;
  endsAt: Date | null;
  estado: string;
  color: string;
  href: string;
};

function badgeClassFor(color: string): string {
  if (color === "success") return "border-success bg-success-10 text-success-900";
  if (color === "danger") return "border-danger bg-danger-10 text-danger-900";
  if (color === "accent") return "border-accent bg-accent-10 text-accent-900";
  return "border-primary bg-primary-10 text-primary-900";
}

function estadoLabel(tipo: string, estado: string): string {
  if (tipo === "clase") return estado === "Firmada" ? "Firmada" : "Pendiente";
  if (tipo === "cita") {
    if (estado === "PENDIENTE") return "Pendiente";
    if (estado === "CONFIRMADA") return "Confirmada";
    return "Rechazada";
  }
  return "Programada";
}

/** Calendario semanal del docente: clases, citas y reuniones en una semana. */
export default async function CalendarioPage() {
  const ctx = await requireSchoolContext("agenda");
  const teacherId = await obtenerDocenteId(ctx.user.id, ctx.school.id);

  if (!teacherId) {
    return (
      <div className={cardClass + " p-6"}>
        <h1 className="text-lg font-bold">Calendario del docente</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tu usuario no tiene una ficha de docente vinculada. Pídele a la
          secretaría que te vincule en Equipo.
        </p>
      </div>
    );
  }

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const diaSemana = hoy.getDay();
  const lunes = new Date(hoy);
  lunes.setDate(hoy.getDate() - ((diaSemana + 6) % 7));
  const domingo = new Date(lunes);
  domingo.setDate(lunes.getDate() + 6);

  const inicioSemana = lunes;
  const finSemana = new Date(domingo);
  finSemana.setHours(23, 59, 59, 999);

  const sesiones = await db.classSession.findMany({
    where: {
      teacherId,
      date: { gte: inicioSemana, lte: finSemana },
    },
    include: {
      course: { select: { id: true, name: true } },
      subject: { select: { id: true, name: true } },
      signature: { select: { id: true } },
    },
    orderBy: [{ date: "asc" }, { period: "asc" }],
  });

  const citas = await db.appointment.findMany({
    where: {
      schoolId: ctx.school.id,
      teacherId,
      scheduledAt: { gte: inicioSemana, lte: finSemana },
      status: { in: ["PENDIENTE", "CONFIRMADA"] },
    },
    orderBy: { scheduledAt: "asc" },
  });

  const reuniones = await db.staffMeeting.findMany({
    where: {
      schoolId: ctx.school.id,
      startsAt: { gte: inicioSemana, lte: finSemana },
    },
    orderBy: { startsAt: "asc" },
  });

  const items: CalendarioItem[] = [
    ...sesiones.map((s): CalendarioItem => ({
      id: s.id,
      title: `${s.course.name} · ${s.subject.name}`,
      tipo: "clase",
      startsAt: s.date,
      endsAt: null,
      estado: s.signature ? "Firmada" : "Pendiente",
      color: s.signature ? "success" : "accent",
      href: `/colegios/asistencia?curso=${s.course.id}&clase=${s.id}`,
    })),
    ...citas.map((c): CalendarioItem => ({
      id: c.id,
      title: c.title,
      tipo: "cita",
      startsAt: c.scheduledAt,
      endsAt: null,
      estado: c.status,
      color: c.status === "CONFIRMADA" ? "success" : "accent",
      href: `/colegios/citas`,
    })),
    ...reuniones.map((r): CalendarioItem => ({
      id: r.id,
      title: r.title,
      tipo: "reunion",
      startsAt: r.startsAt,
      endsAt: r.endsAt,
      estado: "Programada",
      color: "primary",
      href: `/colegios/reuniones/${r.id}`,
    })),
  ];

  items.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());

  const itemsPorDia = new Map<string, CalendarioItem[]>();
  for (let i = 0; i < 7; i++) {
    const dia = new Date(lunes);
    dia.setDate(lunes.getDate() + i);
    itemsPorDia.set(dia.toISOString().slice(0, 10), []);
  }
  for (const item of items) {
    const clave = item.startsAt.toISOString().slice(0, 10);
    const existentes = itemsPorDia.get(clave) ?? [];
    existentes.push(item);
    itemsPorDia.set(clave, existentes);
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <div>
        <h1 className="text-lg font-bold tracking-tight">Calendario del docente</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Semana del {lunes.getDate()} al {domingo.getDate()} de
          {lunes.toLocaleDateString("es-CL", { month: "long" })}.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-7 gap-2">
        {DIAS_SEMANA.map((dia) => {
          const fecha = new Date(lunes);
          fecha.setDate(lunes.getDate() + DIAS_SEMANA.indexOf(dia));
          const esHoy =
            fecha.toISOString().slice(0, 10) === hoy.toISOString().slice(0, 10);
          const diaItems = itemsPorDia.get(fecha.toISOString().slice(0, 10)) ?? [];

          return (
            <div
              key={dia.key}
              className={
                cardClass +
                ` p-2 ${esHoy ? "ring-2 ring-accent" : ""}`
              }
            >
              <div className="flex items-center justify-between gap-1 mb-2">
                <span className="text-xs font-semibold text-muted-foreground">
                  {dia.label.slice(0, 3)}
                </span>
                <span className="text-xs font-medium">{fecha.getDate()}</span>
              </div>
              {diaItems.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center">
                  Sin actividades
                </p>
              ) : (
                <ul className="space-y-1">
                  {diaItems.map((item) => {
                    const bc = badgeClassFor(item.color);
                    const tl = item.tipo === "clase"
                      ? "Clase"
                      : item.tipo === "cita"
                        ? "Cita"
                        : "Reunión";
                    return (
                      <li key={item.id}>
                        <a
                          href={item.href}
                          className={`block rounded px-2 py-1 text-xs border ${bc} hover:bg-accent-50 transition-colors`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="truncate">{item.title}</span>
                            <span className="text-[10px] uppercase tracking-tighter">
                              {tl}
                            </span>
                          </div>
                          <div className="text-[10px] text-opacity-70">
                            {item.startsAt.toLocaleTimeString("es-CL", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        </a>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      <div className={cardClass + " p-4 mt-4"}>
        <h2 className="text-sm font-semibold">Actividades de la semana</h2>
        {items.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            No tienes actividades esta semana.
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {items.map((item) => {
              const fecha = new Date(item.startsAt);
              const diaNombre = DIAS_SEMANA[
                ((fecha.getDay() + 6) % 7)
              ].label.slice(0, 3);
              const bc = badgeClassFor(item.color);
              const el = estadoLabel(item.tipo, item.estado);
              return (
                <li key={item.id} className="flex items-center justify-between gap-3 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {diaNombre} {item.startsAt.getDate()} /
                      {item.startsAt.getMonth() + 1} ·{" "}
                      {item.startsAt.toLocaleTimeString("es-CL", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${bc}`}>
                    {el}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

async function obtenerDocenteId(
  userId: string,
  schoolId: string,
): Promise<string | null> {
  const docente = await docenteDeUsuario(userId, schoolId);
  return docente?.id ?? null;
}
