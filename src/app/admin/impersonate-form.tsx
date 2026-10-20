"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import { startImpersonation, type PlatformActionState } from "@/app/actions/platform";
import { SubmitButton } from "@/components/submit-button";
import { controlClass, labelClass, secondaryButtonClass } from "@/lib/ui";

// Entrar a la cuenta del cliente. Es la acción más delicada de la consola:
// por eso pide un motivo (queda escrito para el cliente) y siempre queda
// registrada.
export function ImpersonateForm({
  organizationId,
  candidates,
}: {
  organizationId: string;
  /** Usuarios de la organización a los que se puede entrar: dueño y admins. */
  candidates: { id: string; name: string; email: string; orgRole: string }[];
}) {
  const [state, action, pending] = useActionState<PlatformActionState, FormData>(
    startImpersonation,
    undefined,
  );

  useEffect(() => {
    if (state?.ok) toast.success("Dentro de la cuenta del cliente");
  }, [state]);

  if (candidates.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Esta cuenta no tiene un dueño ni administradores activos: no hay con quién entrar.
      </p>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="organizationId" value={organizationId} />

      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-56 flex-1">
          <label htmlFor="impersonate-user" className={labelClass}>
            Entrar como
          </label>
          <select id="impersonate-user" name="targetUserId" className={controlClass} required>
            {candidates.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.email}) · {c.orgRole}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-56 flex-1">
          <label htmlFor="impersonate-reason" className={labelClass}>
            Motivo
          </label>
          <input
            id="impersonate-reason"
            name="reason"
            type="text"
            maxLength={300}
            placeholder="El cliente no ve sus ventas"
            className={controlClass}
          />
        </div>
        <SubmitButton className={secondaryButtonClass} pendingLabel="Entrando...">
          Entrar a la cuenta
        </SubmitButton>
      </div>

      <p className="text-xs text-muted-foreground">
        La sesión dura 30 minutos como máximo, con banner permanente y salida a un clic. No se
        pueden eliminar empresas, exportar datos, cambiar contraseñas ni ver RRHH. Queda registrado
        en la auditoría y el dueño de la cuenta lo puede ver.
      </p>

      {state?.error ? <p className="text-sm text-danger">{state.error}</p> : null}
      <span className="sr-only" aria-live="polite">
        {pending ? "Entrando" : ""}
      </span>
    </form>
  );
}
