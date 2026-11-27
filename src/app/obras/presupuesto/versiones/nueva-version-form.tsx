"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { crearVersionManual } from "@/app/actions/obra-versiones";
import { SubmitButton } from "@/components/submit-button";
import { controlClass, primaryButtonClass } from "@/lib/ui";

export function NuevaVersionForm() {
  const router = useRouter();
  const [state, action] = useActionState(crearVersionManual, undefined);
  useEffect(() => {
    if (state?.ok) {
      toast.success(state.message ?? "Versión guardada.");
      router.refresh();
    }
    if (state?.error) toast.error(state.error);
  }, [state, router]);

  return (
    <details className="rounded-[8px] border border-border bg-surface">
      <summary className="cursor-pointer px-5 py-4 text-sm font-semibold">Guardar versión actual</summary>
      <form action={action} className="flex flex-wrap items-end gap-3 border-t border-border p-5">
        <label className="flex flex-col gap-1">
          <span className="text-sm text-muted-foreground">Nombre de la versión</span>
          <input name="nombre" required maxLength={120} placeholder="Nombre de la versión" className={controlClass} />
        </label>
        <SubmitButton pendingLabel="Guardando…" className={primaryButtonClass}>Guardar versión</SubmitButton>
      </form>
    </details>
  );
}
