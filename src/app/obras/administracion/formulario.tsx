"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { actualizarObra } from "@/app/actions/obra-costos";
import { SubmitButton } from "@/components/submit-button";
import { controlClass, primaryButtonClass } from "@/lib/ui";

type Datos = {
  name: string;
  code: string | null;
  mandante: string | null;
  mandanteId: string | null;
  rutMandante: string | null;
  direccion: string | null;
  comuna: string | null;
  fechaInicio: string;
  fechaTermino: string;
  status: string;
};

const ESTADOS = [
  ["PLANIFICADA", "Planificada"],
  ["EN_CURSO", "En curso"],
  ["SUSPENDIDA", "Suspendida"],
  ["TERMINADA", "Terminada"],
];

export function FormularioObra({
  datos,
  mandantes,
}: {
  datos: Datos;
  mandantes: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [state, action] = useActionState(actualizarObra, undefined);

  useEffect(() => {
    if (state?.ok) { toast.success(state.message ?? "Obra actualizada."); router.refresh(); }
    if (state?.error) toast.error(state.error);
  }, [state, router]);

  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <label className="flex flex-col gap-1">
        <span className="text-sm text-muted-foreground">Nombre de la obra</span>
        <input name="name" required defaultValue={datos.name} className={controlClass} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm text-muted-foreground">Código interno</span>
        <input name="code" defaultValue={datos.code ?? ""} placeholder="OB-2026-01" className={controlClass} />
      </label>
      {mandantes.length > 0 ? (
        <label className="flex flex-col gap-1">
          <span className="text-sm text-muted-foreground">Mandante</span>
          <select name="mandanteId" defaultValue={datos.mandanteId ?? ""} className={controlClass}>
            <option value="">Sin mandante</option>
            {mandantes.map((mandante) => (
              <option key={mandante.id} value={mandante.id}>{mandante.name}</option>
            ))}
          </select>
        </label>
      ) : null}
      <label className="flex flex-col gap-1">
        <span className="text-sm text-muted-foreground">Referencia de mandante</span>
        <input name="mandante" defaultValue={datos.mandante ?? ""} className={controlClass} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm text-muted-foreground">RUT del mandante</span>
        <input name="rutMandante" defaultValue={datos.rutMandante ?? ""} className={controlClass} />
      </label>
      <label className="flex flex-col gap-1 sm:col-span-2">
        <span className="text-sm text-muted-foreground">Dirección</span>
        <input name="direccion" defaultValue={datos.direccion ?? ""} className={controlClass} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm text-muted-foreground">Comuna</span>
        <input name="comuna" defaultValue={datos.comuna ?? ""} className={controlClass} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm text-muted-foreground">Estado</span>
        <select name="status" defaultValue={datos.status} className={controlClass}>
          {ESTADOS.map(([valor, etiqueta]) => <option key={valor} value={valor}>{etiqueta}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm text-muted-foreground">Fecha de inicio</span>
        <input name="fechaInicio" type="date" defaultValue={datos.fechaInicio} className={controlClass} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm text-muted-foreground">Fecha de término</span>
        <input name="fechaTermino" type="date" defaultValue={datos.fechaTermino} className={controlClass} />
      </label>
      <div className="sm:col-span-2">
        <SubmitButton pendingLabel="Guardando…" className={primaryButtonClass}>Guardar cambios</SubmitButton>
      </div>
    </form>
  );
}
