"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { activarObra } from "@/components/activar-obra";
import { secondaryButtonClass } from "@/lib/ui";

/** Abre otra obra desde el listado, conservando la sección. */
export function CambiarObraLink({ obraId, nombre }: { obraId: string; nombre: string }) {
  const pathname = usePathname();
  const [pending, setPending] = useState(false);

  const abrir = async () => {
    if (pending) return;
    setPending(true);
    try {
      const href = await activarObra(obraId, pathname);
      window.location.assign(href);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo cambiar de obra.");
      setPending(false);
    }
  };

  return (
    <button
      type="button"
      disabled={pending}
      aria-label={`Abrir obra ${nombre}`}
      onClick={abrir}
      className={secondaryButtonClass + " px-3 py-1 text-xs"}
    >
      {pending ? "Abriendo…" : "Abrir"}
    </button>
  );
}
