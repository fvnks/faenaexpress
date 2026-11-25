import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { updateSale } from "@/app/actions/sales";
import { SaleForm } from "@/app/facturas/ventas/sale-form";
import { canWrite, requireContext } from "@/lib/auth";
import { listAreas, listCategories, listSalespeople } from "@/lib/catalogs";
import { listCentrosCosto, listReparto } from "@/lib/centros-costo";
import { todayISO } from "@/lib/money";
import { paymentMethodOptions } from "@/lib/payment-methods";
import { listCustomers } from "@/lib/partners";
import { getSale, serializeSale } from "@/lib/sales";

export default async function EditSalePage(props: PageProps<"/facturas/ventas/[id]/editar">) {
  const ctx = await requireContext("ventas");
  if (!canWrite(ctx, "ventas")) {
    redirect("/facturas/ventas");
  }

  const { id } = await props.params;

  const [sale, customers, salespeople, categories, areas, centros, repartos] = await Promise.all([
    getSale(ctx.company.id, id),
    listCustomers(ctx.company.id),
    listSalespeople(ctx.company.id),
    listCategories(ctx.company.id),
    listAreas(ctx.company.id),
    listCentrosCosto(ctx.company.id),
    listReparto(ctx.company.id, "sale", id),
  ]);

  // Las formas de pago que ofrece la empresa: su catálogo más las base.
  const formasDePago = await paymentMethodOptions(ctx.company.id);

  if (!sale) {
    notFound();
  }

  const action = updateSale.bind(null, sale.id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href={`/facturas/ventas/${sale.id}`}
          className="text-sm text-muted-foreground underline-offset-2 hover:underline"
        >
          ← Volver al detalle
        </Link>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Editar venta</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {sale.partner.name}
          {sale.documentNumber ? ` · ${sale.documentNumber}` : ""}
        </p>
      </div>

      <SaleForm
        formasDePago={formasDePago}
        action={action}
        customers={customers}
        salespeople={salespeople}
        categories={categories}
        areas={areas}
        ivaRate={ctx.company.ivaRate}
        retentionRate={ctx.company.retentionRate}
        today={todayISO()}
        defaults={serializeSale(sale)}
        centrosCosto={centros.map((c) => ({ id: c.id, codigo: c.codigo, nombre: c.nombre }))}
        repartosIniciales={repartos.map((r) => ({
          centroCostoId: r.centroCostoId,
          monto: Math.abs(r.monto),
        }))}
      />
    </div>
  );
}
