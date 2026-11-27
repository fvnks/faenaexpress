"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  aplicarPlantillaItemizado,
  guardarPlantillaItemizado,
} from "@/app/actions/obra-plantillas";
import { SubmitButton } from "@/components/submit-button";
import { controlClass, primaryButtonClass } from "@/lib/ui";

type Plantilla = { id: string; nombre: string; lineas: number };

export function GuardarPlantillaForm() {
  const router = useRouter();
  const [state, action] = useActionState(guardarPlantillaItemizado, undefined);
  useEffect(() => {
    if (state?.ok) {
      toast.success(state.message ?? "Plantilla guardada.");
      router.refresh();
    }
    if (state?.error) toast.error(state.error);
  }, [state, router]);

  return (
    <details className="rounded-[8px] border border-border bg-surface">
      <summary className="cursor-pointer px-5 py-4 text-sm font-semibold">Guardar como plantilla</summary>
      <form action={action} className="grid gap-3 border-t border-border p-5 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-sm text-muted-foreground">Nombre de la plantilla</span>
          <input name="nombre" required maxLength={120} placeholder="Nombre de la plantilla" className={controlClass} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm text-muted-foreground">Descripción (opcional)</span>
          <input name="descripcion" maxLength={500} placeholder="Descripción" className={controlClass} />
        </label>
        <div className="sm:col-span-2">
          <SubmitButton pendingLabel="Guardando…" className={primaryButtonClass}>Guardar presupuesto como plantilla</SubmitButton>
        </div>
      </form>
    </details>
  );
}

export function AplicarPlantillaForm({ plantillas }: { plantillas: Plantilla[] }) {
  const router = useRouter();
  const [state, action] = useActionState(aplicarPlantillaItemizado, undefined);
  useEffect(() => {
    if (state?.ok) {
      toast.success(state.message ?? "Plantilla aplicada.");
      router.refresh();
    }
    if (state?.error) toast.error(state.error);
  }, [state, router]);

  if (plantillas.length === 0) return null;

  return (
    <details className="rounded-[8px] border border-border bg-surface">
      <summary className="cursor-pointer px-5 py-4 text-sm font-semibold">Aplicar una plantilla</summary>
      <form action={action} className="flex flex-wrap items-end gap-3 border-t border-border p-5">
        <label className="flex flex-col gap-1">
          <span className="text-sm text-muted-foreground">Plantilla</span>
          <select name="plantillaId" required className={controlClass + " max-w-xs"}>
            <option value="">Selecciona una plantilla…</option>
            {plantillas.map((plantilla) => (
              <option key={plantilla.id} value={plantilla.id}>
                {plantilla.nombre} ({plantilla.lineas} partidas)
              </option>
            ))}
          </select>
        </label>
        <SubmitButton pendingLabel="Aplicando…" className={primaryButtonClass}>
          Aplicar a esta obra
        </SubmitButton>
        <p className="w-full text-xs text-muted-foreground">
          Las partidas vigentes actuales se anulan y se conservan en el historial por trazabilidad.
        </p>
      </form>
    </details>
  );
}
