"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import { addPlatformStaff, updatePlatformStaff, type PlatformActionState } from "@/app/actions/platform";
import { SubmitButton } from "@/components/submit-button";
import { controlClass, labelClass, secondaryButtonClass } from "@/lib/ui";

const LEVELS = [
  { value: "SUPPORT", label: "Soporte (solo lee)" },
  { value: "OPERATOR", label: "Operador (actúa)" },
  { value: "OWNER", label: "Dueño (todo)" },
];

export function AddStaffForm() {
  const [state, action, pending] = useActionState<PlatformActionState, FormData>(
    addPlatformStaff,
    undefined,
  );

  useEffect(() => {
    if (state?.ok) toast.success("Acceso de plataforma actualizado");
  }, [state]);

  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <div className="min-w-56 flex-1">
        <label htmlFor="staff-email" className={labelClass}>
          Correo del usuario
        </label>
        <input
          id="staff-email"
          name="email"
          type="email"
          required
          placeholder="tu@yellow-erp.cl"
          className={controlClass}
        />
      </div>
      <div>
        <label htmlFor="staff-level" className={labelClass}>
          Nivel
        </label>
        <select id="staff-level" name="level" defaultValue="SUPPORT" className={controlClass}>
          {LEVELS.map((l) => (
            <option key={l.value} value={l.value}>
              {l.label}
            </option>
          ))}
        </select>
      </div>
      <SubmitButton className={secondaryButtonClass} pendingLabel="Agregando...">
        Agregar al equipo
      </SubmitButton>
      {state?.error ? <p className="w-full text-sm text-danger">{state.error}</p> : null}
      <span className="sr-only" aria-live="polite">
        {pending ? "Agregando" : ""}
      </span>
    </form>
  );
}

// Nivel y suspensión son dos formularios independientes: no se pueden anidar
// (HTML inválido) y cada uno necesita su propio estado de error.
export function StaffRowForm({
  userId,
  level,
  active,
  isSelf,
}: {
  userId: string;
  level: string;
  active: boolean;
  isSelf: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <StaffLevelForm userId={userId} level={level} active={active} />
      {!isSelf ? <StaffSuspendForm userId={userId} active={active} /> : null}
    </div>
  );
}

function StaffLevelForm({
  userId,
  level,
  active,
}: {
  userId: string;
  level: string;
  active: boolean;
}) {
  const [state, action, pending] = useActionState<PlatformActionState, FormData>(
    updatePlatformStaff,
    undefined,
  );

  useEffect(() => {
    if (state?.ok) toast.success("Nivel actualizado");
  }, [state]);

  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="userId" value={userId} />
      <select
        name="level"
        defaultValue={level}
        aria-label="Nivel de plataforma"
        className={controlClass + " w-auto"}
      >
        {LEVELS.map((l) => (
          <option key={l.value} value={l.value}>
            {l.label}
          </option>
        ))}
      </select>
      <input type="hidden" name="active" value={active ? "true" : "false"} />
      <SubmitButton className={secondaryButtonClass + " py-1.5 text-xs"} pendingLabel="...">
        Guardar
      </SubmitButton>
      {state?.error ? <p className="w-full text-xs text-danger">{state.error}</p> : null}
      <span className="sr-only" aria-live="polite">
        {pending ? "Guardando" : ""}
      </span>
    </form>
  );
}

function StaffSuspendForm({ userId, active }: { userId: string; active: boolean }) {
  const [state, action, pending] = useActionState<PlatformActionState, FormData>(
    updatePlatformStaff,
    undefined,
  );

  useEffect(() => {
    if (state?.ok) toast.success(active ? "Acceso suspendido" : "Acceso reactivado");
  }, [state, active]);

  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="active" value={active ? "false" : "true"} />
      <SubmitButton
        className="rounded-control border border-border bg-transparent px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-60"
        pendingLabel="..."
      >
        {active ? "Suspender" : "Reactivar"}
      </SubmitButton>
      {state?.error ? <p className="w-full text-xs text-danger">{state.error}</p> : null}
      <span className="sr-only" aria-live="polite">
        {pending ? "Procesando" : ""}
      </span>
    </form>
  );
}
