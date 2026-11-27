"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { registrarCubicacion } from "@/app/actions/obra-avance";
import { SubmitButton } from "@/components/submit-button";
import { controlClass, primaryButtonClass } from "@/lib/ui";

export function NuevaCubicacion({
  partidas,
  cuadrillas,
}: {
  partidas: Array<{ id: string; codigo: string; descripcion: string; unidad: string; pendiente: number }>;
  cuadrillas: Array<{ id: string; nombre: string }>;
}) {
  const router = useRouter();
  const [state, action] = useActionState(registrarCubicacion, undefined);

  useEffect(() => {
    if (state?.ok) {
      toast.success(state.message ?? "Avance registrado.");
      router.refresh();
    }
    if (state?.error) toast.error(state.error);
  }, [state, router]);

  return (
    <details className="rounded-[8px] border border-border bg-surface p-5">
      <summary className="cursor-pointer font-semibold">Registrar avance de una partida</summary>
      <form action={action} className="mt-4 grid gap-3 sm:grid-cols-4">
        <select name="partidaId" required className={controlClass}>
          <option value="">Seleccionar partida…</option>
          {partidas.map((p) => (
            <option key={p.id} value={p.id}>
              {p.codigo} · {p.descripcion} (quedan {p.pendiente.toFixed(2)} {p.unidad})
            </option>
          ))}
        </select>
        <input name="cantidad" placeholder="Cantidad cubicada" type="number" step="0.01" min="0.01" required className={controlClass} />
        <input name="fecha" type="date" className={controlClass} />
        {cuadrillas.length > 0 ? (
          <select name="cuadrillaId" className={controlClass} defaultValue="">
            <option value="">Sin cuadrilla</option>
            {cuadrillas.map((cuadrilla) => (
              <option key={cuadrilla.id} value={cuadrilla.id}>{cuadrilla.nombre}</option>
            ))}
          </select>
        ) : null}
        <SubmitButton pendingLabel="Guardando…" className={primaryButtonClass}>Guardar avance</SubmitButton>
      </form>
    </details>
  );
}
