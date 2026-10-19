import Link from "next/link";
import { redirect } from "next/navigation";

import { createSale } from "@/app/actions/sales";
import { SaleForm } from "@/app/facturas/ventas/sale-form";
import { canWrite, requireContext } from "@/lib/auth";
import { listAreas, listCategories, listSalespeople } from "@/lib/catalogs";
import { todayISO } from "@/lib/money";
import { listCustomers } from "@/lib/partners";
import { cardClass, primaryButtonClass } from "@/lib/ui";

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function NewSalePage(props: PageProps<"/facturas/ventas/nueva">) {
  const ctx = await requireContext("ventas");
  if (!canWrite(ctx, "ventas")) {
    redirect("/facturas/ventas");
  }

  const searchParams = await props.searchParams;
  const tipo = one(searchParams.tipo)?.toUpperCase() ?? "INVOICE";
  const isQuote = tipo === "QUOTATION";
  const defaultDocumentType = isQuote ? "QUOTATION" : "INVOICE";

  const [customers, salespeople, categories, areas] = await Promise.all([
    listCustomers(ctx.company.id),
    listSalespeople(ctx.company.id),
    listCategories(ctx.company.id),
    listAreas(ctx.company.id),
  ]);

  const title = isQuote ? "Nueva cotización" : "Nueva venta";
  const subtitle = isQuote
    ? "Registra la cotización enviada a un cliente."
    : "Registra la factura emitida a un cliente.";
  const backHref = isQuote ? "/facturas/ventas/cotizaciones" : "/facturas/ventas";
  const backLabel = isQuote ? "← Cotizaciones" : "← Ventas";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href={backHref}
          className="text-sm text-muted-foreground underline-offset-2 hover:underline"
        >
          {backLabel}
        </Link>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      </div>

      {customers.length === 0 ? (
        <div className={cardClass + " p-6"}>
          <p className="font-medium">Necesitas al menos un cliente.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Crea el primer cliente para poder registrar ventas.
          </p>
          <Link
            href="/facturas/clientes/nuevo"
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
          defaultDocumentType={defaultDocumentType}
        />
      )}
    </div>
  );
}
