"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { linkDispatchGuideToSale } from "@/app/actions/dispatch-guides";

type Venta = { id: string; etiqueta: string };

/**
 * La factura que despacha una guía.
 *
 * Cuando la guía se trajo del SII y su factura ya estaba importada, el vínculo
 * viene hecho. Cuando no, se elige acá: las facturas que se ofrecen son las del
 * mismo cliente, que es como tiene que ser.
 */
export function GuideSaleLink({
  guideId,
  ventaId,
  ventas,
  puedeEditar,
}: {
  guideId: string;
  /** La factura con la que ya está relacionada, si hay. */
  ventaId: string | null;
  ventas: Venta[];
  puedeEditar: boolean;
}) {
  const router = useRouter();
  const [elegida, setElegida] = useState(ventaId ?? "");

  if (!puedeEditar) {
    return ventaId ? (
      <span className="text-xs text-muted-foreground">Relacionada</span>
    ) : (
      <span className="text-xs text-muted-foreground">Sin factura</span>
    );
  }

  return (
    <form
      action={linkDispatchGuideToSale}
      className="flex flex-wrap items-center gap-2"
      onSubmit={() => router.refresh()}
    >
      <input type="hidden" name="guideId" value={guideId} />
      <select
        name="saleId"
        value={elegida}
        onChange={(e) => setElegida(e.target.value)}
        aria-label="Factura de venta que despacha la guía"
        className="rounded-control border border-border bg-surface px-2 py-1 text-xs text-foreground"
      >
        <option value="">Sin factura</option>
        {ventas.map((v) => (
          <option key={v.id} value={v.id}>
            {v.etiqueta}
          </option>
        ))}
      </select>
      <button
        type="submit"
        className="rounded-control border border-border bg-transparent px-2 py-1 text-xs text-foreground transition-colors hover:border-primary hover:text-primary"
      >
        {elegida ? "Relacionar" : "Quitar"}
      </button>
    </form>
  );
}
