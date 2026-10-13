"use client";

import { useActionState } from "react";

import { login, type LoginState } from "@/app/actions/auth";

const inputClass =
  "h-11 w-full rounded-[10px] border border-border bg-background px-3.5 text-sm text-foreground transition-colors placeholder:text-muted-foreground/60 hover:border-muted-foreground/40 focus:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, undefined);

  return (
    <form action={action} className="mt-8 flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Correo
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="tu@empresa.cl"
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="••••••••"
          className={inputClass}
        />
      </div>

      <label className="flex cursor-pointer select-none items-center gap-2.5 text-sm text-muted-foreground">
        <input type="checkbox" name="remember" defaultChecked className="h-4 w-4 accent-primary" />
        Recuérdame en este equipo
      </label>

      {state?.error ? (
        <p
          role="alert"
          aria-live="polite"
          className="rounded-[10px] border border-danger/50 bg-danger-soft px-3 py-2 text-sm text-danger"
        >
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="btn-liquid btn-liquid-primary mt-1 flex h-12 w-full items-center justify-center gap-2 rounded-[10px] border border-primary bg-transparent text-sm font-semibold text-primary shadow-sm transition-all duration-200 hover:-translate-y-px hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
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
      </button>
    </form>
  );
}
