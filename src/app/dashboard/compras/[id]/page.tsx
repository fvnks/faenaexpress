import { notFound } from "next/navigation";

import { deletePurchase, markPurchasePaid, markPurchasePending } from "@/app/actions/purchases";
import { ActionsDropdown } from "@/components/actions-dropdown";
import { Breadcrumb } from "@/components/breadcrumb";
import { DocItemsTable } from "@/components/doc-items-table";
import { PurchaseStatusBadge } from "@/components/purchase-status-badge";
import { SubmitButton } from "@/components/submit-button";
import { canWrite, requireContext } from "@/lib/auth";
import { paymentMethodLabel } from "@/lib/labels";
import { formatCLP, formatDate } from "@/lib/money";
import { getPurchase } from "@/lib/purchases";
import {
  cardClass,
  controlClass,
  fieldClass,
  labelClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/lib/ui";
import { paymentMethodValues } from "@/lib/validation";

export default async function PurchaseDetailPage(props: PageProps<"/dashboard/compras/[id]">) {
  const ctx = await requireContext("compras");
  const { id } = await props.params;
  const purchase = await getPurchase(ctx.company.id, id);

  if (!purchase) {
    notFound();
  }

  const writable = canWrite(ctx, "compras");
  const paid = purchase.status === "PAID";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Breadcrumb
          items={[
            { label: "Panel", href: "/dashboard", icon: "home" },
            { label: "Compras", href: "/dashboard/compras", icon: "compras" },
            { label: purchase.partner.name },
          ]}
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{purchase.partner.name}</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {purchase.partner.rut ? `RUT ${purchase.partner.rut}` : "Sin RUT"}
              {purchase.documentNumber ? ` · Nº factura ${purchase.documentNumber}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <PurchaseStatusBadge status={purchase.status} />
            {writable ? (
              <ActionsDropdown
                editHref={`/dashboard/compras/${purchase.id}/editar`}
                deleteAction={deletePurchase}
                deleteId={purchase.id}
                deleteMessage="¿Eliminar esta compra? Esta acción no se puede deshacer."
              />
            ) : null}
          </div>
        </div>
      </div>

      <div className={cardClass + " p-5"}>
        <p className="text-xs text-muted-foreground">Total de la compra</p>
        <p className="tabular mt-1 text-2xl font-bold">{formatCLP(purchase.totalAmount)}</p>
        <dl className="mt-4 grid grid-cols-2 gap-4 border-t border-border pt-4 sm:max-w-md">
          <div>
            <dt className="text-xs text-muted-foreground">Neto</dt>
            <dd className="tabular mt-0.5">{formatCLP(purchase.netAmount)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">IVA</dt>
            <dd className="tabular mt-0.5">{formatCLP(purchase.ivaAmount)}</dd>
          </div>
        </dl>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <section className={cardClass + " p-5"}>
          <h2 className="font-semibold">Documento</h2>
          <dl className="mt-3 flex flex-col gap-3 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Fecha</dt>
              <dd className="tabular">{formatDate(purchase.date)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Área</dt>
              <dd>{purchase.area?.name ?? "Sin área"}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Categoría</dt>
              <dd>{purchase.category?.name ?? "Sin categoría"}</dd>
            </div>
            {purchase.notes ? (
              <div className="flex flex-col gap-0.5">
                <dt className="text-muted-foreground">Observaciones</dt>
                <dd className="whitespace-pre-line">{purchase.notes}</dd>
              </div>
            ) : null}
            <div className="flex justify-between gap-3 border-t border-border pt-3">
              <dt className="text-muted-foreground">Registrada por</dt>
              <dd>{purchase.createdBy.name}</dd>
            </div>
          </dl>
        </section>

        <section className={cardClass + " flex flex-col gap-3 p-5"}>
          <h2 className="font-semibold">Pago</h2>

          {paid ? (
            <div className="flex flex-col gap-1 text-sm">
              <p className="text-success">Pagada el {purchase.paymentDate ? formatDate(purchase.paymentDate) : "—"}</p>
              <p className="text-muted-foreground">
                Método: {purchase.paymentMethod ? paymentMethodLabel(purchase.paymentMethod) : "—"}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Pendiente de pago desde el {formatDate(purchase.date)}.
            </p>
          )}

          {writable ? (
            paid ? (
              <form action={markPurchasePending} className="border-t border-border pt-3">
                <input type="hidden" name="id" value={purchase.id} />
                <SubmitButton pendingLabel="Guardando..." className={secondaryButtonClass}>
                  Marcar como pendiente
                </SubmitButton>
              </form>
            ) : (
              <form action={markPurchasePaid} className="flex flex-col gap-3 border-t border-border pt-3">
                <input type="hidden" name="id" value={purchase.id} />
                <div className={fieldClass}>
                  <label htmlFor="paymentMethod" className={labelClass}>
                    Método de pago
                  </label>
                  <select id="paymentMethod" name="paymentMethod" defaultValue="TRANSFER" className={controlClass}>
                    {paymentMethodValues.map((value) => (
                      <option key={value} value={value}>
                        {paymentMethodLabel(value)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={fieldClass}>
                  <label htmlFor="paymentDate" className={labelClass}>
                    Fecha de pago
                  </label>
                  <input
                    id="paymentDate"
                    name="paymentDate"
                    type="text" data-date="1" pattern="^\d{2}-\d{2}(-\d{4})?$" placeholder="DD-MM o DD-MM-AAAA"
                    defaultValue=""
                    className={controlClass}
                  />
                </div>
                <SubmitButton pendingLabel="Guardando..." className={primaryButtonClass}>
                  Marcar como pagada
                </SubmitButton>
              </form>
            )
          ) : null}
        </section>
      </div>

      <DocItemsTable items={purchase.items} netAmount={purchase.netAmount} />

    </div>
  );
}
