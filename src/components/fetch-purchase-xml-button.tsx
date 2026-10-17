"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { fetchPurchaseXmlAction, type FetchPurchaseXmlState } from "@/app/actions/defontana";
import { SubmitButton } from "@/components/submit-button";
import { secondaryButtonClass } from "@/lib/ui";

/**
 * Trae a pedido el XML de esta factura desde el Libro de Compras del ERP:
 * solo este documento, sin importar el resto del período.
 */
export function FetchPurchaseXmlButton({ purchaseId }: { purchaseId: string }) {
  const router = useRouter();
  const [state, formAction] = useActionState<FetchPurchaseXmlState, FormData>(
    fetchPurchaseXmlAction,
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
      <input type="hidden" name="purchaseId" value={purchaseId} />
      <SubmitButton pendingLabel="Buscando en Defontana…" className={secondaryButtonClass}>
        Traer XML de Defontana
      </SubmitButton>
      <span className="text-sm text-muted-foreground">
        Pide al ERP solo esta factura y completa el detalle.
      </span>
    </form>
  );
}
