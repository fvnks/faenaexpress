"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { inviteTeamMember, type TeamFormState } from "@/app/actions/school-team";
import { Disclosure } from "@/components/disclosure";
import { SubmitButton } from "@/components/submit-button";
import { controlClass, fieldClass, labelClass } from "@/lib/ui";

type Opcion = { id: string; nombre: string };

const ROLES = [
  { value: "DIRECTOR", label: "Dirección" },
  { value: "UTP", label: "Jefatura de estudios" },
  { value: "ADMIN", label: "Administración" },
  { value: "TEACHER", label: "Docente" },
  { value: "STAFF", label: "Funcionario" },
  { value: "VIEWER", label: "Solo lectura" },
];

/**
 * Sumar a alguien al equipo del colegio.
 *
 * La contraseña provisional solo hace falta si la persona no tiene cuenta: si
 * ya tiene una, se lo suma al colegio sin tocar su clave. El formulario lo
 * dice, porque una pantalla que pide un dato que no va a usar hace perder
 * tiempo.
 */
export function TeamForm({ docentes }: { docentes: Opcion[] }) {
  const [state, action] = useActionState<TeamFormState, FormData>(inviteTeamMember, undefined);
  const [rol, setRol] = useState("VIEWER");
  const [ultimoResultado, setUltimoResultado] = useState<TeamFormState | undefined>(undefined);
  const panel = useRef<HTMLDetailsElement>(null);
  const form = useRef<HTMLFormElement>(null);

  // El rol vuelve al inicial cuando la acción termina bien. Se ajusta durante
  // el render y no en un efecto: el estado depende del resultado de la acción,
  // no de nada externo.
  if (state !== ultimoResultado) {
    setUltimoResultado(state);
    if (state?.ok) setRol("VIEWER");
  }

  useEffect(() => {
    if (!state?.ok) return;
    toast.success("Persona sumada al equipo");
    if (panel.current) panel.current.open = false;
    form.current?.reset();
  }, [state]);

  const esDocente = rol === "TEACHER";

  return (
    <Disclosure label="Sumar a alguien al equipo" panelRef={panel} className="w-full max-w-xl">
      <form ref={form} action={action} className="mt-3">
        <div className="flex flex-col gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className={fieldClass}>
              <label htmlFor="teamName" className={labelClass}>
                Nombre
              </label>
              <input id="teamName" name="nombre" type="text" required className={controlClass} />
            </div>

            <div className={fieldClass}>
              <label htmlFor="teamEmail" className={labelClass}>
                Correo
              </label>
              <input id="teamEmail" name="email" type="email" required className={controlClass} />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className={fieldClass}>
              <label htmlFor="teamRole" className={labelClass}>
                Rol
              </label>
              <select
                id="teamRole"
                name="role"
                className={controlClass}
                value={rol}
                onChange={(e) => setRol(e.target.value)}
              >
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            <div className={fieldClass}>
              <label htmlFor="teamPassword" className={labelClass}>
                Contraseña provisional
              </label>
              <input
                id="teamPassword"
                name="password"
                type="text"
                minLength={8}
                className={controlClass}
                placeholder={esDocente ? "Mínimo 8 caracteres" : "Mínimo 8 caracteres"}
              />
              <p className="text-xs text-muted-foreground">
                Se usa solo si la persona no tiene cuenta. Si ya tiene, se lo suma al colegio sin
                tocar su clave.
              </p>
            </div>
          </div>

          {esDocente ? (
            <div className={fieldClass}>
              <label htmlFor="teamTeacher" className={labelClass}>
                Ficha de docente
              </label>
              <select id="teamTeacher" name="docenteId" className={controlClass} defaultValue="">
                <option value="">Elige…</option>
                {docentes.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nombre}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                La ficha dice qué cursos imparte. Sin ella, el sistema no puede saber a qué clases y
                notas corresponde la persona.
              </p>
            </div>
          ) : null}

          {state?.error ? <p className="text-sm text-danger">{state.error}</p> : null}

          <SubmitButton
            className="self-start rounded-control border border-primary bg-transparent px-3 py-1.5 text-sm font-semibold text-primary"
            pendingLabel="Guardando..."
          >
            Sumar al equipo
          </SubmitButton>
        </div>
      </form>
    </Disclosure>
  );
}
