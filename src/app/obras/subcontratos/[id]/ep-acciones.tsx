"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  aprobarEpSubcontrato,
  generarEpSubcontrato,
  pagarEpSubcontrato,
} from "@/app/actions/obra-ep-subcontratos";
import { SubmitButton } from "@/components/submit-button";
import { controlClass, primaryButtonClass, secondaryButtonClass } from "@/lib/ui";

export function GenerarEpSubcontrato({ subcontratoId }: { subcontratoId: string }) {
  const router = useRouter();
  const [state, action] = useActionState(generarEpSubcontrato, undefined);

  useEffect(() => {
    if (state?.ok) {
      toast.success(state.message ?? "Estado de pago generado.");
      router.refresh();
    }
    if (state?.error) toast.error(state.error);
  }, [state, router]);

  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="subcontratoId" value={subcontratoId} />
      <label className="flex flex-col gap-1">
        <span className="text-sm text-muted-foreground">Período</span>
        <input name="periodo" type="month" required defaultValue={new Date().toISOString().slice(0, 7)} className={controlClass} />
      </label>
      <SubmitButton pendingLabel="Generando…" className={primaryButtonClass}>
        Generar estado de pago
      </SubmitButton>
    </form>
  );
}

export function AprobarEpSubcontrato({ id }: { id: string }) {
  const router = useRouter();
  return (
    <form action={aprobarEpSubcontrato} onSubmit={() => setTimeout(() => router.refresh(), 300)}>
      <input type="hidden" name="id" value={id} />
      <SubmitButton pendingLabel="…" className={secondaryButtonClass}>Aprobar</SubmitButton>
    </form>
  );
}

export function PagarEpSubcontrato({ id }: { id: string }) {
  const router = useRouter();
  return (
    <form action={pagarEpSubcontrato} onSubmit={() => setTimeout(() => router.refresh(), 300)}>
      <input type="hidden" name="id" value={id} />
      <SubmitButton pendingLabel="…" className={primaryButtonClass}>Pagar</SubmitButton>
    </form>
  );
}
