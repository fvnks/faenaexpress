"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";

import {
  closeOtherSessions,
  disableMyTwoFactor,
  regenerateRecoveryCodes,
  type TwoFactorState,
} from "@/app/actions/profile";
import { SubmitButton } from "@/components/submit-button";
import { controlClass, labelClass } from "@/lib/ui";

/**
 * Sección del segundo factor dentro del perfil.
 *
 * Activarlo es opcional; desactivarlo pide la contraseña, para que nadie
 * pueda dejar la cuenta desprotegida con el celular en la mano.
 */
export function TwoFactorSettings({ activo }: { activo: boolean }) {
  const [state, action] = useActionState<TwoFactorState, FormData>(
    disableMyTwoFactor,
    undefined,
  );
  const [recuperacion, recuperarAction] = useActionState<TwoFactorState, FormData>(
    regenerateRecoveryCodes,
    undefined,
  );
  const [desactivando, setDesactivando] = useState(false);

  useEffect(() => {
    if (state?.ok) toast.success("Segundo factor desactivado");
  }, [state]);

  useEffect(() => {
    if (recuperacion?.ok) toast.success("Códigos de recuperación nuevos");
  }, [recuperacion]);

  return (
    <div className="flex flex-col gap-3">
      {recuperacion?.recoveryCodes ? (
        <div className="rounded-[10px] border border-primary/40 bg-primary-soft px-3 py-2">
          <p className="text-sm font-medium text-primary">
            Códigos de recuperación (se muestran una sola vez):
          </p>
          <ul className="mt-1 grid grid-cols-2 gap-x-3 font-mono text-xs text-foreground">
            {recuperacion.recoveryCodes.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {activo ? (
        <>
          <p className="text-sm text-muted-foreground">
            Tu cuenta pide un código de tu teléfono además de la contraseña. Si pierdes el celular,
            usa uno de los códigos de recuperación.
          </p>

          <div className="flex flex-wrap items-center gap-4">
            <form action={recuperarAction}>
              <input type="hidden" name="accion" value="recuperacion" />
              <button
                type="submit"
                className="text-sm text-primary underline-offset-2 hover:underline"
              >
                Generar códigos de recuperación nuevos
              </button>
            </form>

            <button
              type="button"
              onClick={() => setDesactivando((v) => !v)}
              className="text-sm text-muted-foreground underline underline-offset-2 hover:text-danger"
            >
              Desactivar el segundo factor
            </button>
          </div>

          {desactivando ? (
            <form action={action} className="flex max-w-xs flex-col gap-2">
              <label htmlFor="disable2faPassword" className={labelClass}>
                Tu contraseña
              </label>
              <input
                id="disable2faPassword"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                className={controlClass}
              />
              {state?.error ? <p className="text-sm text-danger">{state.error}</p> : null}
              <SubmitButton
                className="self-start rounded-control border border-danger bg-transparent px-3 py-1.5 text-sm font-semibold text-danger"
                pendingLabel="Desactivando..."
              >
                Desactivar
              </SubmitButton>
            </form>
          ) : null}
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          Tu cuenta está protegida solo con la contraseña. Si querés agregar un segundo factor,{" "}
          <a href="/perfil/2fa" className="text-primary underline-offset-2 hover:underline">
            actívalo aquí
          </a>
          .
        </p>
      )}
    </div>
  );
}

/** Cierra las otras sesiones abiertas de la cuenta. */
export function CloseSessionsButton({ otras }: { otras: number }) {
  const [state, action] = useActionState<TwoFactorState, FormData>(
    closeOtherSessions,
    undefined,
  );

  useEffect(() => {
    if (state?.ok) toast.success("Se cerraron las otras sesiones");
  }, [state]);

  if (otras === 0) {
    return <p className="text-sm text-muted-foreground">Solo hay esta sesión abierta.</p>;
  }

  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="accion" value="cerrar-sesiones" />
      <p className="text-sm text-muted-foreground">
        Hay {otras} {otras === 1 ? "sesión abierta" : "sesiones abiertas"} aparte de esta.
      </p>
      <SubmitButton
        className="self-start rounded-control border border-border px-3 py-1.5 text-sm hover:bg-background"
        pendingLabel="Cerrando..."
      >
        Cerrar las otras sesiones
      </SubmitButton>
    </form>
  );
}
