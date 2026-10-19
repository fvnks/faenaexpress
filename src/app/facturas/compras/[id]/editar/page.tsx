import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { updatePurchase } from "@/app/actions/purchases";
import { PurchaseForm } from "@/app/facturas/compras/purchase-form";
import { canWrite, requireContext } from "@/lib/auth";
import { listAreas, listCategories } from "@/lib/catalogs";
import { todayISO } from "@/lib/money";
import { listSuppliers } from "@/lib/partners";
import { getPurchase, serializePurchase } from "@/lib/purchases";

export default async function EditPurchasePage(props: PageProps<"/facturas/compras/[id]/editar">) {
  const ctx = await requireContext("compras");
  if (!canWrite(ctx, "compras")) {
    redirect("/facturas/compras");
  }

  const { id } = await props.params;

  const [purchase, suppliers, categories, areas] = await Promise.all([
    getPurchase(ctx.company.id, id),
    listSuppliers(ctx.company.id),
    listCategories(ctx.company.id),
    listAreas(ctx.company.id),
  ]);

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
        action={action}
        suppliers={suppliers}
        categories={categories}
        areas={areas}
        ivaRate={ctx.company.ivaRate}
        today={todayISO()}
        defaults={serializePurchase(purchase)}
      />
    </div>
  );
}
