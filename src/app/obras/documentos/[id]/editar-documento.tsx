"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { actualizarDocumentoObra } from "@/app/actions/obra-documentacion";
import { SubmitButton } from "@/components/submit-button";
import {
  TIPOS_DOCUMENTO_OBRA,
  TIPO_DOCUMENTO_LABELS,
} from "@/lib/obra-documentacion";
import { controlClass, primaryButtonClass } from "@/lib/ui";

export function EditarDocumento({
  documentoId,
  titulo,
  tipo,
  responsables,
  responsableId,
  fechaVencimiento,
  descripcion,
  fileName,
}: {
  documentoId: string;
  titulo: string;
  tipo: string;
  responsables: Array<{ id: string; name: string }>;
  responsableId: string | null;
  fechaVencimiento: string;
  descripcion: string | null;
  fileName: string | null;
}) {
  const router = useRouter();
  const [state, action] = useActionState(actualizarDocumentoObra, undefined);

  useEffect(() => {
    if (state?.ok) {
      toast.success(state.message ?? "Documento actualizado.");
      router.refresh();
    }
    if (state?.error) toast.error(state.error);
  }, [state, router]);

  return (
    <details className="rounded-[8px] border border-border bg-surface">
      <summary className="cursor-pointer px-5 py-4 text-sm font-semibold">Editar documento</summary>
      <form action={action} className="grid gap-4 border-t border-border p-5 sm:grid-cols-2">
        <input type="hidden" name="documentoId" value={documentoId} />
        <label className="flex flex-col gap-1">
          <span className="text-sm text-muted-foreground">Título</span>
          <input name="titulo" required defaultValue={titulo} className={controlClass} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm text-muted-foreground">Tipo</span>
          <select name="tipo" defaultValue={tipo} className={controlClass}>
            {TIPOS_DOCUMENTO_OBRA.map((value) => (
              <option key={value} value={value}>{TIPO_DOCUMENTO_LABELS[value]}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm text-muted-foreground">Responsable</span>
          <select name="responsableId" defaultValue={responsableId ?? ""} className={controlClass}>
            <option value="">Sin asignar</option>
            {responsables.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm text-muted-foreground">Fecha de vencimiento</span>
          <input name="fechaVencimiento" type="date" defaultValue={fechaVencimiento} className={controlClass} />
        </label>
        <label className="flex flex-col gap-1 sm:col-span-2">
          <span className="text-sm text-muted-foreground">Descripción</span>
          <input name="descripcion" defaultValue={descripcion ?? ""} className={controlClass} />
        </label>
        <label className="flex flex-col gap-1 sm:col-span-2">
          <span className="text-sm text-muted-foreground">Reemplazar archivo (opcional, hasta 10 MB)</span>
          <input name="file" type="file" className={controlClass} />
        </label>
        {fileName ? (
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" name="quitarArchivo" value="true" />
            Quitar el archivo adjunto actual
          </label>
        ) : null}
        <div className="sm:col-span-2">
          <SubmitButton pendingLabel="Guardando…" className={primaryButtonClass}>Guardar</SubmitButton>
        </div>
      </form>
    </details>
  );
}
