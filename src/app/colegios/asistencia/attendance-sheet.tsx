"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import { saveAttendance, type AttendanceFormState } from "@/app/actions/schools";
import { SubmitButton } from "@/components/submit-button";

const ESTADOS = [
  { value: "PRESENT", label: "Presente" },
  { value: "LATE", label: "Atraso" },
  { value: "ABSENT", label: "Ausente" },
  { value: "JUSTIFIED", label: "Justificada" },
  { value: "EXCUSED", label: "Eximido" },
] as const;

type Alumno = {
  id: string;
  nombre: string;
  estado: string;
  nota: string;
};

/**
 * Hoja de asistencia de una clase. Es la pantalla del docente: marca, guarda y
 * queda el registro de quién lo hizo.
 */
export function AttendanceSheet({
  sessionId,
  alumnos,
  puedeEditar,
}: {
  sessionId: string;
  alumnos: Alumno[];
  puedeEditar: boolean;
}) {
  const [state, action, pending] = useActionState<AttendanceFormState, FormData>(
    saveAttendance,
    undefined,
  );

  useEffect(() => {
    if (state?.ok) toast.success("Asistencia guardada");
  }, [state]);

  if (alumnos.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No hay alumnos matriculados en este curso.
      </p>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="sessionId" value={sessionId} />

      <ul className="divide-y divide-border">
        {alumnos.map((alumno, i) => (
          <li key={alumno.id} className="flex flex-wrap items-center gap-3 py-2.5">
            <input type="hidden" name="studentId" value={alumno.id} />
            <span className="min-w-40 flex-1 text-sm font-medium">{alumno.nombre}</span>

            <label className="sr-only" htmlFor={`estado-${alumno.id}`}>
              Estado de {alumno.nombre}
            </label>
            <select
              id={`estado-${alumno.id}`}
              name="estado"
              defaultValue={alumno.estado}
              disabled={!puedeEditar}
              className="rounded-control border border-border bg-surface px-2.5 py-1.5 text-sm text-foreground disabled:opacity-60"
            >
              {ESTADOS.map((e) => (
                <option key={e.value} value={e.value}>
                  {e.label}
                </option>
              ))}
            </select>

            <label className="sr-only" htmlFor={`nota-${alumno.id}`}>
              Observación de {alumno.nombre}
            </label>
            <input
              id={`nota-${alumno.id}`}
              name="nota"
              type="text"
              defaultValue={alumno.nota}
              disabled={!puedeEditar}
              placeholder="Justificativo"
              className="min-w-40 flex-1 rounded-control border border-border bg-surface px-2.5 py-1.5 text-sm text-foreground disabled:opacity-60"
            />
          </li>
        ))}
      </ul>

      {state?.error ? <p className="text-sm text-danger">{state.error}</p> : null}

      {puedeEditar ? (
        <SubmitButton
          className="self-start rounded-control border border-primary bg-transparent px-4 py-2 text-sm font-semibold text-primary"
          pendingLabel="Guardando..."
        >
          Guardar asistencia
        </SubmitButton>
      ) : (
        <p className="text-sm text-muted-foreground">
          Tu rol puede ver la asistencia, pero no registrarla.
        </p>
      )}
      <span className="sr-only" aria-live="polite">
        {pending ? "Guardando" : ""}
      </span>
    </form>
  );
}
