"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";

import {
  assignSubject,
  createCourse,
  createSubject,
  removeAssignment,
  type AttendanceFormState,
} from "@/app/actions/schools";
import { FaltaEsto } from "@/app/colegios/falta-esto";
import { Disclosure } from "@/components/disclosure";
import { SubmitButton } from "@/components/submit-button";
import { controlClass, fieldClass, labelClass } from "@/lib/ui";

const NIVELES = [
  { value: "PARVULARIA", label: "Parvularia" },
  { value: "PREBASICA", label: "Pre-básica" },
  { value: "BASICA", label: "Básica" },
  { value: "MEDIA", label: "Media" },
  { value: "TECNICO", label: "Técnico-profesional" },
] as const;

type Opcion = { id: string; nombre: string };

/** Alta de curso. */
export function CourseForm({ anio }: { anio: number }) {
  const [state, action] = useActionState<AttendanceFormState, FormData>(createCourse, undefined);
  const panel = useRef<HTMLDetailsElement>(null);
  const form = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state?.ok) return;
    toast.success("Curso creado");
    if (panel.current) panel.current.open = false;
    form.current?.reset();
  }, [state]);

  return (
    <Disclosure label="Nuevo curso" panelRef={panel} className="w-full max-w-md">
      <form ref={form} action={action} className="mt-3">
        <div className="flex flex-col gap-3">
          <div className={fieldClass}>
            <label htmlFor="courseName" className={labelClass}>
              Nombre
            </label>
            <input
              id="courseName"
              name="name"
              type="text"
              required
              placeholder="3°Básico"
              className={controlClass}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className={fieldClass}>
              <label htmlFor="courseYear" className={labelClass}>
                Año
              </label>
              <input
                id="courseYear"
                name="year"
                type="number"
                min={2000}
                max={2100}
                defaultValue={anio}
                className={controlClass + " tabular"}
              />
            </div>
            <div className={fieldClass}>
              <label htmlFor="courseLevel" className={labelClass}>
                Nivel
              </label>
              <select id="courseLevel" name="level" defaultValue="BASICA" className={controlClass}>
                {NIVELES.map((n) => (
                  <option key={n.value} value={n.value}>
                    {n.label}
                  </option>
                ))}
              </select>
            </div>
            <div className={fieldClass}>
              <label htmlFor="courseSection" className={labelClass}>
                Letra
              </label>
              <input id="courseSection" name="section" type="text" placeholder="A" className={controlClass} />
            </div>
          </div>

          {state?.error ? <p className="text-sm text-danger">{state.error}</p> : null}

          <SubmitButton
            className="self-start rounded-control border border-primary bg-transparent px-3 py-1.5 text-sm font-semibold text-primary"
            pendingLabel="Guardando..."
          >
            Crear
          </SubmitButton>
        </div>
      </form>
    </Disclosure>
  );
}

/** Alta de asignatura del plan de estudios. */
export function SubjectForm() {
  const [state, action] = useActionState<AttendanceFormState, FormData>(createSubject, undefined);
  const panel = useRef<HTMLDetailsElement>(null);
  const form = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state?.ok) return;
    toast.success("Asignatura creada");
    if (panel.current) panel.current.open = false;
    form.current?.reset();
  }, [state]);

  return (
    <Disclosure label="Nueva asignatura" panelRef={panel} className="w-full max-w-md">
      <form ref={form} action={action} className="mt-3">
        <div className="flex flex-col gap-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className={fieldClass}>
              <label htmlFor="subjectCode" className={labelClass}>
                Código
              </label>
              <input
                id="subjectCode"
                name="code"
                type="text"
                required
                placeholder="MAT"
                className={controlClass}
              />
            </div>
            <div className="fieldClass col-span-2">
              <label htmlFor="subjectName" className={labelClass}>
                Nombre
              </label>
              <input
                id="subjectName"
                name="name"
                type="text"
                required
                placeholder="Matemática"
                className={controlClass}
              />
            </div>
          </div>

          {state?.error ? <p className="text-sm text-danger">{state.error}</p> : null}

          <SubmitButton
            className="self-start rounded-control border border-primary bg-transparent px-3 py-1.5 text-sm font-semibold text-primary"
            pendingLabel="Guardando..."
          >
            Crear
          </SubmitButton>
        </div>
      </form>
    </Disclosure>
  );
}

