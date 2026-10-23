"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";

import {
  cancelMyAppointment,
  requestTeacherAppointment,
  type PortalAppointmentState,
} from "@/app/actions/portal-appointments";
import { SubmitButton } from "@/components/submit-button";
import { cardClass, controlClass, labelClass } from "@/lib/ui";

type Profesor = {
  id: string;
  name: string;
  subject: string;
  course: string;
};

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

type Alumno = { id: string; nombre: string };

/** Componente para solicitar reuniones con profesores. */
export function SolicitarReunion({
  hijos,
  citas,
}: {
  hijos: Alumno[];
  citas: Cita[];
}) {
  const [solicitar, formAction, pendienteSolicitar] = useActionState<PortalAppointmentState, FormData>(
    requestTeacherAppointment,
    undefined,
  );
  const [alumnoId, setAlumnoId] = useState("");
  const [profesores, setProfesores] = useState<Profesor[]>([]);
  const [teacherId, setTeacherId] = useState("");
  const [reason, setReason] = useState("");
  const [fecha, setFecha] = useState("");
  const [hora, setHora] = useState("");
  const [place, setPlace] = useState("");

  useEffect(() => {
    if (solicitar?.ok) {
      toast.success("Solicitud enviada: la secretaría y el profesor la verán.");
      setReason("");
      setFecha("");
      setHora("");
      setPlace("");
      setTeacherId("");
      setAlumnoId("");
      setProfesores([]);
    }
    if (solicitar?.error) toast.error(solicitar.error);
  }, [solicitar]);

  useEffect(() => {
    if (!alumnoId) {
      setProfesores([]);
      setTeacherId("");
      return;
    }
    fetch(`/apoderado/api/docentes?studentId=${alumnoId}`)
      .then((r) => r.json())
      .then((data: Profesor[]) => {
        setProfesores(data);
        if (data.length > 0 && teacherId === "") setTeacherId(data[0].id);
      })
      .catch(() => toast.error("No se pudieron cargar los profesores."));
  }, [alumnoId]);

  const misCitas = citas.filter((c) => c.status === "PENDIENTE");

  return (
    <section className={cardClass + " p-5"}>
      <h2 className="font-semibold">Solicitar reunión con profesor</h2>
      <p className="mt-0.5 text-sm text-muted-foreground">
        Elige a tu hijo, el profesor y propone fecha/hora. La solicitud llega a la secretaría y
        al profesor para confirmar.
      </p>

      <form action={formAction} className="mt-4 flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="alumno" className={labelClass}>
            Alumno
          </label>
          <select
            id="alumno"
            name="studentId"
            value={alumnoId}
            onChange={(e) => setAlumnoId(e.target.value)}
            className={controlClass}
            required
          >
            <option value="">— Elige un alumno —</option>
            {hijos.map((h) => (
              <option key={h.id} value={h.id}>
                {h.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="profesor" className={labelClass}>
            Profesor
          </label>
          <select
            id="profesor"
            name="teacherId"
            value={teacherId}
            onChange={(e) => setTeacherId(e.target.value)}
            className={controlClass}
            required
            disabled={profesores.length === 0}
          >
            {profesores.length === 0 ? (
              <option value="">Primero elige un alumno</option>
            ) : (
              profesores.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {p.subject} ({p.course})
                </option>
              ))
            )}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="motivo" className={labelClass}>
            Motivo
          </label>
          <textarea
            id="motivo"
            name="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ej: Consultar rendimiento en Matemáticas, reunión de apoderados, etc."
            className={controlClass + " min-h-[80px] resize-y"}
            required
            maxLength={500}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="fecha" className={labelClass}>
              Fecha
            </label>
            <input
              id="fecha"
              name="date"
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className={controlClass}
              required
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="hora" className={labelClass}>
              Hora
            </label>
            <input
              id="hora"
              name="time"
              type="time"
              value={hora}
              onChange={(e) => setHora(e.target.value)}
              className={controlClass}
              required
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="lugar" className={labelClass}>
            Lugar (opcional)
          </label>
          <input
            id="lugar"
            name="place"
            type="text"
            value={place}
            onChange={(e) => setPlace(e.target.value)}
            placeholder="Oficina, sala de profesores, virtual..."
            className={controlClass}
          />
        </div>

        <div className="flex items-center gap-3">
          <SubmitButton
            className="rounded-control border border-primary bg-transparent px-4 py-2 text-sm font-semibold text-primary"
            pendingLabel="Enviando..."
            disabled={!alumnoId || !teacherId || !reason || !fecha || !hora || pendienteSolicitar}
          >
            Enviar solicitud
          </SubmitButton>
          {solicitar?.error ? <p className="text-xs text-danger">{solicitar.error}</p> : null}
        </div>
      </form>

      {misCitas.length > 0 && (
        <div className="mt-6">
          <h3 className="font-medium">Mis solicitudes pendientes</h3>
          <ul className="mt-2 divide-y divide-border">
            {misCitas.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{c.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {c.scheduledAt.toLocaleString("es-CL", {
                      weekday: "short",
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })} · {c.durationMin} min
                    {c.place ? ` · ${c.place}` : ""}
                  </p>
                </div>
                <CancelarCita appointmentId={c.id} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function CancelarCita({ appointmentId }: { appointmentId: string }) {
  const [cancelar, formAction] = useActionState<PortalAppointmentState, FormData>(
    cancelMyAppointment,
    undefined,
  );
  return (
    <form action={formAction}>
      <input type="hidden" name="appointmentId" value={appointmentId} />
      <button
        type="submit"
        className="rounded-control border border-border px-2.5 py-1 text-xs hover:bg-background"
        disabled={cancelar !== undefined && cancelar.error === undefined}
      >
        Cancelar
      </button>
    </form>
  );
}