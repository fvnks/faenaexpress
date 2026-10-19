"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import {
  clearDefontanaCredentialsAction,
  saveDefontanaCredentialsAction,
  type DefontanaCredentialsState,
} from "@/app/actions/defontana";
import { SubmitButton } from "@/components/submit-button";
import { controlClass, fieldClass, labelClass, primaryButtonClass } from "@/lib/ui";

export function DefontanaCredentialsForm({
  defaultEmail,
  storedEmail,
  hasCredentials,
  keyConfigured,
}: {
  defaultEmail: string;
  storedEmail: string | null;
  hasCredentials: boolean;
  keyConfigured: boolean;
}) {
  const [state, action] = useActionState<DefontanaCredentialsState, FormData>(
    saveDefontanaCredentialsAction,
    undefined,
  );

  useEffect(() => {
    if (state?.ok) toast.success("Credenciales de Defontana guardadas");
  }, [state]);

  return (
    <div className="mt-4 flex flex-col gap-3">
      {hasCredentials ? (
        <div className="flex flex-wrap items-center gap-2 rounded-control border border-success/40 bg-success-soft px-3 py-2 text-sm text-success">
          <span className="h-2 w-2 rounded-full bg-success" aria-hidden="true" />
          <span>
            Cuenta conectada: <strong>{storedEmail}</strong>
          </span>
          <form action={clearDefontanaCredentialsAction} className="ml-auto">
            <SubmitButton
              pendingLabel="Borrando…"
              className="text-xs underline-offset-2 hover:underline"
            >
              Borrar credenciales
            </SubmitButton>
          </form>
        </div>
      ) : (
        <p className="rounded-control border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
          Sin credenciales: para traer el XML de una factura de compra hay que subirlo a mano desde
          Importar.
        </p>
      )}

      <form
        action={action}
        className="grid gap-3 rounded-card border border-border bg-background p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
      >
        <div className={fieldClass}>
          <label htmlFor="defontana-cred-email" className={labelClass}>
            Correo de la cuenta
          </label>
          <input
            id="defontana-cred-email"
            name="email"
            type="email"
            required
            maxLength={120}
            defaultValue={storedEmail ?? defaultEmail}
            placeholder="nombre@empresa.cl"
            className={controlClass}
          />
        </div>
        <div className={fieldClass}>
          <label htmlFor="defontana-cred-clave" className={labelClass}>
            Clave
          </label>
          <input
            id="defontana-cred-clave"
            name="clave"
            type="password"
            required
            autoComplete="new-password"
            placeholder="••••••••"
            className={controlClass}
          />
        </div>
        <SubmitButton
          pendingLabel="Verificando…"
          disabled={!keyConfigured}
          className={primaryButtonClass + " h-10"}
        >
          Guardar y probar
        </SubmitButton>

        <p className="text-xs text-muted-foreground sm:col-span-3">
          Quedan guardadas cifradas (AES-256-GCM con <code>SII_SECRET_KEY</code>) solo para esta
          empresa. Al guardar se prueba el login contra Defontana y se verifica que la cuenta entre a
          esta empresa; si no, no se guarda nada.
        </p>
        {!keyConfigured ? (
          <p role="alert" className="text-xs text-danger sm:col-span-3">
            Falta <code>SII_SECRET_KEY</code> en el entorno: define una llave para poder guardar las
            credenciales.
          </p>
        ) : null}
        {state?.error ? (
          <p role="alert" className="text-sm text-danger sm:col-span-3">
            {state.error}
          </p>
        ) : null}
      </form>
    </div>
  );
}
