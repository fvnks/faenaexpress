"use client";

import { useActionState } from "react";

import { changePassword, type ChangePasswordState } from "@/app/actions/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ChangePasswordForm({ obligatorio }: { obligatorio: boolean }) {
  const [state, action, pending] = useActionState<ChangePasswordState, FormData>(
    changePassword,
    undefined,
  );

  return (
    <form action={action} className="mt-8 flex flex-col gap-5">
      {obligatorio ? null : (
        <Input
          label="Contraseña actual"
          id="pw-current"
          name="current"
          type="password"
          required
          autoComplete="current-password"
        />
      )}

      <Input
        label="Contraseña nueva"
        id="pw-next"
        name="next"
        type="password"
        required
        minLength={8}
        autoComplete="new-password"
        placeholder="••••••••"
        hint="Mínimo 8 caracteres."
      />

      <Input
        label="Repítela"
        id="pw-repeat"
        name="repeat"
        type="password"
        required
        minLength={8}
        autoComplete="new-password"
        placeholder="••••••••"
      />

      {state?.error ? (
        <p
          role="alert"
          aria-live="polite"
          className="rounded-[4px] border border-danger/50 bg-danger-soft px-3 py-2 text-sm text-danger"
        >
          {state.error}
        </p>
      ) : null}
      {state?.ok ? (
        <p
          role="status"
          className="rounded-[8px] border border-primary/40 bg-primary-soft px-3 py-2 text-sm text-primary"
        >
          Contraseña actualizada. Puedes entrar al panel.
        </p>
      ) : null}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? (
          <>
            <span
              className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
              aria-hidden="true"
            />
            Guardando...
          </>
        ) : (
          "Guardar contraseña"
        )}
      </Button>
    </form>
  );
}