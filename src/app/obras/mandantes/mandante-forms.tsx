"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import {
  actualizarMandanteObra,
  crearMandanteObra,
  eliminarMandanteObra,
} from "@/app/actions/obra-mandantes";
import { SubmitButton } from "@/components/submit-button";
import {
  controlClass,
  dangerButtonClass,
  fieldClass,
  labelClass,
  primaryButtonClass,
} from "@/lib/ui";

type DatosMandante = {
  id?: string;
  name: string;
  rut: string | null;
  direccion: string | null;
  comuna: string | null;
  contacto: string | null;
  notas: string | null;
};

function Campos({ datos }: { datos?: DatosMandante }) {
  return (
    <>
      <div className={fieldClass}>
        <label htmlFor="mandante-name" className={labelClass}>Nombre del mandante</label>
        <input id="mandante-name" name="name" required maxLength={160} defaultValue={datos?.name ?? ""} placeholder="Nombre del mandante" className={controlClass} />
      </div>
      <div className={fieldClass}>
        <label htmlFor="mandante-rut" className={labelClass}>RUT</label>
        <input id="mandante-rut" name="rut" maxLength={20} defaultValue={datos?.rut ?? ""} placeholder="RUT" className={controlClass} />
      </div>
      <div className={fieldClass}>
        <label htmlFor="mandante-comuna" className={labelClass}>Comuna</label>
        <input id="mandante-comuna" name="comuna" maxLength={80} defaultValue={datos?.comuna ?? ""} placeholder="Comuna" className={controlClass} />
      </div>
      <div className={fieldClass + " sm:col-span-2"}>
        <label htmlFor="mandante-direccion" className={labelClass}>Dirección</label>
        <input id="mandante-direccion" name="direccion" maxLength={250} defaultValue={datos?.direccion ?? ""} placeholder="Dirección" className={controlClass} />
      </div>
      <div className={fieldClass + " sm:col-span-2"}>
        <label htmlFor="mandante-contacto" className={labelClass}>Contacto</label>
        <input id="mandante-contacto" name="contacto" maxLength={120} defaultValue={datos?.contacto ?? ""} placeholder="Contacto" className={controlClass} />
      </div>
      <div className={fieldClass + " sm:col-span-2"}>
        <label htmlFor="mandante-notas" className={labelClass}>Notas</label>
        <textarea id="mandante-notas" name="notas" rows={3} maxLength={1000} defaultValue={datos?.notas ?? ""} className={controlClass} />
      </div>
    </>
  );
}

export function NuevoMandanteForm() {
  const [state, action] = useActionState(crearMandanteObra, undefined);
  useEffect(() => {
    if (state?.ok) toast.success("Mandante creado.");
    if (state?.error) toast.error(state.error);
  }, [state]);

  return (
    <details className="rounded-[8px] border border-border bg-surface">
      <summary className="cursor-pointer px-5 py-4 text-sm font-semibold">+ Nuevo mandante</summary>
      <form action={action} className="grid gap-3 border-t border-border p-5 sm:grid-cols-2">
        <Campos />
        <div className="sm:col-span-2">
          <SubmitButton pendingLabel="Creando…" className={primaryButtonClass}>Crear mandante</SubmitButton>
        </div>
      </form>
    </details>
  );
}

export function EditarMandanteForm({ datos }: { datos: DatosMandante & { id: string } }) {
  const [state, action] = useActionState(actualizarMandanteObra, undefined);
  useEffect(() => {
    if (state?.ok) toast.success("Mandante actualizado.");
    if (state?.error) toast.error(state.error);
  }, [state]);

  return (
    <details className="rounded-[8px] border border-border bg-surface">
      <summary className="cursor-pointer px-5 py-4 text-sm font-semibold">Editar mandante</summary>
      <form action={action} className="grid gap-3 border-t border-border p-5 sm:grid-cols-2">
        <input type="hidden" name="id" value={datos.id} />
        <Campos datos={datos} />
        <div className="sm:col-span-2">
          <SubmitButton pendingLabel="Guardando…" className={primaryButtonClass}>Guardar</SubmitButton>
        </div>
      </form>
    </details>
  );
}

export function EliminarMandanteForm({ id, nombre }: { id: string; nombre: string }) {
  return (
    <form action={eliminarMandanteObra}>
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        onClick={(event) => {
          if (!window.confirm(`¿Eliminar el mandante «${nombre}»? Sus obras quedarán sin mandante asignado.`)) {
            event.preventDefault();
          }
        }}
        className={dangerButtonClass + " px-3 py-1 text-xs"}
      >
        Eliminar mandante
      </button>
    </form>
  );
}
