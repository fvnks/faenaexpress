"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import {
  addMember,
  createMember,
  setMemberSectionAccess,
  setMembershipActive,
  updateMemberRole,
  type MemberFormState,
} from "@/app/actions/companies";
import { SelectDropdown } from "@/components/select-dropdown";
import { SectionAccessForm } from "@/components/section-access-form";
import { SubmitButton } from "@/components/submit-button";
import type { Role } from "@/generated/prisma/client";
import { roleLabel } from "@/lib/labels";
import { cardClass, controlClass, fieldClass, labelClass, primaryButtonClass, secondaryButtonClass } from "@/lib/ui";
import { roleValues } from "@/lib/validation";

export type MemberForRow = {
  id: string;
  role: Role;
  inventoryAccess?: string;
  /** Excepciones por sección de esta persona. */
  sectionAccess?: Record<string, string> | null;
  userId: string;
  userName: string;
  userEmail: string;
  active: boolean;
  /** Es el único ADMIN activo de la empresa: no se le puede bajar de rol ni desactivar. */
  isLastAdmin: boolean;
};

function RoleOptions() {
  return roleValues.map((value) => ({ value, label: roleLabel(value) }));
}

export function MemberRow({
  canManage,
  isSelf,
  membership,
}: {
  canManage: boolean;
  isSelf: boolean;
  membership: MemberForRow;
}) {
  const [state, action] = useActionState<MemberFormState, FormData>(updateMemberRole, undefined);

  useEffect(() => {
    if (state?.ok) toast.success("Rol actualizado");
  }, [state]);

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 py-3">
      <div className="min-w-[12rem]">
        <div className="flex items-center gap-2 font-medium">
          {membership.userName}
          {!membership.active ? (
            <span className="rounded-full bg-surface px-2 py-0.5 text-xs text-muted-foreground">
              Inactivo
            </span>
          ) : null}
        </div>
        <div className="text-xs text-muted-foreground">{membership.userEmail}</div>
        {canManage ? (
          <details className="mt-1">
            <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
              Permisos por sección
            </summary>
            <SectionAccessForm
              action={setMemberSectionAccess}
              membershipId={membership.id}
              role={membership.role}
              sectionAccess={membership.sectionAccess}
            />
          </details>
        ) : null}
      </div>

      {canManage ? (
        <div className="flex flex-wrap items-center gap-2">
          <form action={action} className="flex items-center gap-2">
            <input type="hidden" name="membershipId" value={membership.id} />
            <label htmlFor={`role-${membership.id}`} className="sr-only">
              Rol
            </label>
            <SelectDropdown
              id={`role-${membership.id}`}
              name="role"
              value={membership.role}
              allowEmpty={false}
              options={RoleOptions()}
              className="w-auto"
            />
            <SelectDropdown
              id={`inv-${membership.id}`}
              name="inventoryAccess"
              value={membership.inventoryAccess ?? "NONE"}
              allowEmpty={false}
              options={[
                { value: "NONE", label: "Sin acceso" },
                { value: "VIEW", label: "Ver" },
                { value: "EDIT", label: "Editar" },
              ]}
              className="w-auto"
            />
            <button type="submit" className={secondaryButtonClass + " py-1.5 text-sm"}>
              Guardar
            </button>
          </form>

          {isSelf ? null : (
            <>
              <form action={setMembershipActive}>
                <input type="hidden" name="membershipId" value={membership.id} />
                <input type="hidden" name="active" value={membership.active ? "false" : "true"} />
                <button
                  type="submit"
                  disabled={membership.isLastAdmin && membership.active}
                  className={secondaryButtonClass + " py-1.5 text-sm"}
                  title={
                    membership.active
                      ? "Quitar el acceso de esta persona a la empresa"
                      : "Devolver el acceso a la empresa"
                  }
                >
                  {membership.active ? "Desactivar" : "Reactivar"}
                </button>
              </form>
            </>
          )}
        </div>
      ) : (
        <span className="text-sm text-muted-foreground">{roleLabel(membership.role)}</span>
      )}

      {state?.error ? <p className="w-full text-sm text-danger">{state.error}</p> : null}
    </li>
  );
}

export function AddMemberForm() {
  const [state, action] = useActionState<MemberFormState, FormData>(addMember, undefined);

  useEffect(() => {
    if (state?.ok) toast.success("Usuario agregado a la empresa");
  }, [state]);

  return (
    <form action={action} className="flex flex-col gap-3">
      <div className={fieldClass}>
        <label htmlFor="member-email" className={labelClass}>
          Correo del usuario
        </label>
        <input id="member-email" name="email" type="email" required className={controlClass} />
      </div>
      <div className={fieldClass}>
        <label htmlFor="member-role" className={labelClass}>
          Rol
        </label>
        <SelectDropdown id="member-role" name="role" value="VIEWER" allowEmpty={false} options={RoleOptions()} />
      </div>
      <div className={fieldClass}>
        <label htmlFor="member-inventory" className={labelClass}>
          Acceso a inventario
        </label>
        <SelectDropdown
          id="member-inventory"
          name="inventoryAccess"
          value="NONE"
          allowEmpty={false}
          options={[
            { value: "NONE", label: "Sin acceso" },
            { value: "VIEW", label: "Ver" },
            { value: "EDIT", label: "Editar" },
          ]}
        />
      </div>
      <div className="flex items-center gap-3">
        <SubmitButton className={secondaryButtonClass} pendingLabel="Agregando...">
          Agregar
        </SubmitButton>
        {state?.error ? <span className="text-sm text-danger">{state.error}</span> : null}
      </div>
    </form>
  );
}

export function NewMemberForm() {
  const [state, action] = useActionState<MemberFormState, FormData>(createMember, undefined);

  useEffect(() => {
    if (state?.ok) toast.success("Usuario creado");
  }, [state]);

  return (
    <form action={action} className={cardClass + " flex flex-col gap-3 p-4"}>
      <div className={fieldClass}>
        <label htmlFor="new-user-name" className={labelClass}>
          Nombre
        </label>
        <input id="new-user-name" name="name" required maxLength={120} className={controlClass} />
      </div>
      <div className={fieldClass}>
        <label htmlFor="new-user-email" className={labelClass}>
          Correo
        </label>
        <input id="new-user-email" name="email" type="email" required className={controlClass} />
      </div>
      <div className={fieldClass}>
        <label htmlFor="new-user-password" className={labelClass}>
          Contraseña provisional
        </label>
        <input
          id="new-user-password"
          name="password"
          type="password"
          required
          minLength={8}
          className={controlClass}
        />
      </div>
      <div className={fieldClass}>
        <label htmlFor="new-user-role" className={labelClass}>
          Rol
        </label>
        <SelectDropdown id="new-user-role" name="role" value="VIEWER" allowEmpty={false} options={RoleOptions()} />
      </div>
      <div className={fieldClass}>
        <label htmlFor="new-user-inventory" className={labelClass}>
          Acceso a inventario
        </label>
        <SelectDropdown
          id="new-user-inventory"
          name="inventoryAccess"
          value="NONE"
          allowEmpty={false}
          options={[
            { value: "NONE", label: "Sin acceso" },
            { value: "VIEW", label: "Ver" },
            { value: "EDIT", label: "Editar" },
          ]}
        />
      </div>
      <div className="flex items-center gap-3">
        <SubmitButton className={primaryButtonClass} pendingLabel="Creando...">
          Crear usuario
        </SubmitButton>
        {state?.error ? <span className="text-sm text-danger">{state.error}</span> : null}
      </div>
    </form>
  );
}
