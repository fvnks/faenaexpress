"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { crearMaquinaria, registrarHorometro } from "@/app/actions/obra-terreno";
import { SubmitButton } from "@/components/submit-button";
import { controlClass, primaryButtonClass } from "@/lib/ui";

export function NuevaMaquinaria() {
  const router = useRouter();
  const [state, action] = useActionState(crearMaquinaria, undefined);
  useEffect(() => {
    if (state?.ok) { toast.success(state.message ?? "Maquinaria agregada."); router.refresh(); }
    if (state?.error) toast.error(state.error);
  }, [state, router]);
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input name="nombre" placeholder="Nombre (ej. Retroexcavadora)" required className={controlClass} />
      <input name="patente" placeholder="Patente" className={controlClass + " w-32"} />
      <input name="proximaMantencion" placeholder="Próxima mantención (h)" type="number" step="1" className={controlClass + " w-48"} />
      <SubmitButton pendingLabel="Guardando…" className={primaryButtonClass}>Agregar</SubmitButton>
    </form>
  );
}

export function NuevoHorometro({ maquinarias }: { maquinarias: Array<{ id: string; nombre: string; horometro: number }> }) {
  const router = useRouter();
  const [state, action] = useActionState(registrarHorometro, undefined);
  useEffect(() => {
    if (state?.ok) { toast.success(state.message ?? "Registrado."); router.refresh(); }
    if (state?.error) toast.error(state.error);
  }, [state, router]);
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <select name="maquinariaId" required className={controlClass + " max-w-xs"}>
        <option value="">Maquinaria…</option>
        {maquinarias.map((m) => <option key={m.id} value={m.id}>{m.nombre} ({m.horometro.toFixed(1)} h)</option>)}
      </select>
      <select name="tipo" className={controlClass + " w-40"}>
        <option value="HOROMETRO">Horómetro</option>
        <option value="MANTENCION">Mantención</option>
      </select>
      <input name="horas" placeholder="Horas" type="number" step="0.1" required className={controlClass + " w-28"} />
      <input name="descripcion" placeholder="Descripción" className={controlClass} />
      <SubmitButton pendingLabel="Guardando…" className={primaryButtonClass}>Registrar</SubmitButton>
    </form>
  );
}
