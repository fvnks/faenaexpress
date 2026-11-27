"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  agregarMiembroObra,
  cambiarEstadoMiembroObra,
  cambiarRolObra,
} from "@/app/actions/obra-equipo";
import { SubmitButton } from "@/components/submit-button";
import { OBRA_ROLES, OBRA_ROLE_LABELS } from "@/lib/obra-permissions";
import { controlClass, primaryButtonClass, secondaryButtonClass } from "@/lib/ui";

function useFeedback() {
  const router = useRouter();
  return (state: { ok?: boolean; error?: string; message?: string } | undefined) => {
    if (state?.ok) {
      toast.success(state.message ?? "Cambio guardado.");
      router.refresh();
    }
    if (state?.error) toast.error(state.error);
  };
}

export function AgregarMiembroForm({
  usuarios,
}: {
  usuarios: Array<{ id: string; name: string; email: string }>;
}) {
  const feedback = useFeedback();
  const [state, action] = useActionState(agregarMiembroObra, undefined);
  useEffect(() => feedback(state), [state]); // eslint-disable-line react-hooks/exhaustive-deps

  if (usuarios.length === 0) {
    return <p className="text-sm text-muted-foreground">No hay usuarios disponibles para agregar.</p>;
  }

  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <select name="userId" required className={controlClass + " max-w-xs"}>
        <option value="">Selecciona una persona…</option>
        {usuarios.map((usuario) => (
          <option key={usuario.id} value={usuario.id}>{usuario.name} · {usuario.email}</option>
        ))}
      </select>
      <select name="role" defaultValue="VISUALIZADOR" className={controlClass + " w-48"}>
        {OBRA_ROLES.map((rol) => <option key={rol} value={rol}>{OBRA_ROLE_LABELS[rol]}</option>)}
      </select>
      <SubmitButton pendingLabel="Agregando…" className={primaryButtonClass}>Agregar al equipo</SubmitButton>
      {state?.error ? <p className="w-full text-xs text-danger">{state.error}</p> : null}
    </form>
  );
}

export function RolMiembroForm({ id, role }: { id: string; role: string }) {
  const feedback = useFeedback();
  const [state, action] = useActionState(cambiarRolObra, undefined);
  useEffect(() => feedback(state), [state]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <select name="role" defaultValue={role} className={controlClass + " w-44"}>
        {OBRA_ROLES.map((rol) => <option key={rol} value={rol}>{OBRA_ROLE_LABELS[rol]}</option>)}
      </select>
      <SubmitButton pendingLabel="…" className={secondaryButtonClass + " px-3 py-1 text-xs"}>Guardar</SubmitButton>
      {state?.error ? <span className="text-xs text-danger">{state.error}</span> : null}
    </form>
  );
}

export function EstadoMiembroForm({ id, active }: { id: string; active: boolean }) {
  const feedback = useFeedback();
  const [state, action] = useActionState(cambiarEstadoMiembroObra, undefined);
  useEffect(() => feedback(state), [state]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="activo" value={active ? "false" : "true"} />
      <SubmitButton pendingLabel="…" className={secondaryButtonClass + " px-3 py-1 text-xs"}>
        {active ? "Desactivar" : "Activar"}
      </SubmitButton>
      {state?.error ? <span className="block text-xs text-danger">{state.error}</span> : null}
    </form>
  );
}
