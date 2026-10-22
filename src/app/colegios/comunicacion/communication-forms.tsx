"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import {
  createAppointment,
  createCircular,
  deleteCircular,
  resolveJustification,
  type CommunicationFormState,
} from "@/app/actions/school-communication";
import { SubmitButton } from "@/components/submit-button";
import { controlClass, fieldClass, labelClass } from "@/lib/ui";

type Opcion = { id: string; nombre: string };

/** Publicar una circular. */
export function CircularForm({
  cursos,
  familias,
}: {
  cursos: Opcion[];
  familias: Opcion[];
}) {
  const [state, action] = useActionState<CommunicationFormState, FormData>(
    createCircular,
    undefined,
  );
  const panel = useRef<HTMLDetailsElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const [destinatario, setDestinatario] = useState("COLEGIO");

  useEffect(() => {
    if (!state?.ok) return;
    toast.success("Circular publicada");
    if (panel.current) panel.current.open = false;
    form.current?.reset();
  }, [state]);

  return (
    <details ref={panel} className="w-full max-w-2xl">
      <summary className="cursor-pointer text-sm font-semibold text-primary">
        Publicar una circular
      </summary>

      <form ref={form} action={action} className="mt-3 flex flex-col gap-3">
        <div className={fieldClass}>
          <label htmlFor="circularTitle" className={labelClass}>
            Título
          </label>
          <input
            id="circularTitle"
            name="title"
            type="text"
            required
            placeholder="Reunión de apoderados"
            className={controlClass}
          />
        </div>

        <div className={fieldClass}>
          <label htmlFor="circularBody" className={labelClass}>
            Mensaje
          </label>
          <textarea
            id="circularBody"
            name="body"
            required
            rows={4}
            className={controlClass}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className={fieldClass}>
            <label htmlFor="circularAudience" className={labelClass}>
              Quién la recibe
            </label>
            <select
              id="circularAudience"
              name="audience"
              value={destinatario}
              onChange={(e) => setDestinatario(e.target.value)}
              className={controlClass}
            >
              <option value="COLEGIO">Todo el colegio</option>
              <option value="CURSO">Un curso</option>
              <option value="FAMILIA">Una familia</option>
            </select>
          </div>

          {destinatario === "CURSO" ? (
            <div className={fieldClass}>
              <label htmlFor="circularCourse" className={labelClass}>
                Curso
              </label>
              <select
                id="circularCourse"
                name="courseId"
                className={controlClass}
                defaultValue=""
              >
                <option value="">Elige…</option>
                {cursos.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {destinatario === "FAMILIA" ? (
            <div className={fieldClass}>
              <label htmlFor="circularGuardian" className={labelClass}>
                Familia
              </label>
              <select
                id="circularGuardian"
                name="guardianId"
                className={controlClass}
                defaultValue=""
              >
                <option value="">Elige…</option>
                {familias.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.nombre}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </div>

        <div className={fieldClass}>
          <label htmlFor="circularCloses" className={labelClass}>
            Hasta cuándo se puede leer (opcional)
          </label>
          <input
            id="circularCloses"
            name="closesAt"
            type="text"
            data-date="1"
            pattern="^\d{2}-\d{2}(-\d{4})?$"
            placeholder="DD-MM-AAAA"
            className={controlClass}
          />
        </div>

        {state?.error ? <p className="text-sm text-danger">{state.error}</p> : null}

        <SubmitButton
          className="self-start rounded-control border border-primary bg-transparent px-3 py-1.5 text-sm font-semibold text-primary"
          pendingLabel="Publicando..."
        >
          Publicar
        </SubmitButton>
      </form>
    </details>
  );
}

/** Aceptar o rechazar una justificación propuesta por una familia. */
export function ResolveJustificationButton({
  requestId,
}: {
  requestId: string;
}) {
  const [state, action] = useActionState<CommunicationFormState, FormData>(
    resolveJustification,
    undefined,
  );

  useEffect(() => {
    if (state?.ok) toast.success("Justificación resuelta");
  }, [state]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-3">
        <form action={action} className="inline">
          <input type="hidden" name="requestId" value={requestId} />
          <input type="hidden" name="decision" value="ACEPTADA" />
          <button
            type="submit"
            className="rounded-control border border-primary bg-transparent px-2.5 py-1 text-xs font-semibold text-primary"
          >
            Aceptar
          </button>
        </form>
        <form action={action} className="inline">
          <input type="hidden" name="requestId" value={requestId} />
          <input type="hidden" name="decision" value="RECHAZADA" />
          <button
            type="submit"
            className="rounded-control border border-border px-2.5 py-1 text-xs hover:bg-background"
          >
            Rechazar
          </button>
        </form>
      </div>
      {state?.error ? <p className="text-xs text-danger">{state.error}</p> : null}
    </div>
  );
}

/** Eliminar una circular. */
export function DeleteCircularButton({ circularId }: { circularId: string }) {
  const [state, action] = useActionState<CommunicationFormState, FormData>(
    deleteCircular,
    undefined,
  );

  useEffect(() => {
    if (state?.ok) toast.success("Circular eliminada");
  }, [state]);

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <form action={action} className="inline">
        <input type="hidden" name="circularId" value={circularId} />
        <button
          type="submit"
          className="text-xs text-muted-foreground underline underline-offset-2 hover:text-danger"
        >
          Eliminar
        </button>
      </form>
      {state?.error ? <span className="text-xs text-danger">{state.error}</span> : null}
    </span>
  );
}

/** Agendar una citación con una familia. */
export function AppointmentForm({
  alumnos,
  familias,
  hoy,
}: {
  alumnos: Opcion[];
  familias: Opcion[];
  /** El día de hoy, para que la fecha venga puesta. */
  hoy: string;
}) {
  const [state, action] = useActionState<CommunicationFormState, FormData>(
    createAppointment,
    undefined,
  );
  const panel = useRef<HTMLDetailsElement>(null);
  const form = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state?.ok) return;
    toast.success("Citación agendada");
    if (panel.current) panel.current.open = false;
    form.current?.reset();
  }, [state]);

  return (
    <details ref={panel} className="w-full max-w-2xl">
      <summary className="cursor-pointer text-sm font-semibold text-primary">
        Agendar una citación
      </summary>

      <form ref={form} action={action} className="mt-3 flex flex-col gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className={fieldClass}>
            <label htmlFor="apptStudent" className={labelClass}>
              Alumno
            </label>
            <select id="apptStudent" name="studentId" className={controlClass} defaultValue="">
              <option value="">Elige…</option>
              {alumnos.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre}
                </option>
              ))}
            </select>
          </div>
          <div className={fieldClass}>
            <label htmlFor="apptGuardian" className={labelClass}>
              Familia
            </label>
            <select id="apptGuardian" name="guardianId" className={controlClass} defaultValue="">
              <option value="">Elige…</option>
              {familias.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className={fieldClass}>
          <label htmlFor="apptTitle" className={labelClass}>
            Motivo
          </label>
          <input
            id="apptTitle"
            name="title"
            type="text"
            required
            placeholder="Entrevista por inasistencias"
            className={controlClass}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className={fieldClass}>
            <label htmlFor="apptDate" className={labelClass}>
              Fecha
            </label>
            <input
              id="apptDate"
              name="date"
              type="text"
              data-date="1"
              pattern="^\d{2}-\d{2}-\d{4}$"
              placeholder="DD-MM-AAAA"
              required
              defaultValue={hoy}
              className={controlClass}
            />
          </div>
          <div className={fieldClass}>
            <label htmlFor="apptTime" className={labelClass}>
              Hora
            </label>
            <input
              id="apptTime"
              name="time"
              type="time"
              required
              defaultValue="09:00"
              className={controlClass + " tabular"}
            />
          </div>
          <div className={fieldClass}>
            <label htmlFor="apptDuration" className={labelClass}>
              Minutos
            </label>
            <input
              id="apptDuration"
              name="durationMin"
              type="number"
              min={10}
              max={240}
              defaultValue={30}
              className={controlClass + " tabular"}
            />
          </div>
          <div className={fieldClass}>
            <label htmlFor="apptPlace" className={labelClass}>
              Lugar
            </label>
            <input id="apptPlace" name="place" type="text" className={controlClass} />
          </div>
        </div>

        <div className={fieldClass}>
          <label htmlFor="apptReason" className={labelClass}>
            Detalle (opcional)
          </label>
          <input id="apptReason" name="reason" type="text" className={controlClass} />
        </div>

        {state?.error ? <p className="text-sm text-danger">{state.error}</p> : null}

        <SubmitButton
          className="self-start rounded-control border border-primary bg-transparent px-3 py-1.5 text-sm font-semibold text-primary"
          pendingLabel="Agendando..."
        >
          Agendar
        </SubmitButton>
      </form>
    </details>
  );
}
