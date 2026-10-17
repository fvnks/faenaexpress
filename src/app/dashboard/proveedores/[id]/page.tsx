import Link from "next/link";
import { notFound } from "next/navigation";

import { Breadcrumb } from "@/components/breadcrumb";
import { Pagination } from "@/components/pagination";
import { PurchaseStatusBadge } from "@/components/purchase-status-badge";
import { canWrite, requireContext } from "@/lib/auth";
import { documentTypeLabel, partnerTypeLabel } from "@/lib/labels";
import { formatCLP, formatDate } from "@/lib/money";
import { parsePage } from "@/lib/pagination";
import { getPartnerOverview } from "@/lib/partners";
import { cardClass, primaryButtonClass, secondaryButtonClass } from "@/lib/ui";

const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

// Ficha del proveedor: sus datos y el historial de compras. Es la pantalla donde
// se responde "qué compramos, con qué factura y cuándo" sin tener que filtrar el
// listado completo de compras.
export default async function SupplierDetailPage(props: PageProps<"/dashboard/proveedores/[id]">) {
  const ctx = await requireContext("proveedores");
  const { id } = await props.params;
  const searchParams = await props.searchParams;

  const overview = await getPartnerOverview(ctx.company.id, id, parsePage(one(searchParams.pagina)));

  if (!overview) {
    notFound();
  }

  const { partner, purchases, purchaseCount, purchaseTotal, pendingTotal, lastPurchaseAt, page, pageCount } =
    overview;
  const writable = canWrite(ctx, "proveedores");

  const contactRows = [
    { label: "Giro", value: partner.giro },
    { label: "Correo", value: partner.email },
    { label: "Teléfono", value: partner.phone },
    { label: "Dirección", value: partner.address },
    { label: "Comuna", value: partner.commune },
    { label: "Ciudad", value: partner.city },
  ].filter((row) => Boolean(row.value));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Breadcrumb
          items={[
            { label: "Panel", href: "/dashboard", icon: "home" },
            { label: "Proveedores", href: "/dashboard/proveedores", icon: "proveedores" },
            { label: partner.name },
          ]}
        />
        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight">{partner.name}</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {partnerTypeLabel(partner.type)}
              {partner.rut ? ` · RUT ${partner.rut}` : " · Sin RUT"}
              {partner.active ? "" : " · Inactivo"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/dashboard/compras?proveedor=${partner.id}`} className={secondaryButtonClass}>
              Ver en Compras
            </Link>
            {writable ? (
              <Link href={`/dashboard/proveedores/${partner.id}/editar`} className={primaryButtonClass}>
                Editar
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      <div className={cardClass + " grid grid-cols-2 divide-border sm:grid-cols-4 sm:divide-x"}>
        <div className="p-4">
          <p className="text-xs text-muted-foreground">Compras registradas</p>
          <p className="tabular mt-1 text-2xl font-bold">{purchaseCount}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {lastPurchaseAt ? `Última el ${formatDate(lastPurchaseAt)}` : "Sin movimientos"}
          </p>
        </div>
        <div className="border-l border-border p-4 sm:border-l-0">
          <p className="text-xs text-muted-foreground">Total comprado</p>
          <p className="tabular mt-1 text-2xl font-bold">{formatCLP(purchaseTotal)}</p>
        </div>
        <div className="col-span-2 border-t border-border p-4 sm:col-span-1 sm:border-t-0">
          <p className="text-xs text-muted-foreground">Pendiente de pago</p>
          <p className={"tabular mt-1 text-2xl font-bold " + (pendingTotal > 0 ? "text-accent" : "")}>
            {formatCLP(pendingTotal)}
          </p>
        </div>
        <div className="col-span-2 border-t border-border p-4 sm:col-span-1 sm:border-t-0">
          <p className="text-xs text-muted-foreground">Pagado</p>
          <p className="tabular mt-1 text-2xl font-bold text-success">
            {formatCLP(purchaseTotal - pendingTotal)}
          </p>
        </div>
      </div>

      <section className={cardClass + " p-5"}>
        <h2 className="text-sm font-semibold">Datos de contacto</h2>
        {contactRows.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Sin datos de contacto. Se completan solos al importar el XML del proveedor.
          </p>
        ) : (
          <dl className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {contactRows.map((row) => (
              <div key={row.label}>
                <dt className="text-xs text-muted-foreground">{row.label}</dt>
                <dd className="mt-0.5 break-words text-sm">{row.value}</dd>
              </div>
            ))}
          </dl>
        )}
        {partner.notes ? (
          <div className="mt-4 border-t border-border pt-4">
            <p className="text-xs text-muted-foreground">Notas</p>
            <p className="mt-0.5 whitespace-pre-line text-sm">{partner.notes}</p>
          </div>
        ) : null}
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 className="text-lg font-semibold tracking-tight">Compras del proveedor</h2>
          {purchaseCount > 0 ? (
            <p className="text-sm text-muted-foreground">
              {purchaseCount} {purchaseCount === 1 ? "documento" : "documentos"}
            </p>
          ) : null}
        </div>

        {purchases.length === 0 ? (
          <div className={cardClass + " px-4 py-10 text-center"}>
            <p className="font-medium">Este proveedor aún no tiene compras registradas.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Al importar una factura de compra, se asigna sola por RUT y aparece acá.
            </p>
            {writable ? (
              <Link href="/dashboard/compras/nueva" className={primaryButtonClass + " mt-4 inline-block"}>
                Nueva compra
              </Link>
            ) : null}
          </div>
        ) : (
          <div className={cardClass}>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th scope="col" className="px-3 py-2 font-medium">Fecha</th>
                    <th scope="col" className="px-3 py-2 font-medium">Documento</th>
                    <th scope="col" className="px-3 py-2 font-medium">Vence</th>
                    <th scope="col" className="px-3 py-2 text-right font-medium">Neto</th>
                    <th scope="col" className="px-3 py-2 text-right font-medium">IVA</th>
                    <th scope="col" className="px-3 py-2 text-right font-medium">Total</th>
                    <th scope="col" className="px-3 py-2 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {purchases.map((purchase) => (
                    <tr
                      key={purchase.id}
                      className="border-b border-border transition-colors last:border-0 hover:bg-primary-soft/30"
                    >
                      <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                        {formatDate(purchase.date)}
                      </td>
                      <td className="px-3 py-2">
                        <Link
                          href={`/dashboard/compras/${purchase.id}`}
                          className="font-medium underline-offset-2 hover:underline"
                        >
                          {documentTypeLabel(purchase.documentType)}
                          {purchase.documentNumber ? ` N° ${purchase.documentNumber}` : ""}
                        </Link>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                        {purchase.dueDate ? formatDate(purchase.dueDate) : ""}
                      </td>
                      <td className="tabular px-3 py-2 text-right">{formatCLP(purchase.netAmount)}</td>
                      <td className="tabular px-3 py-2 text-right text-muted-foreground">
                        {formatCLP(purchase.ivaAmount)}
                      </td>
                      <td className="tabular px-3 py-2 text-right font-semibold">
                        {formatCLP(purchase.totalAmount)}
                      </td>
                      <td className="px-3 py-2">
                        <PurchaseStatusBadge status={purchase.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <Pagination
          pathname={`/dashboard/proveedores/${partner.id}`}
          params={searchParams}
          page={page}
          pageCount={pageCount}
          total={purchaseCount}
        />
      </section>
    </div>
  );
}
