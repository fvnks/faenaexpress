import Link from "next/link";

import { canInventoryEdit, canInventoryRead, requireContext } from "@/lib/auth";
import { formatDate } from "@/lib/money";
import { cardClass, secondaryButtonClass } from "@/lib/ui";
import { getStockCount } from "@/lib/stock-counts";
import { CountStatusBadge } from "@/app/dashboard/inventario/conteos/count-status-badge";
import {
  CloseCountButton,
  CountItemsForm,
} from "@/app/dashboard/inventario/conteos/count-items-form";

export default async function ConteoDetailPage(
  props: PageProps<"/dashboard/inventario/conteos/[id]">,
) {
  const ctx = await requireContext("inventario");
  if (!canInventoryRead(ctx)) {
    const { redirect } = await import("next/navigation");
    redirect("/dashboard");
  }
  const params = await props.params;
  const count = await getStockCount(ctx.company.id, params.id);
  if (!count) {
    const { redirect } = await import("next/navigation");
    redirect("/dashboard/inventario/conteos");
  }

  const writable = canInventoryEdit(ctx) && count!.status === "OPEN";
  const counted = count!.items.filter((i) => i.countedQuantity !== null);
  const diffItems = counted.filter((i) => !i.countedQuantity!.eq(i.systemQuantity));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">Conteo {count!.code}</h1>
            <CountStatusBadge status={count!.status} />
          </div>
          <p className="text-sm text-muted-foreground">
            {count!.warehouse?.name ?? "—"} · {formatDate(count!.date)} · abierto por{" "}
            {count!.createdBy.name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {writable ? <CloseCountButton countId={count!.id} /> : null}
          <Link href="/dashboard/inventario/conteos" className={secondaryButtonClass}>
            Volver
          </Link>
        </div>
      </div>

      {count!.notes ? (
        <p className={cardClass + " px-4 py-3 text-sm text-muted-foreground"}>{count!.notes}</p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <div className={cardClass + " p-4"}>
          <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Contados
          </div>
          <div className="tabular mt-2 text-xl font-bold tracking-tight">
            {counted.length}/{count!.items.length}
          </div>
        </div>
        <div className={cardClass + " p-4"}>
          <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Con diferencia
          </div>
          <div
            className={
              "tabular mt-2 text-xl font-bold tracking-tight " +
              (diffItems.length > 0 ? "text-accent" : "")
            }
          >
            {diffItems.length}
          </div>
        </div>
        <div className={cardClass + " p-4"}>
          <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Estado
          </div>
          <div className="mt-2 text-xl font-bold tracking-tight">
            {count!.status === "OPEN" ? "En levantamiento" : "Ajustado"}
          </div>
        </div>
      </div>

      <CountItemsForm
        countId={count!.id}
        writable={writable}
        items={count!.items.map((item) => ({
          id: item.id,
          systemQuantity: item.systemQuantity.toFixed(3),
          countedQuantity: item.countedQuantity ? item.countedQuantity.toFixed(3) : null,
          product: {
            name: item.product.name,
            sku: item.product.sku,
            unitName: item.product.unit?.name ?? null,
          },
        }))}
      />

      {count!.status === "CLOSED" ? (
        <p className="text-sm text-muted-foreground">
          Conteo cerrado. Cada diferencia se transformó en un{" "}
          <Link href="/dashboard/inventario/movimientos" className="text-primary underline-offset-2 hover:underline">
            ajuste del kardex
          </Link>{" "}
          con referencia {count!.code}.
        </p>
      ) : null}
    </div>
  );
}
