"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";

import { issueGuardianCode, type PortalFormState } from "@/app/actions/portal";
import { SubmitButton } from "@/components/submit-button";

/**
 * Acceso de una familia al portal.
 *
 * El código se ve siempre que existe: la secretaría lo anota, lo dicta por
 * teléfono o se lo lleva a la reunión de apoderados. Guardarlo solo el
 * instante en que se genera obligaba a rotarlo para volver a leerlo, y rotar
 * corta el acceso de la familia, así que en la práctica el código quedaba
 * ilegible para el colegio.
 */
export function GuardianAccess({
  guardianId,
  nombre,
  codigo,
  emitido,
  ultimoAcceso,
  puedeEditar,
}: {
  guardianId: string;
  nombre: string;
  /** El código vigente, si lo hay. */
  codigo: string | null;
  emitido: Date | null;
  ultimoAcceso: Date | null;
  puedeEditar: boolean;
}) {
  const [state, action] = useActionState<PortalFormState, FormData>(
    issueGuardianCode,
    undefined,
  );
  const [copiado, setCopiado] = useState(false);

  // El código recién emitido se muestra al instante, sin esperar el refresco.
  const vigente = state?.codigo ?? codigo;

  useEffect(() => {
    if (state?.ok) toast.success(`Código emitido para ${nombre}`);
  }, [state, nombre]);

  const copiar = async () => {
    if (!vigente) return;
    try {
      await navigator.clipboard.writeText(vigente);
      setCopiado(true);
      toast.success("Código copiado");
    } catch {
      toast.error("No se pudo copiar. Anótalo a mano.");
    }
  };

  return (
    <div className="flex w-full flex-col items-end gap-2 sm:w-auto sm:min-w-[19rem]">
      {vigente ? (
        <div className="flex w-full flex-col items-end gap-1.5">
          <div className="flex items-center gap-2">
            <code className="tabular rounded-control border border-primary bg-primary-soft px-3 py-1.5 font-mono text-base font-semibold tracking-[0.2em] text-primary">
              {vigente}
            </code>
            <button
              type="button"
              onClick={copiar}
              className="rounded-control border border-border px-2.5 py-1.5 text-xs text-foreground transition-colors hover:border-primary hover:text-primary"
            >
              {copiado ? "Copiado" : "Copiar"}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Emitido {emitido ? emitido.toLocaleDateString("es-CL") : "sin fecha"}
            {ultimoAcceso ? ` · entró por última vez el ${ultimoAcceso.toLocaleDateString("es-CL")}` : " · nunca ha entrado"}
          </p>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Sin código emitido. Esta familia todavía no puede entrar al portal.
        </p>
      )}

      {puedeEditar ? (
        <form action={action} className="flex items-center gap-2">
          <input type="hidden" name="guardianId" value={guardianId} />
          <SubmitButton
            className="rounded-control border border-primary bg-transparent px-3 py-1.5 text-xs font-semibold text-primary"
            pendingLabel="Generando..."
          >
            {vigente ? "Rotar código" : "Dar acceso al portal"}
          </SubmitButton>
          {vigente ? (
            <span className="text-xs text-muted-foreground">Corta el acceso del código anterior</span>
          ) : null}
        </form>
      ) : null}

      {state?.error ? <p className="text-xs text-danger">{state.error}</p> : null}
    </div>
  );
}
