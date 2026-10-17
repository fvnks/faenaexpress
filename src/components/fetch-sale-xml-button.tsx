"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { fetchSaleXmlAction, type FetchSaleXmlState } from "@/app/actions/defontana";
import { SubmitButton } from "@/components/submit-button";
import { secondaryButtonClass } from "@/lib/ui";

/**
 * Trae a pedido el XML de esta venta desde el Libro de Ventas del ERP:
 * solo este documento, sin importar el resto del período.
 */
export function FetchSaleXmlButton({ saleId }: { saleId: string }) {
  const router = useRouter();
  const [state, formAction] = useActionState<FetchSaleXmlState, FormData>(
    fetchSaleXmlAction,
    undefined,
  );

  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success(state.message ?? "XML guardado.");
      router.refresh();
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state, router]);

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-3">
      <input type="hidden" name="saleId" value={saleId} />
      <SubmitButton pendingLabel="Buscando en Defontana…" className={secondaryButtonClass}>
        Traer XML de Defontana
      </SubmitButton>
      <span className="text-sm text-muted-foreground">
        Pide al ERP solo esta venta y completa el detalle.
      </span>
    </form>
  );
}
