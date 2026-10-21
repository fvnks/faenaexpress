"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";

import { createTeacher, type AttendanceFormState } from "@/app/actions/schools";
import { SubmitButton } from "@/components/submit-button";
import { controlClass, fieldClass, labelClass } from "@/lib/ui";

/** Alta de docente. */
export function TeacherForm() {
  const [state, action] = useActionState<AttendanceFormState, FormData>(createTeacher, undefined);
  const panel = useRef<HTMLDetailsElement>(null);
  const form = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state?.ok) return;
    toast.success("Docente agregado");
    if (panel.current) panel.current.open = false;
    form.current?.reset();
  }, [state]);

  return (
    <details ref={panel} className="w-full max-w-md">
      <summary className="cursor-pointer text-sm font-semibold text-primary">Nuevo docente</summary>

      <form ref={form} action={action} className="mt-3">
        <div className="flex flex-col gap-3">
          <div className={fieldClass}>
            <label htmlFor="teacherName" className={labelClass}>
              Nombre
            </label>
            <input id="teacherName" name="name" type="text" required className={controlClass} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className={fieldClass}>
              <label htmlFor="teacherRut" className={labelClass}>
                RUT
              </label>
              <input id="teacherRut" name="rut" type="text" placeholder="12.345.678-9" className={controlClass} />
            </div>
            <div className={fieldClass}>
              <label htmlFor="teacherPhone" className={labelClass}>
                Teléfono
              </label>
              <input id="teacherPhone" name="phone" type="text" className={controlClass} />
            </div>
          </div>

          <div className={fieldClass}>
            <label htmlFor="teacherEmail" className={labelClass}>
              Correo
            </label>
            <input id="teacherEmail" name="email" type="email" className={controlClass} />
          </div>

          {state?.error ? <p className="text-sm text-danger">{state.error}</p> : null}

          <SubmitButton
            className="self-start rounded-control border border-primary bg-transparent px-3 py-1.5 text-sm font-semibold text-primary"
            pendingLabel="Guardando..."
          >
            Agregar
          </SubmitButton>
        </div>
      </form>
    </details>
  );
}
