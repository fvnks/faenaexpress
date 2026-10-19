"use client";

import { useActionState } from "react";

import { changePassword, type ChangePasswordState } from "@/app/actions/profile";

const inputClass =
  "h-11 w-full rounded-[10px] border border-border bg-background px-3.5 text-sm text-foreground transition-colors placeholder:text-muted-foreground/60 hover:border-muted-foreground/40 focus:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25";

export function ChangePasswordForm({ obligatorio }: { obligatorio: boolean }) {
  const [state, action, pending] = useActionState<ChangePasswordState, FormData>(
    changePassword,
    undefined,
  );

  return (
    <form action={action} className="mt-8 flex flex-col gap-5">
      {obligatorio ? null : (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="pw-current" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Contraseña actual
          </label>
          <input
            id="pw-current"
            name="current"
            type="password"
            required
            autoComplete="current-password"
            className={inputClass}
          />
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="pw-next" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Contraseña nueva
        </label>
        <input
          id="pw-next"
          name="next"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          placeholder="••••••••"
          className={inputClass}
        />
        <p className="text-xs text-muted-foreground">Mínimo 8 caracteres.</p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="pw-repeat" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Repítela
        </label>
        <input
          id="pw-repeat"
          name="repeat"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          placeholder="••••••••"
          className={inputClass}
        />
      </div>

      {state?.error ? (
        <p
          role="alert"
          aria-live="polite"
          className="rounded-[10px] border border-danger/50 bg-danger-soft px-3 py-2 text-sm text-danger"
        >
          {state.error}
        </p>
      ) : null}
      {state?.ok ? (
        <p
          role="status"
          className="rounded-[10px] border border-primary/40 bg-primary-soft px-3 py-2 text-sm text-primary"
        >
          Contraseña actualizada. Puedes entrar al panel.
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
            Guardando...
          </>
        ) : (
          "Guardar contraseña"
        )}
      </button>
    </form>
  );
}
