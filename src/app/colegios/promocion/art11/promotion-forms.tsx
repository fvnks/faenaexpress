"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";

import {
  saveAttendanceException,
  saveHearing,
  savePromotionDecision,
  saveUtpReport,
  type PromotionFormState,
} from "@/app/actions/school-promotion";
import { SubmitButton } from "@/components/submit-button";
import { controlClass, fieldClass, labelClass } from "@/lib/ui";

type CasoBase = {
  studentId: string;
  nombre: string;
  year: number;
  excepcionAplica: boolean;
};

/** El informe del jefe técnico-pedagógico (Art. 11). */
export function UtpReportForm({
  caso,
  valorInicial,
}: {
  caso: CasoBase;
  valorInicial: string;
}) {
  const [state, action] = useActionState<PromotionFormState, FormData>(saveUtpReport, undefined);

  useEffect(() => {
    if (state?.ok) toast.success("Informe guardado");
  }, [state]);

  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="studentId" value={caso.studentId} />
      <input type="hidden" name="year" value={caso.year} />
      <label htmlFor={`utp-${caso.studentId}`} className={labelClass}>
        Informe del jefe técnico-pedagógico
      </label>
      <textarea
        id={`utp-${caso.studentId}`}
        name="utpReport"
        rows={4}
        required
        defaultValue={valorInicial}
        placeholder="Antecedentes del proceso, en colaboración con el profesor jefe…"
        className={controlClass}
      />
      {state?.error ? <p className="text-sm text-danger">{state.error}</p> : null}
      <SubmitButton
        className="self-start rounded-control border border-primary bg-transparent px-3 py-1.5 text-sm font-semibold text-primary"
        pendingLabel="Guardando..."
      >
        Guardar informe
      </SubmitButton>
    </form>
  );
}

/** La audiencia al estudiante y su apoderado (Art. 11). */
export function HearingForm({
  caso,
  fechaInicial,
  notasIniciales,
}: {
  caso: CasoBase;
  fechaInicial: string;
  notasIniciales: string;
}) {
  const [state, action] = useActionState<PromotionFormState, FormData>(saveHearing, undefined);

  useEffect(() => {
    if (state?.ok) toast.success("Audiencia registrada");
  }, [state]);

  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="studentId" value={caso.studentId} />
      <input type="hidden" name="year" value={caso.year} />

      <div className="grid gap-3 sm:grid-cols-2">
        <div className={fieldClass}>
          <label htmlFor={`hear-${caso.studentId}`} className={labelClass}>
            Fecha de la audiencia
          </label>
          <input
            id={`hear-${caso.studentId}`}
            name="hearingHeldAt"
            type="text"
            required
            data-date="1"
            defaultValue={fechaInicial}
            pattern="^\d{2}-\d{2}(-\d{4})?$"
            placeholder="DD-MM-AAAA"
            className={controlClass}
          />
        </div>
        <div className={fieldClass}>
          <label htmlFor={`hearnotes-${caso.studentId}`} className={labelClass}>
            Qué se conversó (opcional)
          </label>
          <input
            id={`hearnotes-${caso.studentId}`}
            name="hearingNotes"
            type="text"
            defaultValue={notasIniciales}
            className={controlClass}
          />
        </div>
      </div>

      {state?.error ? <p className="text-sm text-danger">{state.error}</p> : null}
      <SubmitButton
        className="self-start rounded-control border border-primary bg-transparent px-3 py-1.5 text-sm font-semibold text-primary"
        pendingLabel="Guardando..."
      >
        Guardar audiencia
      </SubmitButton>
    </form>
  );
}

