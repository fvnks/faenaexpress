"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";

import {
  confirmTwoFactor,
  regenerateRecoveryCodes,
  startTwoFactor,
  verifyTwoFactorCode,
  type TwoFactorState,
} from "@/app/actions/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatSecret } from "@/lib/totp";

/**
 * Pantalla del segundo factor. Tiene dos estados:
 *   - pendiente: hay que poner el código de la app (o uno de recuperación).
 *   - alta: hay que conectar la app y confirmar un código.
 */
export function TwoFactorForm({
  yaActivo,
  pendiente,
}: {
  yaActivo: boolean;
  /** La sesión está a medio camino: hay que confirmar el 2FA para entrar. */
  pendiente: boolean;
}) {
  const [verificar, verificarAction, verificarPending] = useActionState<TwoFactorState, FormData>(
    verifyTwoFactorCode,
    undefined,
  );
  const [alta, altaAction, altaPending] = useActionState<TwoFactorState, FormData>(
    startTwoFactor,
    undefined,
  );
  const [confirmar, confirmarAction, confirmarPending] = useActionState<TwoFactorState, FormData>(
    confirmTwoFactor,
    undefined,
  );
  const [recuperacion, recuperacionAction, recuperacionPending] = useActionState<TwoFactorState, FormData>(
    regenerateRecoveryCodes,
    undefined,
  );
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    if (confirmar?.recoveryCodes) {
      toast.success("Segundo factor activado");
    }
  }, [confirmar]);

  // Estado 1: confirmar el código para poder entrar. Solo si el 2FA ya está
  // activo: si no lo está, primero hay que conectarlo (estado 2).
  if (pendiente && yaActivo) {
    return (
      <form action={verificarAction} className="mt-8 flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="code-2fa"
            className="input-label"
          >
            Código de verificación
          </label>
          <Input
            id="code-2fa"
            name="code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            placeholder="000000"
            className="tabular tracking-[0.3em]"
          />
          <p className="input-hint">
            El código de tu app de autenticación, o uno de tus códigos de recuperación.
          </p>
        </div>
        {verificar?.error ? (
          <p className="rounded-[4px] border border-danger/50 bg-danger-soft px-3 py-2 text-sm text-danger">
            {verificar.error}
          </p>
        ) : null}
        <Button type="submit" disabled={verificarPending} className="w-full">
          {verificarPending ? "Verificando…" : "Verificar"}
        </Button>
      </form>
    );
  }

  // Estado 2: alta. La persona todavía no lo tenía (o lo está configuring
  // ahora). El texto depende de si la sesión está pendiente: si lo está, hay
  // que conectarlo para poder entrar.
  if (!yaActivo) {
    const secret = alta?.secret;
    return (
      <div className="mt-8 flex flex-col gap-6">
        {!secret ? (
          <form action={altaAction}>
            <input type="hidden" name="paso" value="generar" />
            <p className="text-sm text-muted-foreground">
              {pendiente
                ? "Conectá tu app de autenticación (Google Authenticator, 1Password, Authy…) para confirmar tu cuenta y entrar."
                : "Podés activar un segundo factor para proteger tu cuenta: te pedirán un código además de la contraseña."}
            </p>
            <Button type="submit" className="mt-4 w-full" disabled={altaPending}>
              {altaPending ? "Generando…" : "Generar mi código"}
            </Button>
          </form>
        ) : (
          <>
            <div className="rounded-[8px] border border-border bg-background p-4">
              <p className="text-sm font-medium">1. Agregá esta clave en tu app</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Copiá la clave y agrégala como una cuenta nueva de tipo «TOTP».
              </p>
              <code className="tabular mt-3 block break-all rounded-[4px] border border-border bg-surface px-3 py-2 text-sm">
                {formatSecret(secret)}
              </code>
              <button
                type="button"
                className="mt-2 text-xs text-primary underline underline-offset-2"
                onClick={() => {
                  navigator.clipboard.writeText(secret).then(() => {
                    setCopiado(true);
                    toast.success("Clave copiada");
                  });
                }}
              >
                {copiado ? "Copiada" : "Copiar la clave"}
              </button>
            </div>

            <form action={confirmarAction} className="flex flex-col gap-5">
              <p className="text-sm font-medium">2. Escribí el código que te muestra la app</p>
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="code-setup"
                  className="input-label"
                >
                  Código de verificación
                </label>
                <Input
                  id="code-setup"
                  name="code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  required
                  placeholder="000000"
                  className="tabular tracking-[0.3em]"
                />
              </div>
              {confirmar?.error ? (
                <p className="rounded-[4px] border border-danger/50 bg-danger-soft px-3 py-2 text-sm text-danger">
                  {confirmar.error}
                </p>
              ) : null}
              <Button type="submit" className="w-full" disabled={confirmarPending}>
                {confirmarPending ? "Activando…" : "Activar segundo factor"}
              </Button>
            </form>
          </>
        )}
      </div>
    );
  }

  // Estado 3: ya está activo. Se pueden reimprimir los códigos de recuperación.
  return (
    <div className="mt-8 flex flex-col gap-6">
      {recuperacion?.recoveryCodes ? (
        <div className="rounded-[8px] border border-accent/40 bg-accent-soft p-4">
          <p className="text-sm font-medium">Guárdalos ahora</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Cada uno sirve una sola vez, para entrar si perdés el teléfono. No los vas a volver a
            ver.
          </p>
          <ul className="tabular mt-3 grid gap-1 text-sm sm:grid-cols-2">
            {recuperacion.recoveryCodes.map((code) => (
              <li key={code}>{code}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {confirmar?.recoveryCodes ? (
        <div className="rounded-[8px] border border-accent/40 bg-accent-soft p-4">
          <p className="text-sm font-medium">Guárdalos ahora</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Cada uno sirve una sola vez, para entrar si perdés el teléfono. No los vas a volver a
            ver.
          </p>
          <ul className="tabular mt-3 grid gap-1 text-sm sm:grid-cols-2">
            {confirmar.recoveryCodes.map((code) => (
              <li key={code}>{code}</li>
            ))}
          </ul>
          <Link
            href="/facturas"
            className="mt-4 inline-block rounded-[4px] border border-primary bg-transparent px-5 py-2 text-sm font-semibold text-primary"
          >
            Continuar
          </Link>
        </div>
      ) : null}

      <div className="rounded-[8px] border border-border bg-background p-4">
        <p className="text-sm font-medium">Tu segundo factor está activo</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Te pedirán el código de la app cada vez que entres.
        </p>
      </div>

      <form action={recuperacionAction}>
        <input type="hidden" name="accion" value="recuperacion" />
        <Button type="submit" variant="secondary" disabled={recuperacionPending}>
          {recuperacionPending ? "Generando…" : "Generar códigos de recuperación nuevos"}
        </Button>
      </form>
    </div>
  );
}