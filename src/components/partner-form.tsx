"use client";

import { useActionState } from "react";

import type { PartnerFormState } from "@/app/actions/partners";
import { NoSalespeopleHint } from "@/components/no-salespeople-hint";
import { SelectDropdown } from "@/components/select-dropdown";
import { SubmitButton } from "@/components/submit-button";
import { partnerTypeLabel } from "@/lib/labels";
import { cardClass, controlClass, fieldClass, labelClass, primaryButtonClass } from "@/lib/ui";
import { partnerTypeValues } from "@/lib/validation";

export type PartnerForForm = {
  type: string;
  name: string;
  rut: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
  salespersonId?: string;
  active: boolean;
};

export function PartnerForm({
  action,
  defaults,
  defaultType,
  redirectTo,
  salespeople,
  canManageSalespeople,
}: {
  action: (prev: PartnerFormState, formData: FormData) => Promise<PartnerFormState>;
  defaults?: PartnerForForm;
  defaultType?: string;
  redirectTo?: string;
  salespeople?: { id: string; name: string }[];
  canManageSalespeople?: boolean;
}) {
  const [state, formAction] = useActionState<PartnerFormState, FormData>(action, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="redirectTo" value={redirectTo ?? "/facturas/proveedores"} />
      <section className={cardClass + " flex flex-col gap-4 p-4"}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className={fieldClass}>
            <label htmlFor="type" className={labelClass}>
              Tipo
            </label>
            <SelectDropdown
              id="type"
              name="type"
              value={defaults?.type ?? defaultType ?? "SUPPLIER"}
              allowEmpty={false}
              options={partnerTypeValues.map((value) => ({ value, label: partnerTypeLabel(value) }))}
            />
          </div>

          <div className={fieldClass}>
            <label htmlFor="name" className={labelClass}>
              Nombre o razón social
            </label>
            <input
              id="name"
              name="name"
              required
              maxLength={120}
              defaultValue={defaults?.name ?? ""}
              className={controlClass}
            />
          </div>

          <div className={fieldClass}>
            <label htmlFor="rut" className={labelClass}>
              RUT <span className="text-muted-foreground">(opcional)</span>
            </label>
            <input id="rut" name="rut" maxLength={20} defaultValue={defaults?.rut ?? ""} className={controlClass} />
          </div>

          {salespeople ? (
            <div className={fieldClass}>
              <label htmlFor="salespersonId" className={labelClass}>
                Vendedor por defecto <span className="text-muted-foreground">(opcional)</span>
              </label>
              {salespeople.length > 0 ? (
                <SelectDropdown
                  id="salespersonId"
                  name="salespersonId"
                  value={defaults?.salespersonId ?? ""}
                  emptyLabel="Sin vendedor"
                  options={salespeople.map((sp) => ({ value: sp.id, label: sp.name }))}
                />
              ) : (
                <>
                  <NoSalespeopleHint canManage={canManageSalespeople ?? false} />
                  {/* Sin opciones no hay selector, pero la asignación que ya tenía
                      el tercero (puede apuntar a un vendedor inactivo) se conserva:
                      quitarla es una decisión, no un efecto de guardar. */}
                  {defaults?.salespersonId ? (
                    <>
                      <input type="hidden" name="salespersonId" value={defaults.salespersonId} />
                      <p className="text-xs text-muted-foreground">
                        Se mantiene el vendedor ya asignado.
                      </p>
                    </>
                  ) : null}
                </>
              )}
            </div>
          ) : null}

          <div className={fieldClass}>
            <label htmlFor="email" className={labelClass}>
              Correo <span className="text-muted-foreground">(opcional)</span>
            </label>
            <input
              id="email"
              name="email"
              type="email"
              maxLength={120}
              defaultValue={defaults?.email ?? ""}
              className={controlClass}
            />
          </div>

          <div className={fieldClass}>
            <label htmlFor="phone" className={labelClass}>
              Teléfono <span className="text-muted-foreground">(opcional)</span>
            </label>
            <input id="phone" name="phone" maxLength={40} defaultValue={defaults?.phone ?? ""} className={controlClass} />
          </div>

          <div className={fieldClass}>
            <label htmlFor="address" className={labelClass}>
              Dirección <span className="text-muted-foreground">(opcional)</span>
            </label>
            <input
              id="address"
              name="address"
              maxLength={200}
              defaultValue={defaults?.address ?? ""}
              className={controlClass}
            />
          </div>

          <div className={fieldClass + " sm:col-span-2"}>
            <label htmlFor="notes" className={labelClass}>
              Notas <span className="text-muted-foreground">(opcional)</span>
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              maxLength={500}
              defaultValue={defaults?.notes ?? ""}
              className={controlClass}
            />
          </div>

          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input
              type="checkbox"
              name="active"
              defaultChecked={defaults ? defaults.active : true}
              className="h-4 w-4 rounded border-border"
            />
            Activo (aparece al registrar compras y ventas)
          </label>
        </div>
      </section>

      {state?.error ? (
        <p
          role="alert"
          aria-live="polite"
          className="rounded-control border border-danger bg-danger-soft px-3 py-2 text-sm text-danger"
        >
          {state.error}
        </p>
      ) : null}

      <div>
        <SubmitButton pendingLabel="Guardando..." className={primaryButtonClass}>
          {defaults ? "Guardar cambios" : "Crear tercero"}
        </SubmitButton>
      </div>
    </form>
  );
}
