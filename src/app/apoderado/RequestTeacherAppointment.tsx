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

type DocenteCurso = {
  id: string;
  nombre: string;
  asignatura: string;
  curso: string;
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

function CancelButton({ appointmentId }: { appointmentId: string }) {
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
        disabled={cancelar?.error === undefined && cancelar !== undefined}
      >
        Cancelar
      </button>
    </form>
  );
}

/** Solicitar cita con un profesor. */
export function RequestTeacherAppointment({
  hijos,
  citas,
}: {
  hijos: { id: string; nombre: string }[];
  citas: Cita[];
}) {
  const [solicitar, formAction, pendienteSolicitar] = useActionState<PortalAppointmentState, FormData>(
    requestTeacherAppointment,
    undefined,
  );
  const [alumnoId, setAlumnoId] = useState("");
  const [docentes, setDocentes] = useState<DocenteCurso[]>([]);
  const [teacherId, setTeacherId] = useState("");
  const [reason, setReason] = useState("");
  const [fecha, setFecha] = useState("");
  const [hora, setHora] = useState("");
  const [durationMin, setDurationMin] = useState(30);
  const [place, setPlace] = useState("");

  useEffect(() => {
    if (solicitar?.ok) {
      toast.success("Solicitud enviada: el profesor la verá en su bandeja.");
      setReason("");
      setFecha("");
      setHora("");
      setPlace("");
    }
    if (solicitar?.error) toast.error(solicitar.error);
  }, [solicitar]);

  useEffect(() => {
    if (!alumnoId) {
      setDocentes([]);
      setTeacherId("");
      return;
    }
    // Trae los docentes del alumno seleccionado
    fetch(`/apoderado/api/docentes?studentId=${alumnoId}`)
      .then((r) => r.json())
      .then((data: DocenteCurso[]) => {
        setDocentes(data);
        if (data.length > 0 && teacherId === "") setTeacherId(data[0].id);
      })
      .catch(() => toast.error("No se pudieron cargar los profesores."));
  }, [alumnoId]);

  const misCitas = citas.filter((c) => c.status === "PENDIENTE");

  return (
    <section className="cardClass p-5">
      <h2 className="font-semibold">Solicitar reunión con profesor</h2>
      <p className="mt-0.5 text-sm text-muted-foreground">
        Elige al alumno, al profesor y propone fecha/hora. La solicitud llega a la secretaría y
        al profesor.
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
            <option value="">— Elige —</option>
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
            disabled={docentes.length === 0}
          >
            {docentes.length === 0 ? (
              <option value="">Primero elige un alumno</option>
            ) : (
              docentes.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nombre} · {d.asignatura} ({d.curso})
                </option>
              ))
            )}
          </select>
        </div>

        <label htmlFor="motivo-cita" className={labelClass}>
          Motivo
        </label>
        <input
          id="motivo-cita"
          name="reason"
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reunión de apoderados, consulta pedagógica, etc."
          className={controlClass}
          required
          maxLength={200}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="fecha-cita" className={labelClass}>
              Fecha
            </label>
            <input
              id="fecha-cita"
              name="date"
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className={controlClass}
              required
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="hora-cita" className={labelClass}>
              Hora
            </label>
            <input
              id="hora-cita"
              name="time"
              type="time"
              value={hora}
              onChange={(e) => setHora(e.target.value)}
              className={controlClass}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="duracion" className={labelClass}>
              Duración (minutos)
            </label>
            <input
              id="duracion"
              name="durationMin"
              type="number"
              min={10}
              max={240}
              step={5}
              value={durationMin}
              onChange={(e) => setDurationMin(Number(e.target.value))}
              className={controlClass}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="lugar" className={labelClass}>
              Lugar
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
                    {new Date(c.scheduledAt).toLocaleString("es-CL", {
                      weekday: "short",
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })} · {c.durationMin} min
                    {c.place ? ` · ${c.place}` : ""}
                  </p>
                </div>
                <CancelButton appointmentId={c.id} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
