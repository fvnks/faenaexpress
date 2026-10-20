"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";

import {
  inviteExistingUser,
  resetUserTwoFactor,
  setPlatformUserActive,
  type PlatformActionState,
} from "@/app/actions/platform";
import { SubmitButton } from "@/components/submit-button";
import { controlClass, labelClass, secondaryButtonClass } from "@/lib/ui";

// Restablecer el segundo factor: para cuando el cliente perdió el teléfono.
// Deja a la persona sin 2FA, así que hay que avisarla.
export function ResetTwoFactorForm({
  userId,
  userName,
  enabled,
}: {
  userId: string;
  userName: string;
  enabled: boolean;
}) {
  const [state, action, pending] = useActionState<PlatformActionState, FormData>(
    resetUserTwoFactor,
    undefined,
  );

  useEffect(() => {
    if (state?.ok) toast.success(`Segundo factor de ${userName} restablecido`);
  }, [state, userName]);

  if (!enabled) {
    return <p className="text-sm text-muted-foreground">No tiene segundo factor activo.</p>;
  }

  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="userId" value={userId} />
      <SubmitButton
        className="rounded-control border border-border bg-transparent px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground disabled:opacity-60"
        pendingLabel="Restableciendo..."
      >
        Restablecer su segundo factor
      </SubmitButton>
      {state?.error ? <p className="w-full text-xs text-danger">{state.error}</p> : null}
      <span className="sr-only" aria-live="polite">
        {pending ? "Restableciendo" : ""}
      </span>
    </form>
  );
}

// Desactivar la cuenta: el usuario deja de entrar a cualquier cuenta, pero
// conserva su trazabilidad. No se borra nunca.
export function ToggleUserActiveForm({
  userId,
  userName,
  active,
}: {
  userId: string;
  userName: string;
  active: boolean;
}) {
  const [state, action, pending] = useActionState<PlatformActionState, FormData>(
    setPlatformUserActive,
    undefined,
  );

  useEffect(() => {
    if (state?.ok) toast.success(active ? "Cuenta reactivada" : "Cuenta desactivada");
  }, [state, active]);

  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="active" value={active ? "false" : "true"} />
      <SubmitButton
        className={
          (active
            ? "rounded-control border border-danger bg-transparent px-3 py-1.5 text-xs text-danger"
            : secondaryButtonClass + " py-1.5 text-xs") + " disabled:opacity-60"
        }
        pendingLabel="Guardando..."
      >
        {active ? `Desactivar la cuenta de ${userName}` : "Reactivar la cuenta"}
      </SubmitButton>
      {state?.error ? <p className="w-full text-xs text-danger">{state.error}</p> : null}
      <span className="sr-only" aria-live="polite">
        {pending ? "Guardando" : ""}
      </span>
    </form>
  );
}

// Añadir a otra cuenta. Se genera un enlace: la persona lo abre y entra. Nadie
// se auto-asigna un rol.
export function InviteExistingUserForm({
  userId,
  userEmail,
  organizations,
}: {
  userId: string;
  userEmail: string;
  organizations: { id: string; name: string; companies: { id: string; name: string }[] }[];
}) {
  const [state, action, pending] = useActionState<PlatformActionState, FormData>(
    inviteExistingUser,
    undefined,
  );
  const [organizationId, setOrganizationId] = useState(organizations[0]?.id ?? "");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (state?.ok && state.url) toast.success("Invitación creada");
  }, [state]);

  if (organizations.length === 0) {
    return <p className="text-sm text-muted-foreground">No hay otras cuentas.</p>;
  }

  const org = organizations.find((o) => o.id === organizationId);

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="userId" value={userId} />

      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-52 flex-1">
          <label htmlFor="invite-existing-org" className={labelClass}>
            Cuenta
          </label>
          <select
            id="invite-existing-org"
            name="organizationId"
            value={organizationId}
            onChange={(e) => setOrganizationId(e.target.value)}
            className={controlClass}
          >
            {organizations.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="invite-existing-role" className={labelClass}>
            Rol en la empresa
          </label>
          <select id="invite-existing-role" name="role" defaultValue="VIEWER" className={controlClass}>
            <option value="ADMIN">Administrador</option>
            <option value="ACCOUNTANT">Contabilidad</option>
            <option value="SALES">Ventas</option>
            <option value="VIEWER">Solo lectura</option>
          </select>
        </div>
        <div>
          <label htmlFor="invite-existing-company" className={labelClass}>
            Empresa
          </label>
          <select id="invite-existing-company" name="companyId" defaultValue="" className={controlClass}>
            <option value="">Todas las empresas</option>
            {(org?.companies ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <SubmitButton className={secondaryButtonClass} pendingLabel="Generando...">
          Generar invitación
        </SubmitButton>
      </div>

      {state?.error ? <p className="text-sm text-danger">{state.error}</p> : null}
      {state?.url ? (
        <div className="flex flex-wrap items-center gap-2 rounded-control border border-border bg-background px-3 py-2">
          <code className="min-w-0 flex-1 truncate text-xs">{state.url}</code>
          <button
            type="button"
            className={secondaryButtonClass + " py-1 text-xs"}
            onClick={() => {
              navigator.clipboard.writeText(state.url as string).then(() => {
                setCopied(true);
                toast.success("Enlace copiado");
              });
            }}
          >
            {copied ? "Copiado" : "Copiar"}
          </button>
        </div>
      ) : null}
      <p className="text-xs text-muted-foreground">
        El enlace vence en 72 horas. Al abrirlo, {userEmail} entra a la cuenta.
      </p>
      <span className="sr-only" aria-live="polite">
        {pending ? "Generando" : ""}
      </span>
    </form>
  );
}
