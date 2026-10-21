"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";

import { saveClassSession, type AttendanceFormState } from "@/app/actions/schools";
import { SubmitButton } from "@/components/submit-button";
import { controlClass, fieldClass, labelClass } from "@/lib/ui";

type Opcion = { id: string; nombre: string };

/**
 * Registro de una clase.
 *
 * Es el leccionario que pide la Circular N°30: qué se enseñó, qué se hizo y
 * con qué objetivo. La misma clase es la que después se marca la asistencia.
 */
export function ClassForm({
  cursos,
  asignaturas,
  docentes,
  hoy,
}: {
  cursos: Opcion[];
  asignaturas: Opcion[];
  docentes: Opcion[];
  hoy: string;
}) {
  const [state, action] = useActionState<AttendanceFormState, FormData>(
    saveClassSession,
    undefined,
  );
  const panel = useRef<HTMLDetailsElement>(null);
  const form = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state?.ok) return;
    toast.success("Clase registrada");
    if (panel.current) panel.current.open = false;
    form.current?.reset();
  }, [state]);

  if (cursos.length === 0 || asignaturas.length === 0 || docentes.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Para registrar una clase hacen falta un curso con su plan y los docentes. Eso se arma en
        Cursos y Docentes.
      </p>
    );
  }

  return (
    <details ref={panel} className="w-full">
      <summary className="cursor-pointer text-sm font-semibold text-primary">
        Registrar una clase
      </summary>

      <form ref={form} action={action} className="mt-3 flex flex-col gap-3">
        <div className="grid gap-3 sm:grid-cols-4">
          <div className={fieldClass}>
            <label htmlFor="classCourse" className={labelClass}>
              Curso
            </label>
            <select id="classCourse" name="courseId" className={controlClass} defaultValue="">
              <option value="">Elige…</option>
              {cursos.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>
          <div className={fieldClass}>
            <label htmlFor="classSubject" className={labelClass}>
              Asignatura
            </label>
            <select id="classSubject" name="subjectId" className={controlClass} defaultValue="">
              <option value="">Elige…</option>
              {asignaturas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre}
                </option>
              ))}
            </select>
          </div>
          <div className={fieldClass}>
            <label htmlFor="classTeacher" className={labelClass}>
              Docente
            </label>
            <select id="classTeacher" name="teacherId" className={controlClass} defaultValue="">
              <option value="">Elige…</option>
              {docentes.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nombre}
                </option>
              ))}
            </select>
          </div>
          <div className={fieldClass}>
            <label htmlFor="classDate" className={labelClass}>
              Fecha
            </label>
            <input
              id="classDate"
              name="date"
              type="text"
              data-date="1"
              pattern="^\d{2}-\d{2}(-\d{4})?$"
              placeholder="DD-MM-AAAA"
              defaultValue={hoy}
              className={controlClass}
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className={fieldClass}>
            <label htmlFor="classPeriod" className={labelClass}>
              Período
            </label>
            <input
              id="classPeriod"
              name="period"
              type="number"
              min={1}
              max={12}
              defaultValue={1}
              className={controlClass + " tabular"}
            />
          </div>
          <div className={fieldClass}>
            <label htmlFor="classStart" className={labelClass}>
              Desde
            </label>
            <input id="classStart" name="startTime" type="text" placeholder="08:30" className={controlClass} />
          </div>
          <div className={fieldClass}>
            <label htmlFor="classEnd" className={labelClass}>
              Hasta
            </label>
            <input id="classEnd" name="endTime" type="text" placeholder="09:30" className={controlClass} />
          </div>
        </div>

        <div className={fieldClass}>
          <label htmlFor="classContents" className={labelClass}>
            Contenidos
          </label>
          <textarea id="classContents" name="contents" rows={2} className={controlClass} />
        </div>
        <div className={fieldClass}>
          <label htmlFor="classActivities" className={labelClass}>
            Actividades
          </label>
          <textarea id="classActivities" name="activities" rows={2} className={controlClass} />
        </div>
        <div className={fieldClass}>
          <label htmlFor="classObjectives" className={labelClass}>
            Objetivos de aprendizaje
          </label>
          <textarea id="classObjectives" name="objectives" rows={2} className={controlClass} />
        </div>

        {state?.error ? <p className="text-sm text-danger">{state.error}</p> : null}

        <SubmitButton
          className="self-start rounded-control border border-primary bg-transparent px-3 py-1.5 text-sm font-semibold text-primary"
          pendingLabel="Guardando..."
        >
          Registrar clase
        </SubmitButton>
      </form>
    </details>
  );
}