/**
 * Asigna una asignatura a un curso con su docente.
 *
 * El plan del curso es lo que después sostiene las clases, las notas y el
 * promedio final: sin asignación no hay nada que calificar.
 */
export function AssignmentForm({
  courseId,
  asignaturas,
  docentes,
}: {
  courseId: string;
  asignaturas: Opcion[];
  docentes: Opcion[];
}) {
  const [state, action] = useActionState<AttendanceFormState, FormData>(
    assignSubject,
    undefined,
  );
  const panel = useRef<HTMLDetailsElement>(null);
  const form = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state?.ok) return;
    toast.success("Asignatura agregada al curso");
    if (panel.current) panel.current.open = false;
    form.current?.reset();
  }, [state]);

  if (asignaturas.length === 0 || docentes.length === 0) {
    return asignaturas.length === 0 ? (
      <FaltaEsto href="/colegios/cursos" accion="Crear las asignaturas del plan">
        Primero hay que crear las asignaturas del plan.
      </FaltaEsto>
    ) : (
      <FaltaEsto href="/colegios/docentes" accion="Registrar a los docentes">
        Primero hay que registrar a los docentes.
      </FaltaEsto>
    );
  }

  return (
    <Disclosure label="Asignar asignatura" panelRef={panel} className="w-full">
      <form ref={form} action={action} className="mt-3">
        <input type="hidden" name="courseId" value={courseId} />
        <div className="flex flex-col gap-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className={fieldClass}>
              <label htmlFor={`assignSubject-${courseId}`} className={labelClass}>
                Asignatura
              </label>
              <select
                id={`assignSubject-${courseId}`}
                name="subjectId"
                className={controlClass}
                defaultValue=""
              >
                <option value="">Elige…</option>
                {asignaturas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className={fieldClass}>
              <label htmlFor={`assignTeacher-${courseId}`} className={labelClass}>
                Docente
              </label>
              <select
                id={`assignTeacher-${courseId}`}
                name="teacherId"
                className={controlClass}
                defaultValue=""
              >
                <option value="">Elige…</option>
                {docentes.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className={fieldClass}>
              <label htmlFor={`assignHours-${courseId}`} className={labelClass}>
                Horas/semana
              </label>
              <input
                id={`assignHours-${courseId}`}
                name="weeklyHours"
                type="number"
                min={0}
                max={40}
                defaultValue={0}
                className={controlClass + " tabular"}
              />
            </div>
          </div>

          {state?.error ? <p className="text-sm text-danger">{state.error}</p> : null}

          <SubmitButton
            className="self-start rounded-control border border-primary bg-transparent px-3 py-1.5 text-sm font-semibold text-primary"
            pendingLabel="Guardando..."
          >
            Asignar
          </SubmitButton>
        </div>
      </form>
    </Disclosure>
  );
}

/** Quita una asignación del plan del curso. */
export function RemoveAssignmentButton({
  assignmentId,
  nombre,
}: {
  assignmentId: string;
  nombre: string;
}) {
  const [state, action] = useActionState<AttendanceFormState, FormData>(
    removeAssignment,
    undefined,
  );

  useEffect(() => {
    if (state?.ok) toast.success("Asignatura quitada del curso");
  }, [state]);

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <form action={action} className="inline">
        <input type="hidden" name="assignmentId" value={assignmentId} />
        <button
          type="submit"
          className="text-xs text-muted-foreground underline underline-offset-2 hover:text-danger"
          title={`Quitar ${nombre} del curso`}
        >
          Quitar
        </button>
      </form>
      {state?.error ? <span className="text-xs text-danger">{state.error}</span> : null}
    </span>
  );
}
