import { serverAction } from "@/lib/server-action";
import {
  respondTeacherAppointment,
  getTeacherAppointments,
  countUnreadAppointments,
} from "@/app/actions/school-appointments";
import { requireSchoolContext, schoolCanWrite } from "@/lib/school-auth";
import { SubmitButton } from "@/components/submit-button";
import { cardClass } from "@/lib/ui";

/** Las citas (Appointment) dirigidas al docente actual. */
export default async function CitasPage() {
  const ctx = await requireSchoolContext("citas");
  const puedeVerTodas = schoolCanWrite(ctx, "comunicacion");
  const { citas, error } = await getTeacherAppointments();
  const { count: unreadCount } = await countUnreadAppointments();

  if (error) {
    return (
      <div className={cardClass + " p-6"}>
        <h1 className="text-lg font-bold">Citas con familias</h1>
        <p className="mt-1 text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  const confirmar = serverAction(respondTeacherAppointment);
  const rechazar = serverAction(respondTeacherAppointment);

  const tieneNoLeidas = unreadCount > 0;

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <h1 className="text-lg font-bold tracking-tight">
            Citas con familias
            {tieneNoLeidas ? (
              <span
                className="ml-2 inline-flex items-center gap-1"
                title="Citas sin leer"
              >
                <span className="w-2 h-2 rounded-full bg-accent"></span>
                <span className="text-xs font-semibold text-accent">
                  {unreadCount} nueva{unreadCount !== 1 ? "s" : ""}
                </span>
              </span>
            ) : null}
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Las solicitudes de reunión que las familias han dirigido a ti. Puedes
            confirmar o rechazar cada una.
          </p>
        </div>
        {puedeVerTodas ? (
          <a
            href="/colegios/comunicacion/citas"
            className="text-xs font-semibold text-primary underline underline-offset-2 hover:text-primary/80"
          >
            Ver todas las citas del colegio
          </a>
        ) : null}
      </div>

      {citas.length === 0 ? (
        <div className={cardClass + " p-6 text-center"}>
          <p className="text-sm text-muted-foreground">
            No tienes citas pendientes ni confirmadas.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {citas.map((cita) => {
            const noLeida = !cita.readAt;
            return (
              <li key={cita.id} className="flex flex-col gap-3 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-2">
                      <p className="text-sm font-medium">
                        {noLeida ? "● " : ""}{cita.title}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {cita.studentName} · {cita.guardianName ?? "Apoderado"}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {cita.scheduledAt.toLocaleString("es-CL", {
                          weekday: "short",
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {` · ${cita.durationMin} min`}
                        {cita.place ? ` · ${cita.place}` : ""}
                      </p>
                      {cita.reason ? (
                        <p className="mt-1 text-sm text-muted-foreground">
                          &ldquo;{cita.reason}&rdquo;
                        </p>
                      ) : null}
                    </div>
                    {noLeida ? (
                      <p className="mt-1 text-xs text-accent font-medium">
                        Nueva cita sin leer
                      </p>
                    ) : null}
                  </div>
                  <div className="flex items-end gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded text-xs font-medium ${
                        cita.status === "CONFIRMADA"
                          ? "bg-success-soft text-success"
                          : cita.status === "RECHAZADA"
                            ? "bg-danger-soft text-danger"
                            : "bg-accent-soft text-accent"
                      }`}
                    >
                      {cita.status === "PENDIENTE"
                        ? "Pendiente"
                        : cita.status === "CONFIRMADA"
                          ? "Confirmada"
                          : "Rechazada"}
                    </span>
                    {cita.status === "PENDIENTE" ? (
                      <>
                        <ResponderCitaForm
                          action={confirmar}
                          appointmentId={cita.id}
                          status="CONFIRMADA"
                          response="Confirmada por el docente."
                          label="Confirmar"
                          tone="success"
                        />
                        <ResponderCitaForm
                          action={rechazar}
                          appointmentId={cita.id}
                          status="RECHAZADA"
                          response="Rechazada por el docente."
                          label="Rechazar"
                          tone="danger"
                        />
                      </>
                    ) : (
                      <button
                        className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
                        disabled
                      >
                        Respondida
                      </button>
                    )}
                  </div>
                </div>
                {cita.response ? (
                  <p className="mt-1 text-sm text-muted-foreground">
                    Tu respuesta: <span className="text-foreground">{cita.response}</span>
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** Un botón para responder una cita con un estado dado. */
function ResponderCitaForm({
  action,
  appointmentId,
  status,
  response,
  label,
  tone,
}: {
  action: (formData: FormData) => Promise<void>;
  appointmentId: string;
  status: "CONFIRMADA" | "RECHAZADA";
  response: string;
  label: string;
  tone: "success" | "danger";
}) {
  const border =
    tone === "success"
      ? "border-success bg-success-soft text-success"
      : "border-danger bg-danger-soft text-danger";

  return (
    <form action={action} className="flex gap-1">
      <input type="hidden" name="appointmentId" value={appointmentId} />
      <input type="hidden" name="status" value={status} />
      <input type="hidden" name="response" value={response} />
      <SubmitButton
        className={`rounded-control border px-2.5 py-1 text-xs font-medium ${border}`}
        pendingLabel={label + "…"}
      >
        {label}
      </SubmitButton>
    </form>
  );
}
