"use client";

import { usePathname } from "next/navigation";
import { useTransition } from "react";

import { switchObra } from "@/app/actions/obras";
import { secondaryButtonClass } from "@/lib/ui";

/** Abre otra obra desde el listado del panel, conservando la sección. */
export function CambiarObraLink({ obraId, nombre }: { obraId: string; nombre: string }) {
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      aria-label={`Abrir obra ${nombre}`}
      onClick={() => startTransition(async () => { await switchObra(obraId, pathname); })}
      className={secondaryButtonClass + " px-3 py-1 text-xs"}
    >
      {pending ? "Abriendo…" : "Abrir"}
    </button>
  );
}
