import Link from "next/link";
import { redirect } from "next/navigation";

import { PosSaleForm } from "@/app/pos/venta/sale-form";
import { canWrite, requireContext } from "@/lib/auth";
import { paymentMethodOptions } from "@/lib/payment-methods";
import { getOpenPosSession, listPosPartners, listPosProducts } from "@/lib/pos";
import { cardClass, primaryButtonClass, secondaryButtonClass } from "@/lib/ui";

export default async function PosVentaPage() {
  const ctx = await requireContext();
  if (!canWrite(ctx, "ventas")) redirect("/pos");

  const session = await getOpenPosSession(ctx.company.id, ctx.user.id);

  if (!session) {
    return (
      <div className="mx-auto flex max-w-xl flex-col gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Vender</h1>
        <section className={cardClass + " p-6"}>
          <h2 className="text-sm font-semibold">Primero abre la caja</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Cada venta queda asociada a la caja del turno, para poder cuadrar el efectivo al
            cerrar. Abrir la caja toma un momento y no registra ninguna venta.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/pos/caja" className={primaryButtonClass}>
              Abrir caja
            </Link>
            <Link href="/pos" className={secondaryButtonClass}>
              Volver al resumen
            </Link>
          </div>
        </section>
      </div>
    );
  }

  const [products, partners, methods] = await Promise.all([
    listPosProducts(ctx.company.id),
    listPosPartners(ctx.company.id),
    paymentMethodOptions(ctx.company.id),
  ]);

  return (
    <PosSaleForm
      products={products}
      partners={partners}
      methods={methods}
      ivaRate={ctx.company.ivaRate}
      sessionOpenedAt={session.openedAt.toISOString()}
    />
  );
}
