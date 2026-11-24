"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import { createCentroCosto, updateCentroCosto, type CentroCostoFormState } from "@/app/actions/centros-costo";
import { SubmitButton } from "@/components/submit-button";
import { controlClass, primaryButtonClass } from "@/lib/ui";

type Datos = { codigo: string; nombre: string; descripcion: string | null; active: boolean };

export function NuevoCentro({ compact = false }: { compact?: boolean }) {
  const [state, action] = useActionState<CentroCostoFormState, FormData>(createCentroCosto, undefined);
  useEffect(() => {
    if (state?.ok) toast.success("Centro de costo creado.");
    if (state?.error) toast.error(state.error);
  }, [state]);

  return (
    <form action={action} className={compact ? "flex flex-wrap items-end gap-2" : "grid gap-3 sm:grid-cols-3"}>
      <input name="codigo" required placeholder="Código (ej. CC-01)" className={controlClass} />
      <input name="nombre" required placeholder="Nombre del centro" className={controlClass} />
      <input name="descripcion" placeholder="Descripción (opcional)" className={controlClass} />
      <SubmitButton pendingLabel="Guardando…" className={primaryButtonClass}>Agregar centro</SubmitButton>
    </form>
  );
}

export function EditarCentro({ id, datos, action }: { id: string; datos: Datos; action: (prev: CentroCostoFormState, fd: FormData) => Promise<CentroCostoFormState> }) {
  const [state, formAction] = useActionState<CentroCostoFormState, FormData>(action, undefined);
  useEffect(() => {
    if (state?.ok) toast.success("Centro actualizado.");
    if (state?.error) toast.error(state.error);
  }, [state]);

  return (
    <form action={formAction} className="grid gap-3 border-t border-border p-4 sm:grid-cols-2">
      <input name="codigo" required defaultValue={datos.codigo} className={controlClass} />
      <input name="nombre" required defaultValue={datos.nombre} className={controlClass} />
      <input name="descripcion" defaultValue={datos.descripcion ?? ""} className={controlClass + " sm:col-span-2"} />
      <label className="flex items-center gap-2 text-sm text-muted-foreground sm:col-span-2">
        <input name="active" type="checkbox" defaultChecked={datos.active} className="h-4 w-4 accent-[var(--primary)]" />
        Activo (disponible para asignar en facturas)
      </label>
      <div className="sm:col-span-2">
        <SubmitButton pendingLabel="Guardando…" className={primaryButtonClass}>Guardar</SubmitButton>
      </div>
    </form>
  );
}

// Referencia para el compilador: la acción de update se enlaza con bind(null, id) en el server.
export type { CentroCostoFormState };
