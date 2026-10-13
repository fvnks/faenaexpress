import Link from "next/link";
import { redirect } from "next/navigation";

import { createSale } from "@/app/actions/sales";
import { SaleForm } from "@/app/dashboard/ventas/sale-form";
import { canWrite, requireContext } from "@/lib/auth";
import { listAreas, listCategories, listSalespeople } from "@/lib/catalogs";
import { todayISO } from "@/lib/money";
import { listCustomers } from "@/lib/partners";
import { cardClass, primaryButtonClass } from "@/lib/ui";

export default async function NewSalePage() {
  const ctx = await requireContext("ventas");
  if (!canWrite(ctx, "ventas")) {
    redirect("/dashboard/ventas");
  }

  const [customers, salespeople, categories, areas] = await Promise.all([
    listCustomers(ctx.company.id),
    listSalespeople(ctx.company.id),
    listCategories(ctx.company.id),
    listAreas(ctx.company.id),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/dashboard/ventas"
          className="text-sm text-muted-foreground underline-offset-2 hover:underline"
        >
          ← Ventas
        </Link>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Nueva venta</h1>
        <p className="mt-1 text-sm text-muted-foreground">Registra la factura emitida a un cliente.</p>
      </div>

      {customers.length === 0 ? (
        <div className={cardClass + " p-6"}>
          <p className="font-medium">Necesitas al menos un cliente.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Crea el primer cliente para poder registrar ventas.
          </p>
          <Link
            href="/dashboard/clientes/nuevo"
            className={primaryButtonClass + " mt-4 inline-block"}
          >
            Nuevo cliente
          </Link>
        </div>
      ) : (
        <SaleForm
          action={createSale}
          customers={customers}
          salespeople={salespeople}
          categories={categories}
          areas={areas}
          ivaRate={ctx.company.ivaRate}
          retentionRate={ctx.company.retentionRate}
          today={todayISO()}
/>
      )}
    </div>
  );
}
