"use client";

import { useActionState } from "react";

import { login, type LoginState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, undefined);

  return (
    <form action={action} className="mt-8 flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="input-label">
          Correo
        </label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="tu@empresa.cl"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="input-label">
          Contraseña
        </label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="••••••••"
        />
      </div>

      <label className="flex cursor-pointer select-none items-center gap-2.5 text-sm text-muted-foreground">
        <input type="checkbox" name="remember" defaultChecked className="h-4 w-4 accent-primary rounded-[4px] border-border" />
        Recuérdame en este equipo
      </label>

      {state?.error ? (
        <p
          role="alert"
          aria-live="polite"
          className="rounded-[4px] border border-danger/50 bg-danger-soft px-3 py-2 text-sm text-danger"
        >
          {state.error}
        </p>
      ) : null}

      <Button
        type="submit"
        disabled={pending}
        size="md"
        className="w-full"
      >
        {pending ? (
          <>
            <span
              className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
              aria-hidden="true"
            />
            Entrando...
          </>
        ) : (
          "Entrar"
        )}
      </Button>
    </form>
  );
}