"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import { createInvitationFromAdmin, createOrganizationFromAdmin, type PlatformActionState } from "@/app/actions/platform";
import { SubmitButton } from "@/components/submit-button";
import { controlClass, labelClass, secondaryButtonClass } from "@/lib/ui";

// Alta asistida desde la consola: el operador crea la cuenta y le entrega el
// nombre al cliente. Las empresas y sus datos fiscales los crea el cliente.
export function CreateOrganizationForm() {
  const [state, action, pending] = useActionState<PlatformActionState, FormData>(
    createOrganizationFromAdmin,
    undefined,
  );

  useEffect(() => {
    if (state?.ok) toast.success("Organización creada");
  }, [state]);

  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <div className="min-w-56 flex-1">
        <label htmlFor="org-create-name" className={labelClass}>
          Nombre de la cuenta
        </label>
        <input
          id="org-create-name"
          name="name"
          type="text"
          required
          minLength={2}
          maxLength={80}
          placeholder="FaenaExpress SpA"
          className={controlClass}
        />
      </div>
      <SubmitButton className={secondaryButtonClass} pendingLabel="Creando...">
        Crear organización
      </SubmitButton>
      {state?.error ? <p className="w-full text-sm text-danger">{state.error}</p> : null}
      <span className="sr-only" aria-live="polite">
        {pending ? "Creando" : ""}
      </span>
    </form>
  );
}

// Genera un enlace de invitación para una organización. El enlace aparece en un
// panel aparte (lo pinta el servidor desde una cookie corta), porque la
// revalidación remonta este componente y el estado se perdería.
export function InviteFromAdminForm({
  organizationId,
  companies,
}: {
  organizationId: string;
  companies: { id: string; name: string }[];
}) {
  const [state, action, pending] = useActionState<PlatformActionState, FormData>(
    createInvitationFromAdmin,
    undefined,
  );

  useEffect(() => {
    if (state?.ok) toast.success("Invitación creada");
  }, [state]);

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="organizationId" value={organizationId} />

      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-56 flex-1">
          <label htmlFor="invite-email" className={labelClass}>
            Correo del contacto
          </label>
          <input
            id="invite-email"
            name="email"
            type="email"
            required
            placeholder="contacto@empresa.cl"
            className={controlClass}
          />
        </div>
        <div>
          <label htmlFor="invite-role" className={labelClass}>
            Rol en la empresa
          </label>
          <select id="invite-role" name="role" defaultValue="ADMIN" className={controlClass}>
            <option value="ADMIN">Administrador</option>
            <option value="ACCOUNTANT">Contabilidad</option>
            <option value="SALES">Ventas</option>
            <option value="VIEWER">Solo lectura</option>
          </select>
        </div>
        <div>
          <label htmlFor="invite-company" className={labelClass}>
            Empresa
          </label>
          <select id="invite-company" name="companyId" defaultValue="" className={controlClass}>
            <option value="">Toda la organización</option>
            {companies.map((c) => (
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
      <span className="sr-only" aria-live="polite">
        {pending ? "Generando invitación" : ""}
      </span>
    </form>
  );
}
