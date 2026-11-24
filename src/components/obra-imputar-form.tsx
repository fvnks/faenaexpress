"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import type { ObraActionState } from "@/app/actions/obra-avance";
import { SubmitButton } from "@/components/submit-button";
import { controlClass, primaryButtonClass } from "@/lib/ui";

/** Alta de costo real: elige un documento de Facturas y opcionalmente una partida. */
export function ImputarCostoForm({
  mode,
  documentos,
  partidas,
  action,
}: {
  mode: "compra" | "gasto";
  documentos: Array<{ id: string; label: string; monto: number; fecha: string }>;
  partidas: Array<{ id: string; codigo: string; descripcion: string }>;
  action: (prev: ObraActionState, formData: FormData) => Promise<ObraActionState>;
}) {
  const router = useRouter();
  const [state, formAction] = useActionState(action, undefined);

  useEffect(() => {
    if (state?.ok) {
      toast.success(state.message ?? "Documento imputado.");
      router.refresh();
    }
    if (state?.error) toast.error(state.error);
  }, [state, router]);

  if (documentos.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No hay documentos sin imputar en la empresa activa. Regístralos en Facturas y vuelve aquí.
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <select name="sourceId" required className={controlClass + " max-w-md"}>
        <option value="">Seleccionar documento…</option>
        {documentos.map((d) => (
          <option key={d.id} value={d.id}>
            {d.label} · ${d.monto.toLocaleString("es-CL")} · {d.fecha}
          </option>
        ))}
      </select>
      <select name="partidaId" className={controlClass + " max-w-xs"}>
        <option value="">Sin imputar a partida</option>
        {partidas.map((p) => (
          <option key={p.id} value={p.id}>{p.codigo} · {p.descripcion}</option>
        ))}
      </select>
      <SubmitButton pendingLabel="Imputando…" className={primaryButtonClass}>
        Imputar {mode === "compra" ? "compra" : "gasto"}
      </SubmitButton>
    </form>
  );
}
