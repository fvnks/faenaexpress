import { notFound } from "next/navigation";

import { deleteSale, markSalePaid, markSalePending } from "@/app/actions/sales";
import { backfillSaleItemsFromXml } from "@/app/actions/dte";
import { ActionsDropdown } from "@/components/actions-dropdown";
import { BankReconciliationNote } from "@/components/bank-reconciliation-note";
import { Breadcrumb } from "@/components/breadcrumb";
import { DocItemsTable } from "@/components/doc-items-table";
import { DteXmlPanel } from "@/components/dte-xml-panel";
import { SaleStatusBadge } from "@/components/sale-status-badge";
import { SubmitButton } from "@/components/submit-button";
import { canWrite, requireContext } from "@/lib/auth";
import { formatCLP, formatDate, todayISO } from "@/lib/money";
import { canAccess } from "@/lib/permissions";
import { getSale } from "@/lib/sales";
import {
  cardClass,
  controlClass,
  fieldClass,
  labelClass,
  secondaryButtonClass,
} from "@/lib/ui";

export default async function SaleDetailPage(props: PageProps<"/dashboard/ventas/[id]">) {
  const ctx = await requireContext("ventas");
  const { id } = await props.params;
  const sale = await getSale(ctx.company.id, id);

  if (!sale) {
    notFound();
  }

  const writable = canWrite(ctx, "ventas");
  const collected = sale.status === "PAID";
  const canSeeBank = canAccess(ctx.role, "banco");
  const bankLink = sale.bankReconciliations[0] ?? null;
  const total = Number(sale.totalAmount.toString());
  const retention = Number(sale.retentionAmount.toString());
  const toCollect = Math.max(total - retention, 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Breadcrumb
          items={[
            { label: "Panel", href: "/dashboard", icon: "home" },
            { label: "Ventas", href: "/dashboard/ventas", icon: "ventas" },
            { label: sale.partner.name },
          ]}
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{sale.partner.name}</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {sale.partner.rut ? `RUT ${sale.partner.rut}` : "Sin RUT"}
              {sale.documentNumber ? ` · N° factura ${sale.documentNumber}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <SaleStatusBadge status={sale.status} />
            {writable ? (
              <ActionsDropdown
                editHref={`/dashboard/ventas/${sale.id}/editar`}
                deleteAction={deleteSale}
                deleteId={sale.id}
                deleteMessage="¿Eliminar esta venta? Esta acción no se puede deshacer."
              />
            ) : null}
          </div>
        </div>
      </div>

      <div className={cardClass + " p-5"}>
        <p className="text-xs text-muted-foreground">Monto total</p>
        <p className="tabular mt-1 text-2xl font-bold">{formatCLP(total)}</p>
        <dl className="mt-4 grid grid-cols-2 gap-4 border-t border-border pt-4 sm:max-w-md">
          <div>
            <dt className="text-xs text-muted-foreground">Neto</dt>
            <dd className="tabular mt-0.5">{formatCLP(sale.netAmount)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">
              IVA{sale.tasaIVA ? ` (${sale.tasaIVA}%)` : ""}
            </dt>
            <dd className="tabular mt-0.5">{formatCLP(sale.ivaAmount)}</dd>
          </div>
          {sale.exento > 0 ? (
            <div>
              <dt className="text-xs text-muted-foreground">Exento</dt>
              <dd className="tabular mt-0.5">{formatCLP(sale.exento)}</dd>
            </div>
          ) : null}
          {sale.ivaRecargo > 0 ? (
            <div>
              <dt className="text-xs text-muted-foreground">IVA recargo</dt>
              <dd className="tabular mt-0.5">{formatCLP(sale.ivaRecargo)}</dd>
            </div>
          ) : null}
          <div>
            <dt className="text-xs text-muted-foreground">Retención</dt>
            <dd className="tabular mt-0.5">{retention > 0 ? formatCLP(retention) : "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">A cobrar</dt>
            <dd className="tabular mt-0.5 font-semibold">{formatCLP(toCollect)}</dd>
          </div>
        </dl>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <section className={cardClass + " p-5"}>
          <h2 className="font-semibold">Documento</h2>
          <dl className="mt-3 flex flex-col gap-3 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Fecha de emisión</dt>
              <dd className="tabular">{formatDate(sale.date)}</dd>
            </div>
            {sale.dueDate ? (
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Vence</dt>
                <dd className="tabular">{formatDate(sale.dueDate)}</dd>
              </div>
            ) : null}
            {sale.formaPago ? (
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Forma de pago</dt>
                <dd>{sale.formaPago}</dd>
              </div>
            ) : null}
            {sale.facturaOriginal ? (
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Factura original</dt>
                <dd>
                  {sale.facturaOriginal}
                  {sale.tipoDocRefOriginal ? ` (tipo ${sale.tipoDocRefOriginal})` : ""}
                </dd>
              </div>
            ) : null}
            {sale.fechaRecepcion ? (
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Recepción SII</dt>
                <dd className="tabular">{formatDate(sale.fechaRecepcion)}</dd>
              </div>
            ) : null}
            {sale.estadoReceptor ? (
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Estado receptor SII</dt>
                <dd>{sale.estadoReceptor}</dd>
              </div>
            ) : null}
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Vendedor</dt>
              <dd>{sale.salesperson?.name ?? "Sin vendedor"}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Orden de compra / EDP</dt>
              <dd>{sale.purchaseOrder ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Guía</dt>
              <dd>{sale.dispatchGuide ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">N° HES</dt>
              <dd>{sale.hesNumber ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Área</dt>
              <dd>{sale.area?.name ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Categoría</dt>
              <dd>{sale.category?.name ?? "—"}</dd>
            </div>
            {sale.notes ? (
              <div className="flex flex-col gap-0.5">
                <dt className="text-muted-foreground">Observaciones</dt>
                <dd className="whitespace-pre-line">{sale.notes}</dd>
              </div>
            ) : null}
            <div className="flex justify-between gap-3 border-t border-border pt-3">
              <dt className="text-muted-foreground">Registrada por</dt>
              <dd>{sale.createdBy.name}</dd>
            </div>
          </dl>
        </section>

        <section className={cardClass + " flex flex-col gap-3 p-5"}>
          <h2 className="font-semibold">Cobro</h2>

          {collected ? (
            <p className="text-sm text-success">
              Cobrada el {sale.paymentDate ? formatDate(sale.paymentDate) : "—"}.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Por cobrar desde el {formatDate(sale.date)}.
            </p>
          )}

          {bankLink && canSeeBank ? <BankReconciliationNote movement={bankLink.movement} /> : null}

          {writable ? (
            collected ? (
              <form action={markSalePending} className="border-t border-border pt-3">
                <input type="hidden" name="id" value={sale.id} />
                <SubmitButton pendingLabel="Guardando..." className={secondaryButtonClass}>
                  Marcar como por cobrar
                </SubmitButton>
              </form>
            ) : (
              <form action={markSalePaid} className="flex flex-col gap-3 border-t border-border pt-3">
                <input type="hidden" name="id" value={sale.id} />
                <div className={fieldClass}>
                  <label htmlFor="paymentDate" className={labelClass}>
                    Fecha de pago
                  </label>
                  <input
                    id="paymentDate"
                    name="paymentDate"
                    type="text" data-date="1" pattern="^\d{2}-\d{2}-\d{4}$" placeholder="DD-MM-AAAA"
                    defaultValue={todayISO()}
                    className={controlClass}
                  />
                </div>
                <SubmitButton pendingLabel="Guardando..." className={secondaryButtonClass}>
                  Marcar como cobrada
                </SubmitButton>
              </form>
            )
          ) : null}
        </section>

        {sale.status === "CANCELLED" ? (
          <section className={cardClass + " flex flex-col gap-3 border-danger/30 p-5"}>
            <h2 className="font-semibold text-danger">Cancelación</h2>
            <dl className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Tipo</dt>
                <dd>
                  {sale.cancellationType === "CREDIT_NOTE"
                    ? "Nota de crédito"
                    : sale.cancellationType === "DEBIT_NOTE"
                      ? "Nota de débito"
                      : "Razón"}
                </dd>
              </div>
              {sale.cancellationNoteNumber ? (
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Folio NC/ND</dt>
                  <dd className="tabular">{sale.cancellationNoteNumber}</dd>
                </div>
              ) : null}
              {sale.cancellationReason ? (
                <div className="flex flex-col gap-0.5">
                  <dt className="text-muted-foreground">Razón</dt>
                  <dd className="whitespace-pre-line">{sale.cancellationReason}</dd>
                </div>
              ) : null}
              {sale.refacturadaNumber ? (
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Factura que reemplazó</dt>
                  <dd className="tabular">{sale.refacturadaNumber}</dd>
                </div>
              ) : null}
              {sale.cancellationComment ? (
                <div className="flex flex-col gap-0.5">
                  <dt className="text-muted-foreground">Comentario</dt>
                  <dd className="whitespace-pre-line">{sale.cancellationComment}</dd>
                </div>
              ) : null}
            </dl>
          </section>
        ) : null}
      </div>

      {sale.items.length === 0 && sale.xmlContent ? (
        <form
          action={backfillSaleItemsFromXml.bind(null, sale.id)}
          className="max-w-md rounded-card border border-border bg-surface p-4"
        >
          <p className="text-sm text-muted-foreground">
            Esta factura quedó sin detalle de productos (importación parcial).
          </p>
          <button type="submit" className={secondaryButtonClass + " mt-3"}>
            Cargar detalle desde XML
          </button>
        </form>
      ) : null}

      <DocItemsTable items={sale.items} netAmount={sale.netAmount} />

      <DteXmlPanel
        xmlContent={sale.xmlContent}
        folio={sale.documentNumber}
        emptyNote="Esta venta no tiene el XML guardado: se cargó a mano o entró por el RCV del SII, así que solo se guardaron los totales."
        importHref="/dashboard/importar"
      />

    </div>
  );
}
