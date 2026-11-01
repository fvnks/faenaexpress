"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { saveAttendance, type AttendanceFormState } from "@/app/actions/schools";
import { SubmitButton } from "@/components/submit-button";

type Alumno = { id: string; nombre: string; estadoInicial: string };

const ESTADOS = [
  { value: "PRESENT", label: "Presente", abbr: "P", tone: "success" },
  { value: "ABSENT", label: "Ausente", abbr: "A", tone: "danger" },
  { value: "LATE", label: "Atraso", abbr: "T", tone: "accent" },
  { value: "JUSTIFIED", label: "Justificada", abbr: "J", tone: "muted-foreground" },
] as const;

const TONE_CLASS: Record<string, string> = {
  success: "border-success bg-success-soft text-success",
  danger: "border-danger bg-danger-soft text-danger",
  accent: "border-accent bg-accent-soft text-accent",
  "muted-foreground": "border-border bg-background text-muted-foreground",
};

export function AttendanceMobile({
  sessionId,
  courseName,
  subjectName,
  date,
  alumnos,
}: {
  sessionId: string;
  courseName: string;
  subjectName: string;
  date: Date;
  alumnos: Alumno[];
}) {
  const [state, action] = useActionState<AttendanceFormState, FormData>(
    saveAttendance,
    undefined,
  );
  const form = useRef<HTMLFormElement>(null);

  // Estado local: estudiante -> estado seleccionado
  const [estados, setEstados] = useState<Map<string, string>>(() =>
    new Map(alumnos.map((a) => [a.id, a.estadoInicial])),
  );

  useEffect(() => {
    if (state?.ok) {
      toast.success("Asistencia guardada");
    }
  }, [state]);

  const setEstado = (studentId: string, valor: string) => {
    setEstados((prev: Map<string, string>) => {
      const next = new Map(prev);
      next.set(studentId, valor);
      return next;
    });
  };

  const todosPresentes = () => {
    setEstados(new Map(alumnos.map((a) => [a.id, "PRESENT"])));
  };

  const todosAusentes = () => {
    setEstados(new Map(alumnos.map((a) => [a.id, "ABSENT"])));
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <div>
        <h1 className="text-lg font-bold tracking-tight">
          {courseName} · {subjectName}
        </h1>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {date.toLocaleDateString("es-CL", {
            weekday: "short",
            day: "numeric",
            month: "short",
          })}
        </p>
      </div>

      <div className="flex gap-2 mb-3">
        <button
          onClick={todosPresentes}
          className="flex-1 rounded-control border border-success bg-success-soft px-3 py-2 text-xs font-semibold text-success"
        >
          Todos presentes
        </button>
        <button
          onClick={todosAusentes}
          className="flex-1 rounded-control border border-danger bg-danger-soft px-3 py-2 text-xs font-semibold text-danger"
        >
          Todos ausentes
        </button>
      </div>

      <form ref={form} action={action} className="space-y-1">
        <input type="hidden" name="sessionId" value={sessionId} />
        {alumnos.map((a) => {
          const actual = estados.get(a.id) ?? "PRESENT";
          return (
            <div
              key={a.id}
              className="flex items-center justify-between gap-2 p-2 rounded-control border border-border bg-surface"
            >
              <span className="text-sm font-medium truncate">{a.nombre}</span>
              <div className="flex gap-0.5">
                {ESTADOS.map((e) => (
                  <button
                    key={e.value}
                    type="button"
                    onClick={() => setEstado(a.id, e.value)}
                    className={`flex-1 rounded-control border px-1.5 py-1.5 text-xs font-medium uppercase tracking-tighter ${
                      actual === e.value
                        ? `bg-primary text-primary-foreground border-primary`
                        : `${TONE_CLASS[e.tone]}`
                    }`}
                  >
                    {e.abbr}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
        <SubmitButton
          className="w-full rounded-control border border-primary bg-transparent px-4 py-3 text-sm font-semibold text-primary"
          pendingLabel="Guardando..."
        >
          Guardar asistencia
        </SubmitButton>
        {state?.error ? (
          <p className="mt-2 text-sm text-danger">{state.error}</p>
        ) : null}
      </form>
    </div>
  );
}
