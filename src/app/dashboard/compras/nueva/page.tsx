import Link from "next/link";
import { redirect } from "next/navigation";

import { createPurchase } from "@/app/actions/purchases";
import { PurchaseForm } from "@/app/dashboard/compras/purchase-form";
import { canWrite, requireContext } from "@/lib/auth";
import { listAreas, listCategories } from "@/lib/catalogs";
import { todayISO } from "@/lib/money";
import { listSuppliers } from "@/lib/partners";
import { listPaymentMethods } from "@/lib/catalogs";
import { cardClass, primaryButtonClass } from "@/lib/ui";

export default async function NewPurchasePage() {
  const ctx = await requireContext("compras");
  if (!canWrite(ctx, "compras")) {
    redirect("/dashboard/compras");
  }

  const [suppliers, categories, areas, paymentMethods] = await Promise.all([
    listSuppliers(ctx.company.id),
    listCategories(ctx.company.id),
    listAreas(ctx.company.id),
    listPaymentMethods(ctx.company.id),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/dashboard/compras"
          className="text-sm text-muted-foreground underline-offset-2 hover:underline"
        >
          ← Compras
        </Link>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Nueva compra</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Registra la factura o boleta de un proveedor.
        </p>
      </div>

      {suppliers.length === 0 ? (
        <div className={cardClass + " p-6"}>
          <p className="font-medium">Necesitas al menos un proveedor.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Crea el primer proveedor para poder registrar compras.
          </p>
          <Link href="/dashboard/proveedores/nuevo" className={primaryButtonClass + " mt-4 inline-block"}>
            Nuevo proveedor
          </Link>
        </div>
      ) : (
        <PurchaseForm
          action={createPurchase}
          suppliers={suppliers}
          categories={categories}
          areas={areas}
          ivaRate={ctx.company.ivaRate}
          today={todayISO()}
          paymentMethods={paymentMethods}
        />
      )}
    </div>
  );
}
