"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";

import { aprobarEstadoPago, facturarEstadoPago, generarEstadoPago } from "@/app/actions/obra-estados-pago";
import { SubmitButton } from "@/components/submit-button";
import { controlClass, primaryButtonClass, secondaryButtonClass } from "@/lib/ui";
import type { ObraActionState } from "@/app/actions/obra-avance";

export function GenerarEstadoPago({ periodo }: { periodo: string }) {
  const router = useRouter();
  const [state, action] = useActionState(generarEstadoPago, undefined);
  useEffect(() => {
    if (state?.ok) { toast.success(state.message ?? "Estado de pago generado."); router.refresh(); }
    if (state?.error) toast.error(state.error);
  }, [state, router]);
  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1">
        <label htmlFor="ep-periodo" className="text-sm text-muted-foreground">Período</label>
        <input id="ep-periodo" name="periodo" type="month" defaultValue={periodo} required className={controlClass} />
      </div>
      <SubmitButton pendingLabel="Generando…" className={primaryButtonClass}>Generar estado de pago</SubmitButton>
    </form>
  );
}

export function AprobarEP({ id }: { id: string }) {
  const router = useRouter();
  return (
    <form action={aprobarEstadoPago} onSubmit={() => setTimeout(() => router.refresh(), 300)}>
      <input type="hidden" name="id" value={id} />
      <SubmitButton pendingLabel="…" className={secondaryButtonClass}>Aprobar</SubmitButton>
    </form>
  );
}

export function FacturarEP({ id }: { id: string }) {
  const router = useRouter();
  const [state, action] = useActionState<ObraActionState, FormData>(facturarEstadoPago, undefined);
  useEffect(() => {
    if (state?.ok) { toast.success(state.message ?? "Facturado."); router.refresh(); }
    if (state?.error) toast.error(state.error);
  }, [state, router]);
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <SubmitButton pendingLabel="Facturando…" className={primaryButtonClass}>Facturar</SubmitButton>
    </form>
  );
}

export function LinkVenta({ saleId }: { saleId: string }) {
  return <Link href={`/facturas/ventas/${saleId}`} className="text-xs text-primary hover:underline">Ver venta →</Link>;
}
