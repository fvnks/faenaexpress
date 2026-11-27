"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  cambiarEstadoCuadrilla,
  crearCuadrilla,
} from "@/app/actions/obra-cuadrillas";
import { SubmitButton } from "@/components/submit-button";
import { controlClass, primaryButtonClass, secondaryButtonClass } from "@/lib/ui";

type Cuadrilla = { id: string; nombre: string; integrantes: number; activa: boolean };

export function NuevaCuadrillaForm() {
  const router = useRouter();
  const [state, action] = useActionState(crearCuadrilla, undefined);
  useEffect(() => {
    if (state?.ok) {
      toast.success(state.message ?? "Cuadrilla creada.");
      router.refresh();
    }
    if (state?.error) toast.error(state.error);
  }, [state, router]);

  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input name="nombre" required maxLength={120} placeholder="Nombre de la cuadrilla" className={controlClass + " max-w-xs"} />
      <input name="integrantes" type="number" min={1} step={1} defaultValue={1} className={controlClass + " w-28"} aria-label="Integrantes" />
      <SubmitButton pendingLabel="Creando…" className={primaryButtonClass}>Crear cuadrilla</SubmitButton>
    </form>
  );
}

export function EstadoCuadrillaForm({ cuadrilla }: { cuadrilla: Cuadrilla }) {
  const router = useRouter();
  return (
    <form action={cambiarEstadoCuadrilla} onSubmit={() => setTimeout(() => router.refresh(), 300)}>
      <input type="hidden" name="id" value={cuadrilla.id} />
      <input type="hidden" name="activa" value={cuadrilla.activa ? "false" : "true"} />
      <SubmitButton pendingLabel="…" className={secondaryButtonClass + " px-3 py-1 text-xs"}>
        {cuadrilla.activa ? "Desactivar" : "Activar"}
      </SubmitButton>
    </form>
  );
}
