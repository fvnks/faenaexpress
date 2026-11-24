"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { consumirEnObra, traspasarAObra } from "@/app/actions/obra-bodega";
import { SubmitButton } from "@/components/submit-button";
import { controlClass, primaryButtonClass } from "@/lib/ui";

type Producto = { id: string; name: string; sku: string; stockCentral: number };
type BodegaItem = { id: string; cantidad: number; product: { name: string; sku: string } };

export function TraspasarForm({ productos }: { productos: Producto[] }) {
  const router = useRouter();
  const [state, action] = useActionState(traspasarAObra, undefined);
  useEffect(() => {
    if (state?.ok) { toast.success(state.message ?? "Stock traspasado."); router.refresh(); }
    if (state?.error) toast.error(state.error);
  }, [state, router]);
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <select name="productId" required className={controlClass + " max-w-xs"}>
        <option value="">Producto…</option>
        {productos.map((p) => (
          <option key={p.id} value={p.id}>{p.sku} · {p.name} (hay {p.stockCentral.toFixed(2)})</option>
        ))}
      </select>
      <input name="cantidad" placeholder="Cantidad" type="number" step="0.01" min="0.01" required className={controlClass + " w-32"} />
      <SubmitButton pendingLabel="Traspasando…" className={primaryButtonClass}>Traspasar a la obra</SubmitButton>
    </form>
  );
}

export function ConsumirForm({ bodega, partidas }: { bodega: BodegaItem[]; partidas: Array<{ id: string; codigo: string; descripcion: string }> }) {
  const router = useRouter();
  const [state, action] = useActionState(consumirEnObra, undefined);
  useEffect(() => {
    if (state?.ok) { toast.success(state.message ?? "Consumo registrado."); router.refresh(); }
    if (state?.error) toast.error(state.error);
  }, [state, router]);
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <select name="bodegaObraId" required className={controlClass + " max-w-xs"}>
        <option value="">Producto en bodega…</option>
        {bodega.map((b) => <option key={b.id} value={b.id}>{b.product.sku} · {b.product.name} ({b.cantidad.toFixed(2)})</option>)}
      </select>
      <input name="cantidad" placeholder="Cantidad" type="number" step="0.01" min="0.01" required className={controlClass + " w-32"} />
      <select name="partidaId" className={controlClass + " max-w-xs"}>
        <option value="">Imputar a partida (opcional)</option>
        {partidas.map((p) => <option key={p.id} value={p.id}>{p.codigo} · {p.descripcion}</option>)}
      </select>
      <SubmitButton pendingLabel="Consumiendo…" className={primaryButtonClass}>Registrar consumo</SubmitButton>
    </form>
  );
}
