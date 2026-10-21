"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";

import {
  ackCircular,
  requestJustification,
  respondAppointment,
  type PortalCommunicationState,
} from "@/app/actions/school-portal-actions";
import { SubmitButton } from "@/components/submit-button";
import { controlClass, labelClass } from "@/lib/ui";

type Circular = {
  id: string;
  title: string;
  body: string;
  publishedAt: Date;
  curso: string | null;
  leida: Date | null;
};

/** Las circulares del colegio, con el botón de acuse de lectura. */
export function PortalCirculars({ circulares }: { circulares: Circular[] }) {
  const [state, action] = useActionState<PortalCommunicationState, FormData>(
    ackCircular,
    undefined,
  );

  useEffect(() => {
    if (state?.ok) toast.success("Circular leída");
  }, [state]);

  if (circulares.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        El colegio todavía no ha publicado comunicados.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {circulares.map((c) => (
        <li key={c.id} className="py-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm font-medium">{c.title}</p>
            <span className="text-xs text-muted-foreground">
              {c.curso ? `${c.curso} · ` : ""}
              {new Date(c.publishedAt).toLocaleDateString("es-CL")}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{c.body}</p>
          <div className="mt-2">
            {c.leida ? (
              <span className="text-xs text-success">Leída</span>
            ) : (
              <form action={action}>
                <input type="hidden" name="circularId" value={c.id} />
                <button
                  type="submit"
                  className="rounded-control border border-border px-2.5 py-1 text-xs hover:bg-background"
                >
                  Marcar como leída
                </button>
              </form>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

type Inasistencia = {
  sessionId: string;
  alumno: string;
  fecha: Date;
  asignatura: string;
  curso: string;
  solicitud: { status: string; reason: string; requestedAt: Date } | null;
};

/** Las inasistencias que la familia puede proponer justificar. */
export function PortalJustifications({
  inasistencias,
}: {
  inasistencias: Inasistencia[];
}) {
  const [state, action] = useActionState<PortalCommunicationState, FormData>(
    requestJustification,
    undefined,
  );
  const lista = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (!state?.ok) return;
    toast.success("Justificación enviada a la secretaría");
    // El formulario se cierra manipulando el DOM: el efecto sincroniza con
    // algo de fuera de React, no cambia el estado del render.
    lista.current?.querySelectorAll("details[open]").forEach((d) => d.removeAttribute("open"));
  }, [state]);

  if (inasistencias.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No hay inasistencias pendientes de justificar.
      </p>
    );
  }

  return (
    <ul ref={lista} className="divide-y divide-border">
      {inasistencias.map((i) => (
        <li key={i.sessionId} className="py-3">
          <p className="text-sm font-medium">
            {i.asignatura} · {i.curso}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {i.alumno} · {new Date(i.fecha).toLocaleDateString("es-CL")}
          </p>

          {i.solicitud ? (
            <p className="mt-1 text-xs text-muted-foreground">
              {i.solicitud.status === "PENDIENTE"
                ? `Justificación enviada (${i.solicitud.reason}). La secretaría la está revisando.`
                : `Justificación ${i.solicitud.status === "ACEPTADA" ? "aceptada" : "rechazada"}.`}
            </p>
          ) : (
            <details className="mt-1">
              <summary className="cursor-pointer text-xs text-primary underline underline-offset-2">
                Justificar esta inasistencia
              </summary>
              <form action={action} className="mt-2 flex max-w-md flex-col gap-2">
                <input type="hidden" name="sessionId" value={i.sessionId} />
                <label htmlFor={`motivo-${i.sessionId}`} className={labelClass}>
                  Motivo
                </label>
                <select
                  id={`motivo-${i.sessionId}`}
                  name="reason"
                  className={controlClass}
                  defaultValue="ENFERMEDAD"
                >
                  <option value="ENFERMEDAD">Enfermedad</option>
                  <option value="PERMISO">Permiso</option>
                  <option value="OTRO">Otro</option>
                </select>
                <label htmlFor={`nota-${i.sessionId}`} className={labelClass}>
                  Detalle
                </label>
                <input
                  id={`nota-${i.sessionId}`}
                  name="note"
                  type="text"
                  placeholder="Certificado médico N° 1234"
                  className={controlClass}
                />
                {state?.error ? <p className="text-xs text-danger">{state.error}</p> : null}
                <SubmitButton
                  className="self-start rounded-control border border-primary bg-transparent px-3 py-1.5 text-xs font-semibold text-primary"
                  pendingLabel="Enviando..."
                >
                  Enviar a la secretaría
                </SubmitButton>
              </form>
            </details>
          )}
        </li>
      ))}
    </ul>
  );
}

type Cita = {
  id: string;
  title: string;
  reason: string | null;
  scheduledAt: Date;
  durationMin: number;
  place: string | null;
  status: string;
  response: string | null;
};

/** Las citaciones del colegio, con la respuesta de la familia. */
export function PortalAppointments({ citas }: { citas: Cita[] }) {
  const [state, action] = useActionState<PortalCommunicationState, FormData>(
    respondAppointment,
    undefined,
  );
  const lista = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (!state?.ok) return;
    toast.success("Respuesta enviada");
    lista.current?.querySelectorAll("details[open]").forEach((d) => d.removeAttribute("open"));
  }, [state]);

  if (citas.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No hay citaciones agendadas.
      </p>
    );
  }

  return (
    <ul ref={lista} className="divide-y divide-border">
      {citas.map((c) => (
        <li key={c.id} className="py-3">
          <p className="text-sm font-medium">{c.title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {new Date(c.scheduledAt).toLocaleString("es-CL", {
              weekday: "short",
              day: "2-digit",
              month: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            })}{" "}
            · {c.durationMin} min
            {c.place ? ` · ${c.place}` : ""}
          </p>
          {c.reason ? <p className="mt-1 text-xs text-muted-foreground">{c.reason}</p> : null}

          {c.status === "PENDIENTE" ? (
            <details className="mt-1">
              <summary className="cursor-pointer text-xs text-primary underline underline-offset-2">
                Responder
              </summary>
              <form action={action} className="mt-2 flex max-w-md flex-col gap-2">
                <input type="hidden" name="appointmentId" value={c.id} />
                <label htmlFor={`respuesta-${c.id}`} className={labelClass}>
                  Tu respuesta
                </label>
                <input
                  id={`respuesta-${c.id}`}
                  name="response"
                  type="text"
                  placeholder="Confirmo, o propongo otra hora"
                  className={controlClass}
                />
                {state?.error ? <p className="text-xs text-danger">{state.error}</p> : null}
                <div className="flex items-center gap-3">
                  <button
                    type="submit"
                    name="status"
                    value="CONFIRMADA"
                    className="rounded-control border border-primary bg-transparent px-2.5 py-1 text-xs font-semibold text-primary"
                  >
                    Confirmo
                  </button>
                  <button
                    type="submit"
                    name="status"
                    value="RECHAZADA"
                    className="rounded-control border border-border px-2.5 py-1 text-xs hover:bg-background"
                  >
                    No puedo
                  </button>
                </div>
              </form>
            </details>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">
              {c.status === "CONFIRMADA"
                ? "Confirmada."
                : c.status === "RECHAZADA"
                  ? "No se puede en ese horario."
                  : c.status === "REALIZADA"
                    ? "Se realizó."
                    : "Cancelada."}
              {c.response ? ` ${c.response}` : ""}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}
