"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import { type MemberFormState } from "@/app/actions/companies";
import { SubmitButton } from "@/components/submit-button";
import {
  CONFIGURABLE_SECTIONS,
  effectiveSectionAccess,
  type SectionAccessMap,
} from "@/lib/permissions";
import { secondaryButtonClass } from "@/lib/ui";
import type { Role } from "@/generated/prisma/client";

const NOMBRES: Record<(typeof CONFIGURABLE_SECTIONS)[number], string> = {
  rrhh: "RRHH",
  inventario: "Inventario",
  comisiones: "Comisiones",
  banco: "Banco",
};

const OPCIONES = [
  { value: "default", label: "Según su rol" },
  { value: "NONE", label: "Sin acceso" },
  { value: "VIEW", label: "Solo ver" },
  { value: "EDIT", label: "Editar" },
];

/**
 * Permisos finos por sección para una persona.
 *
 * El rol dice qué tipo de persona es («vendedor», «contabilidad»); esto afina
 * qué puede tocar en concreto. Es lo que permite un contrato que no es "todo o
 * nada": «entra a RRHH, pero no a Inventario».
 */
export function SectionAccessForm({
  action: guardar,
  membershipId,
  role,
  sectionAccess,
}: {
  /** La acción que guarda: la del cliente (en su empresa) o la de la consola. */
  action: (state: MemberFormState | undefined, formData: FormData) => Promise<MemberFormState>;
  membershipId: string;
  role: Role;
  sectionAccess: SectionAccessMap;
}) {
  const [state, action, pending] = useActionState<MemberFormState, FormData>(guardar, undefined);

  useEffect(() => {
    if (state?.ok) toast.success("Permisos actualizados");
  }, [state]);

  return (
    <form action={action} className="mt-2 flex flex-col gap-2">
      <input type="hidden" name="membershipId" value={membershipId} />
      <div className="flex flex-wrap items-end gap-2">
        {CONFIGURABLE_SECTIONS.map((section) => {
          const actual = effectiveSectionAccess(role, section, { sectionAccess });
          const excepcion = sectionAccess?.[section];
          return (
            <div key={section}>
              <label
                htmlFor={`acceso-${section}-${membershipId}`}
                className="block text-xs text-muted-foreground"
              >
                {NOMBRES[section]}
                {excepcion ? (
                  <span className="ml-1 text-primary">·</span>
                ) : (
                  <span className="ml-1">· {actual === "NONE" ? "no" : actual === "VIEW" ? "ver" : "editar"}</span>
                )}
              </label>
              <select
                id={`acceso-${section}-${membershipId}`}
                name={`acceso:${section}`}
                defaultValue={excepcion ?? "default"}
                className="rounded-control border border-border bg-surface px-2 py-1 text-xs text-foreground"
              >
                {OPCIONES.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          );
        })}
        <SubmitButton
          className={secondaryButtonClass + " py-1 text-xs"}
          pendingLabel="Guardando..."
        >
          Guardar
        </SubmitButton>
      </div>
      {state?.error ? <p className="text-xs text-danger">{state.error}</p> : null}
      <span className="sr-only" aria-live="polite">
        {pending ? "Guardando" : ""}
      </span>
    </form>
  );
}
