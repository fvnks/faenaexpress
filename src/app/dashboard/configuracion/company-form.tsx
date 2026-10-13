"use client";

import { useActionState } from "react";

import { updateCompany, type CompanyFormState } from "@/app/actions/companies";
import { SubmitButton } from "@/components/submit-button";
import { controlClass, fieldClass, labelClass, primaryButtonClass } from "@/lib/ui";

export type CompanyForForm = {
  name: string;
  rut: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  ivaRate: number;
  retentionRate: number;
};

export function CompanyForm({
  defaults,
  readOnly = false,
}: {
  defaults: CompanyForForm;
  readOnly?: boolean;
}) {
  const [state, action] = useActionState<CompanyFormState, FormData>(updateCompany, undefined);

  return (
    <form action={action} className="flex flex-col gap-4">
      <fieldset
        disabled={readOnly}
        className="grid min-w-0 gap-4 border-0 p-0 sm:grid-cols-2"
      >
        <div className={fieldClass}>
          <label htmlFor="company-name" className={labelClass}>
            Nombre o razón social
          </label>
          <input
            id="company-name"
            name="name"
            required
            maxLength={120}
            defaultValue={defaults.name}
            className={controlClass}
          />
        </div>

        <div className={fieldClass}>
          <label htmlFor="company-rut" className={labelClass}>
            RUT
          </label>
          <input
            id="company-rut"
            name="rut"
            maxLength={20}
            defaultValue={defaults.rut}
            className={controlClass}
          />
        </div>

        <div className={fieldClass}>
          <label htmlFor="company-email" className={labelClass}>
            Correo
          </label>
          <input
            id="company-email"
            name="email"
            type="email"
            defaultValue={defaults.email}
            className={controlClass}
          />
        </div>

        <div className={fieldClass}>
          <label htmlFor="company-phone" className={labelClass}>
            Teléfono
          </label>
          <input
            id="company-phone"
            name="phone"
            maxLength={40}
            defaultValue={defaults.phone}
            className={controlClass}
          />
        </div>

        <div className={fieldClass}>
          <label htmlFor="company-city" className={labelClass}>
            Ciudad
          </label>
          <input
            id="company-city"
            name="city"
            maxLength={80}
            defaultValue={defaults.city}
            className={controlClass}
          />
        </div>

        <div className={fieldClass}>
          <label htmlFor="company-iva" className={labelClass}>
            IVA (%)
          </label>
          <input
            id="company-iva"
            name="ivaRate"
            type="number"
            min={0}
            max={100}
            defaultValue={defaults.ivaRate}
            className={controlClass}
          />
        </div>

        <div className={fieldClass}>
          <label htmlFor="company-retention" className={labelClass}>
            Retención de honorarios (%)
          </label>
          <input
            id="company-retention"
            name="retentionRate"
            type="number"
            min={0}
            max={100}
            defaultValue={defaults.retentionRate}
            className={controlClass}
          />
        </div>

        <div className={fieldClass + " sm:col-span-2"}>
          <label htmlFor="company-address" className={labelClass}>
            Dirección
          </label>
          <input
            id="company-address"
            name="address"
            maxLength={200}
            defaultValue={defaults.address}
            className={controlClass}
          />
        </div>
      </fieldset>

      {readOnly ? (
        <p className="text-sm text-muted-foreground">
          Solo un administrador puede editar estos datos.
        </p>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <SubmitButton className={primaryButtonClass} pendingLabel="Guardando…">
            Guardar
          </SubmitButton>
          {state?.ok ? <span className="text-sm text-success">Guardado.</span> : null}
          {state?.error ? <span className="text-sm text-danger">{state.error}</span> : null}
        </div>
      )}
    </form>
  );
}
