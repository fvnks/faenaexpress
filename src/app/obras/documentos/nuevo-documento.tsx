"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { crearDocumentoObra } from "@/app/actions/obra-documentacion";
import { SubmitButton } from "@/components/submit-button";
import {
  TIPOS_DOCUMENTO_OBRA,
  TIPO_DOCUMENTO_LABELS,
} from "@/lib/obra-documentacion";
import { controlClass, primaryButtonClass } from "@/lib/ui";

export function NuevoDocumento({
  responsables,
}: {
  responsables: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const [state, action] = useActionState(crearDocumentoObra, undefined);

  useEffect(() => {
    if (state?.ok) {
      toast.success(state.message ?? "Documento creado.");
      router.refresh();
    }
    if (state?.error) toast.error(state.error);
  }, [state, router]);

  return (
    <details className="rounded-[8px] border border-border bg-surface">
      <summary className="cursor-pointer px-5 py-4 text-sm font-semibold">+ Nuevo documento</summary>
      <form action={action} className="grid gap-4 border-t border-border p-5 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-sm text-muted-foreground">Tipo</span>
          <select name="tipo" required className={controlClass}>
            {TIPOS_DOCUMENTO_OBRA.map((tipo) => (
              <option key={tipo} value={tipo}>{TIPO_DOCUMENTO_LABELS[tipo]}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm text-muted-foreground">Título</span>
          <input name="titulo" required placeholder="Ej. Permiso de edificación" className={controlClass} />
        </label>
        <label className="flex flex-col gap-1 sm:col-span-2">
          <span className="text-sm text-muted-foreground">Descripción</span>
          <input name="descripcion" placeholder="Detalle o número de referencia" className={controlClass} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm text-muted-foreground">Responsable</span>
          <select name="responsableId" className={controlClass}>
            <option value="">Sin asignar</option>
            {responsables.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm text-muted-foreground">Fecha de vencimiento</span>
          <input name="fechaVencimiento" type="date" className={controlClass} />
        </label>
        <label className="flex flex-col gap-1 sm:col-span-2">
          <span className="text-sm text-muted-foreground">Archivo (opcional, hasta 10 MB)</span>
          <input name="file" type="file" className={controlClass} />
        </label>
        <div className="sm:col-span-2">
          <SubmitButton pendingLabel="Creando…" className={primaryButtonClass}>Crear documento</SubmitButton>
        </div>
      </form>
    </details>
  );
}