/** La decisión de la dirección con la UTP (Art. 11). */
export function DecisionForm({
  caso,
  decisionInicial,
  outcomeInicial,
  excepcionActual,
  razonExcepcion,
}: {
  caso: CasoBase;
  decisionInicial: string;
  outcomeInicial: string;
  excepcionActual: boolean;
  razonExcepcion: string;
}) {
  const [state, action] = useActionState<PromotionFormState, FormData>(
    savePromotionDecision,
    undefined,
  );
  const [outcome, setOutcome] = useState(outcomeInicial);
  const [excepcion, setExcepcion] = useState(excepcionActual);

  useEffect(() => {
    if (state?.ok) toast.success("Decisión registrada");
  }, [state]);

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="studentId" value={caso.studentId} />
      <input type="hidden" name="year" value={caso.year} />

      <fieldset className="flex flex-wrap gap-4">
        <legend className={labelClass}>Qué se decide</legend>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="outcome"
            value="PROMOTED"
            checked={outcome === "PROMOTED"}
            onChange={() => setOutcome("PROMOTED")}
            required
          />
          Promover
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="outcome"
            value="NOT_PROMOTED"
            checked={outcome === "NOT_PROMOTED"}
            onChange={() => setOutcome("NOT_PROMOTED")}
          />
          No promover
        </label>
      </fieldset>

      <div className={fieldClass}>
        <label htmlFor={`dec-${caso.studentId}`} className={labelClass}>
          Fundamento de la decisión
        </label>
        <textarea
          id={`dec-${caso.studentId}`}
          name="decision"
          rows={3}
          required
          defaultValue={decisionInicial}
          placeholder="El acuerdo de la dirección y la UTP, con sus argumentos pedagógicos…"
          className={controlClass}
        />
      </div>

      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          name="attendanceException"
          checked={excepcion}
          onChange={(e) => setExcepcion(e.target.checked)}
          className="mt-0.5"
        />
        <span>
          Autorizar la excepción al 85% de asistencia (Art. 10.2)
          {!caso.excepcionAplica ? (
            <span className="mt-0.5 block text-xs text-muted-foreground">
              Este caso no está marcado por asistencia: revisa si corresponde.
            </span>
          ) : null}
        </span>
      </label>

      {excepcion ? (
        <div className={fieldClass}>
          <label htmlFor={`excreason-${caso.studentId}`} className={labelClass}>
            Fundamento de la excepción
          </label>
          <input
            id={`excreason-${caso.studentId}`}
            name="attendanceExceptionReason"
            type="text"
            defaultValue={razonExcepcion}
            placeholder="Licencia médica prolongada, enfermedad, etc."
            className={controlClass}
          />
        </div>
      ) : null}

      {state?.error ? <p className="text-sm text-danger">{state.error}</p> : null}
      <SubmitButton
        className="self-start rounded-control bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground"
        pendingLabel="Guardando..."
      >
        Registrar decisión
      </SubmitButton>
    </form>
  );
}

/** Autorizar la excepción de asistencia sin tocar la decisión (Art. 10.2). */
export function AttendanceExceptionForm({
  caso,
  excepcionActual,
  razonActual,
}: {
  caso: CasoBase;
  excepcionActual: boolean;
  razonActual: string;
}) {
  const [state, action] = useActionState<PromotionFormState, FormData>(
    saveAttendanceException,
    undefined,
  );

  useEffect(() => {
    if (state?.ok) toast.success("Excepción actualizada");
  }, [state]);

  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="studentId" value={caso.studentId} />
      <input type="hidden" name="year" value={caso.year} />

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="autorizar" defaultChecked={excepcionActual} />
        Autorizar la excepción al 85% de asistencia
      </label>

      <div className={fieldClass}>
        <label htmlFor={`excreason2-${caso.studentId}`} className={labelClass}>
          Fundamento
        </label>
        <input
          id={`excreason2-${caso.studentId}`}
          name="reason"
          type="text"
          defaultValue={razonActual}
          placeholder="Por qué se autoriza"
          className={controlClass}
        />
      </div>

      {state?.error ? <p className="text-sm text-danger">{state.error}</p> : null}
      <SubmitButton
        className="self-start rounded-control border border-border px-3 py-1.5 text-sm hover:bg-background"
        pendingLabel="Guardando..."
      >
        Guardar
      </SubmitButton>
    </form>
  );
}
