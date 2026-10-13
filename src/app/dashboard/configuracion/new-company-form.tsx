"use client";

import { useActionState } from "react";

import { createCompany, type CompanyFormState } from "@/app/actions/companies";
import { SubmitButton } from "@/components/submit-button";
import { controlClass, fieldClass, labelClass, primaryButtonClass } from "@/lib/ui";

export function NewCompanyForm() {
  const [state, action] = useActionState<CompanyFormState, FormData>(createCompany, undefined);

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className={fieldClass}>
          <label htmlFor="new-company-name" className={labelClass}>
            Nombre o razón social
          </label>
          <input
            id="new-company-name"
            name="name"
            required
            maxLength={120}
            className={controlClass}
          />
        </div>
        <div className={fieldClass}>
          <label htmlFor="new-company-rut" className={labelClass}>
            RUT
          </label>
          <input id="new-company-rut" name="rut" maxLength={20} className={controlClass} />
        </div>
        <div className={fieldClass}>
          <label htmlFor="new-company-iva" className={labelClass}>
            IVA (%)
          </label>
          <input
            id="new-company-iva"
            name="ivaRate"
            type="number"
            min={0}
            max={100}
            defaultValue={19}
            className={controlClass}
          />
        </div>
        <div className={fieldClass}>
          <label htmlFor="new-company-retention" className={labelClass}>
            Retención (%)
          </label>
          <input
            id="new-company-retention"
            name="retentionRate"
            type="number"
            min={0}
            max={100}
            defaultValue={0}
            className={controlClass}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton className={primaryButtonClass} pendingLabel="Creando…">
          Crear empresa
        </SubmitButton>
        {state?.error ? <span className="text-sm text-danger">{state.error}</span> : null}
      </div>
    </form>
  );
}
