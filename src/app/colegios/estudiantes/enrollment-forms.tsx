"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";

import {
  enrollStudent,
  moveStudent,
  saveStudent,
  withdrawStudent,
  type EnrollmentFormState,
} from "@/app/actions/school-enrollment";
import { FaltaEsto } from "@/app/colegios/falta-esto";
import { Disclosure } from "@/components/disclosure";
import { SubmitButton } from "@/components/submit-button";
import { controlClass, fieldClass, labelClass } from "@/lib/ui";

type Opcion = { id: string; nombre: string };

/**
 * Matrícula de un alumno nuevo.
 *
 * Alta y matrícula en un solo paso: el colegio no quiere guardar a alguien
 * «pendiente de curso», porque un alumno sin curso no tiene asistencia ni
 * notas.
 */
export function EnrollForm({ cursos }: { cursos: Opcion[] }) {
  const [state, action] = useActionState<EnrollmentFormState, FormData>(
    saveStudent,
    undefined,
  );
  const panel = useRef<HTMLDetailsElement>(null);
  const form = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state?.ok) return;
    toast.success("Alumno matriculado");
    if (panel.current) panel.current.open = false;
    form.current?.reset();
  }, [state]);

  if (cursos.length === 0) {
    return (
      <FaltaEsto href="/colegios/cursos" accion="Ir a Cursos">
        Primero hay que crear los cursos del colegio.
      </FaltaEsto>
    );
  }

  return (
    <Disclosure label="Matricular alumno" panelRef={panel} className="w-full max-w-md">
      <form ref={form} action={action} className="mt-3">
        <div className="flex flex-col gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className={fieldClass}>
              <label htmlFor="studentFirstName" className={labelClass}>
                Nombre
              </label>
              <input id="studentFirstName" name="firstName" type="text" required className={controlClass} />
            </div>
            <div className={fieldClass}>
              <label htmlFor="studentLastName" className={labelClass}>
                Apellido
              </label>
              <input id="studentLastName" name="lastName" type="text" required className={controlClass} />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className={fieldClass}>
              <label htmlFor="studentRut" className={labelClass}>
                RUT
              </label>
              <input id="studentRut" name="rut" type="text" placeholder="22.111.111-3" className={controlClass} />
            </div>
            <div className={fieldClass}>
              <label htmlFor="studentBirth" className={labelClass}>
                Fecha de nacimiento
              </label>
              <input
                id="studentBirth"
                name="birthDate"
                type="text"
                data-date="1"
                pattern="^\d{2}-\d{2}-\d{4}$"
                placeholder="DD-MM-AAAA"
                className={controlClass}
              />
            </div>
          </div>

          <div className={fieldClass}>
            <label htmlFor="studentCourse" className={labelClass}>
              Curso
            </label>
            <select id="studentCourse" name="courseId" className={controlClass} defaultValue="">
              <option value="">Elige…</option>
              {cursos.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>

          {state?.error ? <p className="text-sm text-danger">{state.error}</p> : null}

          <SubmitButton
            className="self-start rounded-control border border-primary bg-transparent px-3 py-1.5 text-sm font-semibold text-primary"
            pendingLabel="Guardando..."
          >
            Matricular
          </SubmitButton>
        </div>
      </form>
    </Disclosure>
  );
}

/**
 * Traslado: el alumno cambia de curso.
 *
 * El curso anterior queda en el historial del alumno con su motivo, para que
 * la asistencia y las notas de lo que ya cursó no se pierdan.
 */
export function MoveStudentForm({
  studentId,
  nombre,
  cursos,
  cursoActual,
}: {
  studentId: string;
  nombre: string;
  cursos: Opcion[];
  cursoActual: string | null;
}) {
  const [state, action] = useActionState<EnrollmentFormState, FormData>(
    moveStudent,
    undefined,
  );
  const panel = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    if (state?.ok) toast.success("Traslado registrado");
  }, [state]);

  if (!cursoActual || cursos.length < 2) return null;

  return (
    <Disclosure label="Trasladar de curso" panelRef={panel} tone="secondary" className="w-full max-w-md">
      <form action={action} className="mt-3">
        <input type="hidden" name="studentId" value={studentId} />
        <input type="hidden" name="fromCourseId" value={cursoActual} />
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            {nombre} pasa del curso actual a otro. La matrícula anterior queda en su historial.
          </p>

          <div className={fieldClass}>
            <label htmlFor={`moveCourse-${studentId}`} className={labelClass}>
              Curso de destino
            </label>
            <select
              id={`moveCourse-${studentId}`}
              name="toCourseId"
              className={controlClass}
              defaultValue=""
            >
              <option value="">Elige…</option>
              {cursos
                .filter((c) => c.id !== cursoActual)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
            </select>
          </div>

          <div className={fieldClass}>
            <label htmlFor={`moveReason-${studentId}`} className={labelClass}>
              Motivo
            </label>
            <input
              id={`moveReason-${studentId}`}
              name="reason"
              type="text"
              placeholder="Cambio de nivel, traslado familiar…"
              className={controlClass}
            />
          </div>

          {state?.error ? <p className="text-sm text-danger">{state.error}</p> : null}

          <SubmitButton
            className="self-start rounded-control border border-primary bg-transparent px-3 py-1.5 text-sm font-semibold text-primary"
            pendingLabel="Guardando..."
          >
            Registrar traslado
          </SubmitButton>
        </div>
      </form>
    </Disclosure>
  );
}

