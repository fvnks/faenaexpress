"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { crearPartidaObra } from "@/app/actions/obra-presupuesto";
import { SubmitButton } from "@/components/submit-button";
import { controlClass, primaryButtonClass } from "@/lib/ui";

export function NuevaPartida() {
  const router = useRouter();
  const [state, action] = useActionState(crearPartidaObra, undefined);

  useEffect(() => {
    if (state?.ok) {
      toast.success("Partida agregada.");
      router.refresh();
    }
    if (state?.error) toast.error(state.error);
  }, [state, router]);

  return (
    <form action={action} className="mt-4 grid gap-3 sm:grid-cols-5">
      <input name="codigo" placeholder="Código (ej. 1.1)" className={controlClass} />
      <input name="descripcion" placeholder="Descripción" required className={controlClass} />
      <input name="unidad" placeholder="UN" defaultValue="UN" className={controlClass} />
      <input name="cantidad" placeholder="Cantidad" type="number" step="0.01" min="0" required className={controlClass} />
      <input name="precioUnitario" placeholder="Precio unit." type="number" step="0.01" min="0" required className={controlClass} />
      <div className="sm:col-span-5">
        <SubmitButton pendingLabel="Guardando…" className={primaryButtonClass}>Guardar partida</SubmitButton>
      </div>
    </form>
  );
}
