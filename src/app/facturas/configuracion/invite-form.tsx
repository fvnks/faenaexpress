"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import { generateInvitation, type GenerateInvitationState } from "@/app/actions/invitations";
import { SubmitButton } from "@/components/submit-button";
import { SelectDropdown } from "@/components/select-dropdown";
import { controlClass, fieldClass, labelClass } from "@/lib/ui";
import { roleValues } from "@/lib/validation";
import { roleLabel } from "@/lib/labels";

export function InviteForm({
  companies,
  canInviteAll = true,
}: {
  companies: { id: string; name: string }[];
  /** Solo el OWNER puede invitar a toda la organización (sin empresa destino). */
  canInviteAll?: boolean;
}) {
  const [state, action, pending] = useActionState<GenerateInvitationState, FormData>(
    generateInvitation,
    { error: undefined, ok: undefined, url: undefined },
  );

  useEffect(() => {
    if (state?.ok && state.url) {
      navigator.clipboard?.writeText(state.url).catch(() => null);
      toast.success("Enlace copiado al portapapeles");
    }
  }, [state]);

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className={fieldClass}>
        <label htmlFor="invite-email" className={labelClass}>
          Correo del invitado
        </label>
        <input
          id="invite-email"
          name="email"
          type="email"
          required
          placeholder="usuario@empresa.cl"
          className={controlClass}
        />
      </div>

      <div className={fieldClass}>
        <label htmlFor="invite-role" className={labelClass}>
          Rol
        </label>
        <SelectDropdown
          id="invite-role"
          name="role"
          value="VIEWER"
          allowEmpty={false}
          options={roleValues.map((r) => ({ value: r, label: roleLabel(r) }))}
        />
      </div>

      {companies.length > 1 ? (
        <div className={fieldClass}>
          <label htmlFor="invite-company" className={labelClass}>
            Destino
          </label>
          <SelectDropdown
            id="invite-company"
            name="companyId"
            value={canInviteAll ? "" : (companies[0]?.id ?? "")}
            allowEmpty={canInviteAll}
            emptyLabel="Todas las empresas"
            options={companies.map((c) => ({ value: c.id, label: c.name }))}
          />
          {!canInviteAll ? (
            <p className="mt-1 text-xs text-muted-foreground">
              El invitado queda con acceso solo a la empresa elegida. Invitar a toda la
              organización lo hace el dueño.
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="flex items-center gap-3">
        <SubmitButton className="btn-liquid btn-liquid-primary rounded-[10px] py-2 text-sm" pendingLabel="Generando...">
          Generar enlace
        </SubmitButton>
        {state?.error ? <span className="text-sm text-danger">{state.error}</span> : null}
      </div>
    </form>
  );
}