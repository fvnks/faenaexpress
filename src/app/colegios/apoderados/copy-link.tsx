"use client";

import { useState } from "react";
import { toast } from "sonner";

/**
 * El enlace del portal, listo para copiar.
 *
 * Es un input de solo lectura a propósito: la secretaría puede seleccionarlo
 * con el mouse si el portapapeles está bloqueado por el navegador, que es lo
 * que pasa en varios equipos de la secretaría.
 */
export function CopyLink({ url }: { url: string }) {
  const [copiado, setCopiado] = useState(false);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      toast.success("Enlace copiado");
    } catch {
      toast.error("No se pudo copiar. Selecciona el enlace y cópialo a mano.");
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        type="text"
        readOnly
        value={url}
        aria-label="Enlace del portal de apoderados"
        onFocus={(e) => e.currentTarget.select()}
        className="w-full max-w-md rounded-control border border-border bg-background px-3 py-2 text-sm text-foreground"
      />
      <button
        type="button"
        onClick={copiar}
        className="rounded-control border border-primary bg-transparent px-3 py-1.5 text-sm font-semibold text-primary"
      >
        {copiado ? "Copiado" : "Copiar"}
      </button>
    </div>
  );
}
