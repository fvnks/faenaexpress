"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import {
  addMember,
  createMember,
  removeMember,
  updateMemberRole,
  type MemberFormState,
} from "@/app/actions/companies";
import { SelectDropdown } from "@/components/select-dropdown";
import { SubmitButton } from "@/components/submit-button";
import type { Role } from "@/generated/prisma/client";
import { roleLabel } from "@/lib/labels";
import { cardClass, controlClass, dangerButtonClass, fieldClass, labelClass, primaryButtonClass, secondaryButtonClass } from "@/lib/ui";
import { roleValues } from "@/lib/validation";

export type MemberForRow = {
  id: string;
  role: Role;
  inventoryAccess?: string;
  userId: string;
  userName: string;
  userEmail: string;
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
        <div className="font-medium">{membership.userName}</div>
        <div className="text-xs text-muted-foreground">{membership.userEmail}</div>
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
            <form action={removeMember}>
              <input type="hidden" name="membershipId" value={membership.id} />
              <button type="submit" className={dangerButtonClass + " py-1.5 text-sm"}>
                Quitar
              </button>
            </form>
          )}
        </div>
      ) : (
        <span className="text-sm text-muted-foreground">{roleLabel(membership.role)}</span>
      )}

      {state?.error ? <p className="w-full text-sm text-danger">{state.error}</p> : null}
    </li>
  );
}

export function AddMemberForm({
  companies = [],
}: {
  companies?: { id: string; name: string }[];
}) {
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
      {companies.length > 1 ? (
        <div className={fieldClass}>
          <label htmlFor="member-scope" className={labelClass}>
            Empresas visibles
          </label>
          <SelectDropdown
            id="member-scope"
            name="scope"
            value="esta"
            allowEmpty={false}
            options={[
              { value: "esta", label: "Solo esta empresa" },
              { value: "todas", label: `Todas mis empresas (${companies.length})` },
            ]}
          />
        </div>
      ) : null}
      <div className="flex items-center gap-3">
        <SubmitButton className={secondaryButtonClass} pendingLabel="Agregando...">
          Agregar
        </SubmitButton>
        {state?.error ? <span className="text-sm text-danger">{state.error}</span> : null}
      </div>
    </form>
  );
}

export function NewMemberForm({
  companies = [],
}: {
  companies?: { id: string; name: string }[];
}) {
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
      {companies.length > 1 ? (
        <div className={fieldClass}>
          <label htmlFor="new-user-scope" className={labelClass}>
            Empresas visibles
          </label>
          <SelectDropdown
            id="new-user-scope"
            name="scope"
            value="esta"
            allowEmpty={false}
            options={[
              { value: "esta", label: "Solo esta empresa" },
              { value: "todas", label: `Todas mis empresas (${companies.length})` },
            ]}
          />
        </div>
      ) : null}
      <div className="flex items-center gap-3">
        <SubmitButton className={primaryButtonClass} pendingLabel="Creando...">
          Crear usuario
        </SubmitButton>
        {state?.error ? <span className="text-sm text-danger">{state.error}</span> : null}
      </div>
    </form>
  );
}
