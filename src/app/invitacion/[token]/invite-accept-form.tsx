"use client";

import { useActionState } from "react";

import { acceptInvitation, type AcceptInvitationState } from "@/app/actions/accept-invitation";
import { SubmitButton } from "@/components/submit-button";

const inputClass =
  "h-11 w-full rounded-[10px] border border-border bg-background px-3.5 text-sm text-foreground transition-colors placeholder:text-muted-foreground/60 hover:border-muted-foreground/40 focus:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25";

/**
 * Formulario de aceptación de invitación.
 * Si el correo ya tiene cuenta, solo pide la contraseña actual (para confirmar identidad).
 * Si no, pide nombre + contraseña provisional (mínimo 8 caracteres).
 */
export function AcceptInvitationForm({
  token,
  existingUser,
  email,
}: {
  token: string;
  existingUser: boolean;
  email: string;
}) {
  const [state, action, pending] = useActionState<AcceptInvitationState, FormData>(
    acceptInvitation,
    undefined,
  );

  return (
    <form action={action} className="mt-8 flex flex-col gap-5">
      <input type="hidden" name="token" value={token} />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="invite-email-view" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Correo
        </label>
        <input
          id="invite-email-view"
          type="email"
          value={email}
          readOnly
          aria-readonly="true"
          className={inputClass + " cursor-default opacity-70"}
        />
        <p className="text-xs text-muted-foreground">El correo viene fijado por la invitación.</p>
      </div>

      {existingUser ? null : (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="invite-name" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Tu nombre
          </label>
          <input
            id="invite-name"
            name="name"
            type="text"
            required
            maxLength={120}
            autoComplete="name"
            className={inputClass}
          />
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="invite-password" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {existingUser ? "Tu contraseña actual" : "Contraseña provisional"}
        </label>
        <input
          id="invite-password"
          name="password"
          type="password"
          required
          minLength={existingUser ? 1 : 8}
          autoComplete={existingUser ? "current-password" : "new-password"}
          placeholder="••••••••"
          className={inputClass}
        />
        {existingUser ? null : (
          <p className="text-xs text-muted-foreground">
            Mínimo 8 caracteres. Te pediremos cambiarla la primera vez que entres.
          </p>
        )}
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
            Aceptando...
          </>
        ) : (
          "Aceptar invitación"
        )}
      </button>
    </form>
  );
}
