"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { eliminarDocumentoObra } from "@/app/actions/obra-documentacion";
import { dangerButtonClass } from "@/lib/ui";

function ConfirmSubmitButton({
  titulo,
  className,
}: {
  titulo: string;
  className: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(event) => {
        if (!window.confirm(`¿Eliminar el documento «${titulo}»? Se borrará también su historial y no se puede deshacer.`)) {
          event.preventDefault();
        }
      }}
      className={className}
    >
      {pending ? "Eliminando…" : "Eliminar documento"}
    </button>
  );
}

export function EliminarDocumento({
  documentoId,
  titulo,
}: {
  documentoId: string;
  titulo: string;
}) {
  const router = useRouter();
  const [state, action] = useActionState(eliminarDocumentoObra, undefined);

  useEffect(() => {
    if (state?.ok) {
      toast.success(state.message ?? "Documento eliminado.");
      router.push("/obras/documentos");
      router.refresh();
    }
    if (state?.error) toast.error(state.error);
  }, [state, router]);

  return (
    <form action={action}>
      <input type="hidden" name="documentoId" value={documentoId} />
      <ConfirmSubmitButton titulo={titulo} className={dangerButtonClass} />
    </form>
  );
}
