"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import {
  clearSiiCredentials,
  saveSiiCredentials,
  type SiiCredentialsState,
} from "@/app/actions/sii";
import { SubmitButton } from "@/components/submit-button";
import { formatRut } from "@/lib/rut";
import { controlClass, fieldClass, labelClass, primaryButtonClass } from "@/lib/ui";

export function SiiCredentialsForm({
  defaultRut,
  storedRut,
  hasCredentials,
  keyConfigured,
}: {
  defaultRut: string;
  storedRut: string | null;
  hasCredentials: boolean;
  keyConfigured: boolean;
}) {
  const [state, action] = useActionState<SiiCredentialsState, FormData>(saveSiiCredentials, undefined);

  useEffect(() => {
    if (state?.ok) toast.success("Credenciales del SII guardadas");
  }, [state]);

  return (
    <div className="mt-4 flex flex-col gap-3">
      {hasCredentials ? (
        <div className="flex flex-wrap items-center gap-2 rounded-control border border-success/40 bg-success-soft px-3 py-2 text-sm text-success">
          <span className="h-2 w-2 rounded-full bg-success" aria-hidden="true" />
          <span>
            Credenciales guardadas para <strong className="tabular">{formatRut(storedRut ?? "")}</strong>
          </span>
          <form action={clearSiiCredentials} className="ml-auto">
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
          Esta empresa todavía no tiene credenciales guardadas: el login del SII se hace a mano
          desde Importar.
        </p>
      )}

      <form
        action={action}
        className="grid gap-3 rounded-card border border-border bg-background p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
      >
        <div className={fieldClass}>
          <label htmlFor="sii-cred-rut" className={labelClass}>
            RUT de la cuenta
          </label>
          <input
            id="sii-cred-rut"
            name="rut"
            required
            maxLength={12}
            defaultValue={storedRut ?? defaultRut}
            placeholder="77.115.357-7"
            className={controlClass + " tabular"}
          />
        </div>
        <div className={fieldClass}>
          <label htmlFor="sii-cred-clave" className={labelClass}>
            Clave Tributaria
          </label>
          <input
            id="sii-cred-clave"
            name="clave"
            type="password"
            required={!hasCredentials}
            autoComplete="new-password"
            placeholder={hasCredentials ? "Vacía = mantener la actual" : "••••••••"}
            className={controlClass}
          />
        </div>
        <SubmitButton
          pendingLabel="Guardando…"
          disabled={!keyConfigured}
          className={primaryButtonClass + " h-10"}
        >
          Guardar credenciales
        </SubmitButton>

        <p className="text-xs text-muted-foreground sm:col-span-3">
          Quedan guardadas cifradas (AES-256-GCM con <code>SII_SECRET_KEY</code>) solo para esta
          empresa, y permiten iniciar sesión en el SII con un clic desde Importar. Nunca se muestran
          en pantalla ni se registran en la auditoría.
        </p>
        <p className="text-xs text-muted-foreground sm:col-span-3">
          Para el Registro de Compras y Ventas sirve la Clave de la empresa. Para el portal de
          facturación del SII, de donde salen los XML, el SII exige además que la cuenta figure como
          usuario autorizado de la empresa en ese sistema (es una lista aparte del RCV): con esa
          cuenta el RCV se consulta igual, a nombre de la empresa.
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
