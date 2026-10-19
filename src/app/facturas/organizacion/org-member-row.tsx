"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import { setOrgMemberActive, setOrgRole, type MemberFormState } from "@/app/actions/companies";
import { SelectDropdown } from "@/components/select-dropdown";
import { orgRoleLabel } from "@/lib/labels";
import { secondaryButtonClass } from "@/lib/ui";
import { orgRoleValues } from "@/lib/validation";

export type OrgMemberForRow = {
  id: string;
  userId: string;
  orgRole: string;
  canSwitchCompanies: boolean;
  active: boolean;
  userName: string;
  userEmail: string;
};

// Roles de organización asignables desde la UI. BILLING existe en el schema pero
// se reserva para los planes: no se ofrece todavía.
const ASSIGNABLE_ORG_ROLES = ["OWNER", "ADMIN", "MEMBER"] as const;

export function OrgMemberRow({
  canManage,
  canToggleSwitch,
  isSelf,
  isLastOwner,
  member,
  toggleSwitchAction,
}: {
  /** Puede cambiar el rol de organización (OWNER). */
  canManage: boolean;
  /** Puede otorgar el permiso de revisar todas las empresas (OWNER). */
  canToggleSwitch: boolean;
  isSelf: boolean;
  /** Es el único dueño activo: no se le puede bajar el rol ni desactivar. */
  isLastOwner: boolean;
  member: OrgMemberForRow;
  toggleSwitchAction: (formData: FormData) => void;
}) {
  const [state, action] = useActionState<MemberFormState, FormData>(setOrgRole, undefined);

  useEffect(() => {
    if (state?.ok) toast.success("Rol de organización actualizado");
  }, [state]);

  const roleOptions = orgRoleValues
    .filter((role) => ASSIGNABLE_ORG_ROLES.includes(role as (typeof ASSIGNABLE_ORG_ROLES)[number]))
    .map((role) => ({ value: role, label: orgRoleLabel(role) }));

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 py-3">
      <div className="min-w-[12rem]">
        <div className="flex items-center gap-2 font-medium">
          {member.userName}
          {isSelf ? <span className="text-xs text-muted-foreground">(tú)</span> : null}
          {!member.active ? (
            <span className="rounded-full bg-surface px-2 py-0.5 text-xs text-muted-foreground">
              Inactivo
            </span>
          ) : null}
        </div>
        <div className="text-xs text-muted-foreground">{member.userEmail}</div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {canManage && member.active ? (
          <form action={action} className="flex items-center gap-2">
            <input type="hidden" name="userId" value={member.userId} />
            <label htmlFor={`org-role-${member.id}`} className="sr-only">
              Rol de organización
            </label>
            <SelectDropdown
              id={`org-role-${member.id}`}
              name="orgRole"
              value={member.orgRole}
              allowEmpty={false}
              options={roleOptions}
              className="w-auto"
              disabled={isLastOwner}
            />
            <button
              type="submit"
              disabled={isLastOwner}
              className={secondaryButtonClass + " py-1.5 text-sm"}
            >
              Guardar
            </button>
          </form>
        ) : (
          <span className="text-sm text-muted-foreground">{orgRoleLabel(member.orgRole)}</span>
        )}

        {member.active ? (
          canToggleSwitch ? (
            <form action={toggleSwitchAction}>
              <input type="hidden" name="userId" value={member.userId} />
              <button
                type="submit"
                className={secondaryButtonClass + " py-1.5 text-sm"}
                title={
                  member.canSwitchCompanies
                    ? "Quitar el permiso de revisar todas las empresas"
                    : "Permitir revisar todas las empresas"
                }
              >
                {member.canSwitchCompanies ? "Quitar revisión" : "Permitir revisión"}
              </button>
            </form>
          ) : (
            <span className="text-xs text-muted-foreground">
              {member.canSwitchCompanies ? "Puede revisar empresas" : "Solo sus empresas"}
            </span>
          )
        ) : null}

        {canManage && !isSelf ? (
          <form action={setOrgMemberActive}>
            <input type="hidden" name="userId" value={member.userId} />
            <input type="hidden" name="active" value={member.active ? "false" : "true"} />
            <button
              type="submit"
              disabled={isLastOwner}
              className={secondaryButtonClass + " py-1.5 text-sm"}
            >
              {member.active ? "Desactivar" : "Reactivar"}
            </button>
          </form>
        ) : null}
      </div>

      {state?.error ? <p className="w-full text-sm text-danger">{state.error}</p> : null}
      {isLastOwner ? (
        <p className="w-full text-xs text-muted-foreground">
          Es el único dueño activo: primero asigna otro dueño para poder cambiar su rol.
        </p>
      ) : null}
    </li>
  );
}
