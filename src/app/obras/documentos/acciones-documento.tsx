"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  actualizarDocumentoObra,
  eliminarDocumentoObra,
} from "@/app/actions/obra-documentacion";
import { SubmitButton } from "@/components/submit-button";
import {
  ESTADOS_DOCUMENTO_OBRA,
  ESTADO_DOCUMENTO_LABELS,
  TIPOS_DOCUMENTO_OBRA,
  TIPO_DOCUMENTO_LABELS,
} from "@/lib/obra-documentacion";
import {
  controlClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/lib/ui";

/** Acciones de un documento en el listado: gestión completa y borrado. */
export function AccionesDocumento({
  documentoId,
  titulo,
  tipo,
  estado,
  responsableId,
  fechaVencimiento,
  fileName,
  responsables,
  writable,
}: {
  documentoId: string;
  titulo: string;
  tipo: string;
  estado: string;
  responsableId: string | null;
  fechaVencimiento: string;
  fileName: string | null;
  responsables: Array<{ id: string; name: string }>;
  writable: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [updateState, updateAction] = useActionState(actualizarDocumentoObra, undefined);
  const [deleteState, deleteAction] = useActionState(eliminarDocumentoObra, undefined);
  const tituloRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (updateState?.ok) {
      toast.success(updateState.message ?? "Documento actualizado.");
      setOpen(false);
      router.refresh();
    }
    if (updateState?.error) toast.error(updateState.error);
  }, [updateState, router]);

  useEffect(() => {
    if (deleteState?.ok) {
      toast.success(deleteState.message ?? "Documento eliminado.");
      router.refresh();
    }
    if (deleteState?.error) toast.error(deleteState.error);
  }, [deleteState, router]);

  useEffect(() => {
    if (!open) return;
    tituloRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <div className="flex flex-wrap justify-end gap-x-3 gap-y-1">
        <Link href={`/obras/documentos/${documentoId}`} className="text-xs text-primary hover:underline">
          Ver seguimiento
        </Link>
        {fileName ? (
          <a href={`/obras/documentos/${documentoId}/archivo`} className="text-xs text-primary hover:underline">
            Archivo
          </a>
        ) : null}
        {writable ? (
          <>
            <button type="button" onClick={() => setOpen(true)} className="text-xs text-primary hover:underline">
              Gestionar
            </button>
            <form action={deleteAction}>
              <input type="hidden" name="documentoId" value={documentoId} />
              <button
                type="submit"
                onClick={(event) => {
                  if (!window.confirm(`¿Eliminar el documento «${titulo}»? Se borrará también su historial y no se puede deshacer.`)) {
                    event.preventDefault();
                  }
                }}
                className="text-xs text-danger hover:underline"
              >
                Eliminar
              </button>
            </form>
          </>
        ) : null}
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 print:hidden">
          <button
            type="button"
            aria-label="Cerrar gestión del documento"
            className="absolute inset-0 bg-foreground/40"
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Gestionar documento"
            className="card-elevated relative z-10 max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-card border border-border-strong p-5"
          >
            <h2 className="text-lg font-semibold">Gestionar documento</h2>
            <p className="mt-0.5 truncate text-xs text-muted-foreground" title={titulo}>{titulo}</p>

            <form action={updateAction} className="mt-4 grid gap-3 sm:grid-cols-2">
              <input type="hidden" name="documentoId" value={documentoId} />
              <label className="flex flex-col gap-1 sm:col-span-2">
                <span className="text-sm text-muted-foreground">Título</span>
                <input
                  ref={tituloRef}
                  name="titulo"
                  required
                  defaultValue={titulo}
                  className={controlClass}
                />
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
                <span className="text-sm text-muted-foreground">Vencimiento</span>
                <input name="fechaVencimiento" type="date" defaultValue={fechaVencimiento} className={controlClass} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm text-muted-foreground">Estado</span>
                <select name="estado" defaultValue={estado} className={controlClass}>
                  {ESTADOS_DOCUMENTO_OBRA.map((value) => (
                    <option key={value} value={value}>{ESTADO_DOCUMENTO_LABELS[value]}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 sm:col-span-2">
                <span className="text-sm text-muted-foreground">Nota del cambio (opcional)</span>
                <input name="nota" className={controlClass} />
              </label>
              <label className="flex flex-col gap-1 sm:col-span-2">
                <span className="text-sm text-muted-foreground">
                  Reemplazar archivo (opcional, hasta 10 MB)
                </span>
                <input name="file" type="file" className={controlClass} />
              </label>
              {fileName ? (
                <label className="flex items-center gap-2 text-sm sm:col-span-2">
                  <input type="checkbox" name="quitarArchivo" value="true" />
                  Quitar el archivo adjunto actual
                </label>
              ) : null}
              <div className="flex justify-end gap-2 sm:col-span-2">
                <button type="button" onClick={() => setOpen(false)} className={secondaryButtonClass}>
                  Cancelar
                </button>
                <SubmitButton pendingLabel="Guardando…" className={primaryButtonClass}>
                  Guardar cambios
                </SubmitButton>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