/**
 * Retiro: el alumno se va.
 *
 * Es una acción que no se puede deshacer desde la pantalla (se puede volver a
 * matricular, pero el retiro queda en el historial), así que pide el motivo.
 */
export function WithdrawStudentForm({
  studentId,
  nombre,
  cursoActual,
}: {
  studentId: string;
  nombre: string;
  cursoActual: string | null;
}) {
  const [state, action] = useActionState<EnrollmentFormState, FormData>(
    withdrawStudent,
    undefined,
  );
  const panel = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    if (state?.ok) toast.success("Retiro registrado");
  }, [state]);

  if (!cursoActual) return null;

  return (
    <Disclosure label="Retirar del curso" panelRef={panel} tone="danger" className="w-full max-w-md">
      <form action={action} className="mt-3">
        <input type="hidden" name="studentId" value={studentId} />
        <input type="hidden" name="courseId" value={cursoActual} />
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            {nombre} deja el curso. La matrícula queda cerrada con su motivo y fecha.
          </p>

          <div className={fieldClass}>
            <label htmlFor={`withdrawReason-${studentId}`} className={labelClass}>
              Motivo
            </label>
            <input
              id={`withdrawReason-${studentId}`}
              name="reason"
              type="text"
              placeholder="Mudanza, traslado a otro colegio…"
              className={controlClass}
            />
          </div>

          {state?.error ? <p className="text-sm text-danger">{state.error}</p> : null}

          <SubmitButton
            className="self-start rounded-control border border-danger bg-transparent px-3 py-1.5 text-sm font-semibold text-danger"
            pendingLabel="Guardando..."
          >
            Registrar retiro
          </SubmitButton>
        </div>
      </form>
    </Disclosure>
  );
}

/** Matricula a un alumno que ya está en el colegio en otro curso. */
export function EnrollExistingForm({
  alumnos,
  cursos,
}: {
  alumnos: Opcion[];
  cursos: Opcion[];
}) {
  const [state, action] = useActionState<EnrollmentFormState, FormData>(
    enrollStudent,
    undefined,
  );
  const panel = useRef<HTMLDetailsElement>(null);
  const form = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state?.ok) return;
    toast.success("Alumno matriculado");
    if (panel.current) panel.current.open = false;
    form.current?.reset();
  }, [state]);

  if (alumnos.length === 0 || cursos.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {alumnos.length === 0
          ? "No hay alumnos todavía: primero se matricula a alguien."
          : "No hay cursos todavía: primero hay que crearlos."}
      </p>
    );
  }

  return (
    <Disclosure
      label="Matricular un alumno que ya está aquí"
      panelRef={panel}
      tone="secondary"
      className="w-full max-w-md"
    >
      <form ref={form} action={action} className="mt-3">
        <div className="flex flex-col gap-3">
          <div className={fieldClass}>
            <label htmlFor="enrollStudent" className={labelClass}>
              Alumno
            </label>
            <select id="enrollStudent" name="studentId" className={controlClass} defaultValue="">
              <option value="">Elige…</option>
              {alumnos.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className={fieldClass}>
            <label htmlFor="enrollCourse" className={labelClass}>
              Curso
            </label>
            <select id="enrollCourse" name="courseId" className={controlClass} defaultValue="">
              <option value="">Elige…</option>
              {cursos.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>

          {state?.error ? <p className="text-sm text-danger">{state.error}</p> : null}

          <SubmitButton
            className="self-start rounded-control border border-primary bg-transparent px-3 py-1.5 text-sm font-semibold text-primary"
            pendingLabel="Guardando..."
          >
            Matricular
          </SubmitButton>
        </div>
      </form>
    </Disclosure>
  );
}
