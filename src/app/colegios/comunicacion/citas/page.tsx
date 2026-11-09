import { db } from "@/lib/db";
import { requireSchoolContext, schoolCanWrite } from "@/lib/school-auth";
import { listAllAppointments, respondAnyAppointment } from "@/app/actions/school-appointments";
import { serverAction } from "@/lib/server-action";
import { FormattedDate } from "@/components/formatted-date";
import { SubmitButton } from "@/components/submit-button";
import { cardClass, controlClass, labelClass } from "@/lib/ui";

const ESTADOS_CITA = [
  { value: "PENDIENTE", label: "Pendiente", color: "accent" },
  { value: "CONFIRMADA", label: "Confirmada", color: "success" },
  { value: "RECHAZADA", label: "Rechazada", color: "danger" },
  { value: "REALIZADA", label: "Realizada", color: "primary" },
  { value: "CANCELADA", label: "Cancelada", color: "muted-foreground" },
] as const;

/** Citaciones del colegio: vista para la secretaría. */
export default async function CitasComunicacionPage() {
  const ctx = await requireSchoolContext("comunicacion");
  const puedeResponder = schoolCanWrite(ctx, "comunicacion");

  // Docentes del colegio para el filtro
  const docentes = await db.teacher.findMany({
    where: { schoolId: ctx.school.id },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const { citas, error } = await listAllAppointments();

  if (error) {
    return (
      <div className={cardClass + " p-6"}>
        <h1 className="text-lg font-bold">Citas con familias</h1>
        <p className="mt-1 text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  const responder = serverAction(respondAnyAppointment);

  // Filtro por estado (desde URL o memoria simple)
  const filtroEstado = "";

  const citasFiltradas =
    filtroEstado === ""
      ? citas
      : citas.filter((c) => c.status === filtroEstado);

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <h1 className="text-lg font-bold tracking-tight">
            Citas con familias
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Todas las solicitudes de reunión del colegio. La secretaría puede
            confirmar o rechazar cualquier cita.
          </p>
        </div>
        {puedeResponder ? (
          <a
            href="/colegios/citas"
            className="text-xs font-semibold text-primary underline underline-offset-2 hover:text-primary/80"
          >
            Ver mis citas
          </a>
        ) : null}
      </div>

      {/* Filtros */}
      <div className={cardClass + " p-3 flex flex-wrap items-end gap-2 border-b border-border"}>
        <label htmlFor="filtro-estado" className={labelClass}>
          Estado
        </label>
        <select
          id="filtro-estado"
          className={controlClass + " w-auto"}
          defaultValue=""
        >
          <option value="">Todos los estados</option>
          {ESTADOS_CITA.map((e) => (
            <option key={e.value} value={e.value}>
              {e.label}
            </option>
          ))}
        </select>
        <label htmlFor="filtro-docente" className={labelClass}>
          Docente
        </label>
        <select
          id="filtro-docente"
          className={controlClass + " w-auto"}
          defaultValue=""
        >
          <option value="">Todos los docentes</option>
          {docentes.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </div>

      {citasFiltradas.length === 0 ? (
        <div className={cardClass + " p-6 text-center"}>
          <p className="text-sm text-muted-foreground">
            No hay citas con familias registradas.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground border-b border-border">
                <th className="px-3 py-2">Fecha y hora</th>
                <th className="px-3 py-2">Alumno</th>
                <th className="px-3 py-2">Apoderado</th>
                <th className="px-3 py-2">Docente</th>
                <th className="px-3 py-2">Motivo</th>
                <th className="px-3 py-2">Estado</th>
                {puedeResponder ? (
                  <th className="px-3 py-2 text-center">Responder</th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {citasFiltradas.map((cita) => (
                <tr key={cita.id} className="border-b border-border">
                  <td className="px-3 py-2">
                    <div className="text-sm"><FormattedDate iso={cita.scheduledAt.toISOString()} options={{ weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "UTC" }} /></div>
                    {cita.durationMin > 0 && (
                      <div className="text-xs text-muted-foreground">
                        {cita.durationMin} min
                      </div>
                    )}
                    {cita.place ? (
                      <div className="text-xs text-muted-foreground">
                        {cita.place}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-3 py-2">{cita.studentName}</td>
                  <td className="px-3 py-2">
                    {cita.guardianName ?? "—"}
                  </td>
                  <td className="px-3 py-2">
                    {cita.teacherName ?? "—"}
                  </td>
                  <td className="px-3 py-2">
                    <div className="text-sm">{cita.title}</div>
                    {cita.reason ? (
                      <div className="text-xs text-muted-foreground truncate max-w-xs">
                        &ldquo;{cita.reason}&rdquo;
                      </div>
                    ) : null}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        ESTADOS_CITA.find((e) => e.value === cita.status)?.color ===
                        "success"
                          ? "bg-success-soft text-success"
                          : ESTADOS_CITA.find((e) => e.value === cita.status)
                            ?.color === "danger"
                              ? "bg-danger-soft text-danger"
                              : ESTADOS_CITA.find((e) => e.value === cita.status)
                                ?.color === "primary"
                                  ? "bg-primary-soft text-primary"
                                  : ESTADOS_CITA.find(
                                      (e) => e.value === cita.status,
                                    )?.color === "muted-foreground"
                                      ? "bg-background text-muted-foreground"
                                      : "bg-accent-soft text-accent"
                      }`}
                    >
                      {cita.status === "PENDIENTE"
                        ? "Pendiente"
                        : cita.status === "CONFIRMADA"
                          ? "Confirmada"
                          : cita.status === "RECHAZADA"
                            ? "Rechazada"
                            : cita.status === "REALIZADA"
                              ? "Realizada"
                              : "Cancelada"}
                    </span>
                  </td>
                  {puedeResponder && cita.status === "PENDIENTE" ? (
                    <td className="px-3 py-2">
                      <ResponderCitaForm
                        action={responder}
                        appointmentId={cita.id}
                      />
                    </td>
                  ) : (
                    <td className="px-3 py-2">
                      {cita.response ? (
                        <span className="text-xs text-muted-foreground">
                          {cita.response}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/** Formulario para responder una cita (confirmar/rechazar). */
function ResponderCitaForm({
  action,
  appointmentId,
}: {
  action: (formData: FormData) => Promise<void>;
  appointmentId: string;
}) {
  const borderConfirmar =
    "border-success bg-success-soft text-success";
  const borderRechazar =
    "border-danger bg-danger-soft text-danger";

  return (
    <div className="flex flex-col gap-1">
      <form action={action} className="flex gap-1">
        <input type="hidden" name="appointmentId" value={appointmentId} />
        <input type="hidden" name="status" value="CONFIRMADA" />
        <input type="hidden" name="response" value="Confirmada por la secretaría." />
        <SubmitButton
          className={`rounded-control border px-2 py-1 text-xs font-medium ${borderConfirmar}`}
          pendingLabel="Confirmando…"
        >
          Confirmar
        </SubmitButton>
      </form>
      <form action={action} className="flex gap-1">
        <input type="hidden" name="appointmentId" value={appointmentId} />
        <input type="hidden" name="status" value="RECHAZADA" />
        <input type="hidden" name="response" value="Rechazada por la secretaría." />
        <SubmitButton
          className={`rounded-control border px-2 py-1 text-xs font-medium ${borderRechazar}`}
          pendingLabel="Rechazando…"
        >
          Rechazar
        </SubmitButton>
      </form>
    </div>
  );
}
