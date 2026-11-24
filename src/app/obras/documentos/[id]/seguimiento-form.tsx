"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { registrarSeguimiento } from "@/app/actions/obra-documentacion";
import { SubmitButton } from "@/components/submit-button";
import {
  ESTADOS_DOCUMENTO_OBRA,
  ESTADO_DOCUMENTO_LABELS,
} from "@/lib/obra-documentacion";
import { controlClass, primaryButtonClass } from "@/lib/ui";

export function SeguimientoForm({
  documentoId,
  estadoActual,
}: {
  documentoId: string;
  estadoActual: string;
}) {
  const router = useRouter();
  const [state, action] = useActionState(registrarSeguimiento, undefined);

  useEffect(() => {
    if (state?.ok) {
      toast.success(state.message ?? "Seguimiento registrado.");
      router.refresh();
    }
    if (state?.error) toast.error(state.error);
  }, [state, router]);

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="documentoId" value={documentoId} />
      <label className="flex flex-col gap-1">
        <span className="text-sm text-muted-foreground">Nuevo estado</span>
        <select name="estado" defaultValue={estadoActual} className={controlClass}>
          {ESTADOS_DOCUMENTO_OBRA.map((estado) => (
            <option key={estado} value={estado}>{ESTADO_DOCUMENTO_LABELS[estado]}</option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm text-muted-foreground">Nota del seguimiento</span>
        <textarea name="nota" rows={3} placeholder="Qué pasó, con quién, qué falta…" className={controlClass} />
      </label>
      <SubmitButton pendingLabel="Guardando…" className={primaryButtonClass + " self-start"}>
        Registrar seguimiento
      </SubmitButton>
    </form>
  );
}
