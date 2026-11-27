"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import { crearObra } from "@/app/actions/obras";
import { SubmitButton } from "@/components/submit-button";
import { controlClass, fieldClass, labelClass, primaryButtonClass } from "@/lib/ui";

export function NuevaObraForm() {
  const [state, action] = useActionState(crearObra, undefined);

  useEffect(() => {
    if (state?.error) toast.error(state.error);
  }, [state]);

  return (
    <details className="rounded-[8px] border border-border bg-surface">
      <summary className="cursor-pointer px-5 py-4 text-sm font-semibold">+ Nueva obra</summary>
      <form action={action} className="grid gap-3 border-t border-border p-5 sm:grid-cols-2">
        <div className={fieldClass}>
          <label htmlFor="obra-nombre" className={labelClass}>Nombre de la obra</label>
          <input id="obra-nombre" name="name" required maxLength={120} placeholder="Nombre de la obra" className={controlClass} />
        </div>
        <div className={fieldClass}>
          <label htmlFor="obra-codigo" className={labelClass}>Código interno</label>
          <input id="obra-codigo" name="code" maxLength={30} placeholder="Código interno" className={controlClass} />
        </div>
        <div className={fieldClass}>
          <label htmlFor="obra-mandante" className={labelClass}>Mandante</label>
          <input id="obra-mandante" name="mandante" maxLength={120} placeholder="Mandante" className={controlClass} />
        </div>
        <div className={fieldClass}>
          <label htmlFor="obra-rut" className={labelClass}>RUT del mandante</label>
          <input id="obra-rut" name="rutMandante" maxLength={20} placeholder="RUT del mandante" className={controlClass} />
        </div>
        <div className={fieldClass}>
          <label htmlFor="obra-inicio" className={labelClass}>Fecha de inicio</label>
          <input id="obra-inicio" name="fechaInicio" type="date" className={controlClass} />
        </div>
        <div className={fieldClass}>
          <label htmlFor="obra-termino" className={labelClass}>Fecha de término</label>
          <input id="obra-termino" name="fechaTermino" type="date" className={controlClass} />
        </div>
        <div className={fieldClass + " sm:col-span-2"}>
          <label htmlFor="obra-direccion" className={labelClass}>Dirección</label>
          <input id="obra-direccion" name="direccion" maxLength={250} placeholder="Dirección" className={controlClass} />
        </div>
        <div className={fieldClass}>
          <label htmlFor="obra-comuna" className={labelClass}>Comuna</label>
          <input id="obra-comuna" name="comuna" maxLength={80} placeholder="Comuna" className={controlClass} />
        </div>
        <div className="flex items-end sm:col-span-2">
          <SubmitButton pendingLabel="Creando…" className={primaryButtonClass}>Crear obra</SubmitButton>
        </div>
      </form>
    </details>
  );
}
