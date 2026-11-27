import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { updatePurchase } from "@/app/actions/purchases";
import { PurchaseForm } from "@/app/facturas/compras/purchase-form";
import { canWrite, requireContext } from "@/lib/auth";
import { listAreas, listCategories } from "@/lib/catalogs";
import { listCentrosCosto, listReparto } from "@/lib/centros-costo";
import { todayISO } from "@/lib/money";
import { obrasImputables } from "@/lib/obra-imputacion";
import { paymentMethodOptions } from "@/lib/payment-methods";
import { listSuppliers } from "@/lib/partners";
import { getPurchase, serializePurchase } from "@/lib/purchases";

export default async function EditPurchasePage(props: PageProps<"/facturas/compras/[id]/editar">) {
  const ctx = await requireContext("compras");
  if (!canWrite(ctx, "compras")) {
    redirect("/facturas/compras");
  }

  const { id } = await props.params;

  const [purchase, suppliers, categories, areas, centros, repartos] = await Promise.all([
    getPurchase(ctx.company.id, id),
    listSuppliers(ctx.company.id),
    listCategories(ctx.company.id),
    listAreas(ctx.company.id),
    listCentrosCosto(ctx.company.id),
    listReparto(ctx.company.id, "purchase", id),
  ]);

  // Las formas de pago que ofrece la empresa: su catálogo más las base.
  const formasDePago = await paymentMethodOptions(ctx.company.id);
  const obras = await obrasImputables();

  if (!purchase) {
    notFound();
  }

  const action = updatePurchase.bind(null, purchase.id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href={`/facturas/compras/${purchase.id}`}
          className="text-sm text-muted-foreground underline-offset-2 hover:underline"
        >
          ← Volver al detalle
        </Link>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Editar compra</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {purchase.partner.name}
          {purchase.documentNumber ? ` · ${purchase.documentNumber}` : ""}
        </p>
      </div>

      <PurchaseForm
        formasDePago={formasDePago}
        action={action}
        suppliers={suppliers}
        categories={categories}
        areas={areas}
        ivaRate={ctx.company.ivaRate}
        today={todayISO()}
        defaults={serializePurchase(purchase)}
        centrosCosto={centros.map((c) => ({ id: c.id, codigo: c.codigo, nombre: c.nombre, esSinAsignar: c.esSinAsignar }))}
        repartosIniciales={repartos.map((r) => ({
          centroCostoId: r.centroCostoId,
          monto: Math.abs(r.monto),
        }))}
        obras={obras}
      />
    </div>
  );
}
