"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import { createCompanyForOrganization, type PlatformActionState } from "@/app/actions/platform";
import { SubmitButton } from "@/components/submit-button";
import { controlClass, labelClass, secondaryButtonClass } from "@/lib/ui";

// Alta asistida: la cuenta ya existe (la creó el operador), pero la empresa con
// sus datos fiscales no. Sin ella, la persona que entre no tiene dónde trabajar.
export function NewCompanyForOrganizationForm({ organizationId }: { organizationId: string }) {
  const [state, action, pending] = useActionState<PlatformActionState, FormData>(
    createCompanyForOrganization,
    undefined,
  );

  useEffect(() => {
    if (state?.ok) toast.success("Empresa creada");
  }, [state]);

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="organizationId" value={organizationId} />
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-56 flex-1">
          <label htmlFor="new-org-company-name" className={labelClass}>
            Nombre o razón social
          </label>
          <input
            id="new-org-company-name"
            name="name"
            type="text"
            required
            maxLength={120}
            placeholder="FaenaExpress SpA"
            className={controlClass}
          />
        </div>
        <div className="min-w-40">
          <label htmlFor="new-org-company-rut" className={labelClass}>
            RUT
          </label>
          <input
            id="new-org-company-rut"
            name="rut"
            type="text"
            maxLength={20}
            placeholder="77.115.357-7"
            className={controlClass}
          />
        </div>
        <div className="min-w-24">
          <label htmlFor="new-org-company-iva" className={labelClass}>
            IVA (%)
          </label>
          <input
            id="new-org-company-iva"
            name="ivaRate"
            type="number"
            min={0}
            max={100}
            defaultValue={19}
            className={controlClass}
          />
        </div>
        <SubmitButton className={secondaryButtonClass} pendingLabel="Creando...">
          Crear empresa
        </SubmitButton>
      </div>
      {state?.error ? <p className="text-sm text-danger">{state.error}</p> : null}
      <span className="sr-only" aria-live="polite">
        {pending ? "Creando" : ""}
      </span>
    </form>
  );
}
