import Link from "next/link";
import { notFound } from "next/navigation";

import { PrintTicketButton } from "@/app/pos/ventas/[id]/print-ticket-button";
import { ReturnSaleForm } from "@/app/pos/ventas/[id]/return-form";
import { DteInfo } from "@/app/pos/ventas/[id]/dte-info";
import { DteDownloadButton } from "@/app/pos/ventas/[id]/dte-download";
import { VoidSaleForm } from "@/app/pos/ventas/[id]/void-sale-form";
import { formatPosDateTime } from "@/app/pos/fecha";
import { requireContext } from "@/lib/auth";
import { formatCLP } from "@/lib/money";
import { getPosSale } from "@/lib/pos";
import { cardClass, secondaryButtonClass } from "@/lib/ui";

import "@/app/pos/ventas/[id]/thermal-ticket.css";

function quantity(value: { toString(): string }) {
  return Number(value.toString()).toLocaleString("es-CL", { maximumFractionDigits: 3 });
}

export default async function PosTicketPage(props: PageProps<"/pos/ventas/[id]">) {
  const ctx = await requireContext();
  const { id } = await props.params;
  const sale = await getPosSale(ctx.company.id, id);

  if (!sale) notFound();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <Link href="/pos/ventas" className={secondaryButtonClass}>
          Volver a ventas
        </Link>
        <div className="flex gap-2">
          <PrintTicketButton />
          <Link href="/pos/venta" className={secondaryButtonClass}>
            Nueva venta
          </Link>
        </div>
      </div>

      {sale.status === "VOIDED" ? (
        <p className="rounded-control border border-danger/40 bg-danger-soft px-4 py-2 text-sm text-foreground print:hidden">
          Este ticket está anulado: no cuenta como venta.
        </p>
      ) : null}

      {sale.relatedSale ? (
        <p className="rounded-control border border-accent/50 bg-accent-soft px-4 py-2 text-sm text-foreground print:hidden">
          Este ticket es la devolución de {sale.relatedSale.saleNumber}.
        </p>
      ) : null}
      {sale.relatedReturns.length > 0 ? (
        <p className="rounded-control border border-accent/50 bg-accent-soft px-4 py-2 text-sm text-foreground print:hidden">
          {sale.relatedReturns.length === 1 ? "Este ticket tiene una devolución registrada" : "Este ticket tiene devoluciones registradas"}
          {": "}
          {sale.relatedReturns.map((devolucion: { saleNumber: string }) => devolucion.saleNumber).join(", ")}.
        </p>
      ) : null}

      {/* Screen version */}
      <article className={cardClass + " p-6 print:hidden"}>
        <header className="border-b border-border pb-4">
          <h1 className="text-lg font-bold tracking-tight">{ctx.company.name}</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            {ctx.company.rut ? `RUT ${ctx.company.rut}` : "Sin RUT configurado"}
            {ctx.company.giro ? ` · ${ctx.company.giro}` : ""}
          </p>
          {ctx.company.address ? (
            <p className="text-xs text-muted-foreground">
              {ctx.company.address}
              {ctx.company.commune ? `, ${ctx.company.commune}` : ""}
            </p>
          ) : null}
        </header>

        <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase text-muted-foreground">
              {sale.total < 0 || sale.relatedSaleId ? "Devolución de venta" : "Ticket de venta"}
            </p>
            <p className="font-mono text-base font-semibold">{sale.saleNumber}</p>
          </div>
          <div className="text-right text-xs text-muted-foreground">
            <p>{formatPosDateTime(sale.createdAt)}</p>
            <p>Cajero: {sale.user.name}</p>
            <p>Caja abierta {formatPosDateTime(sale.session.openedAt)}</p>
          </div>
        </div>

        <div className="mt-4 rounded-control border border-border px-3 py-2">
          <p className="text-xs uppercase text-muted-foreground">Cliente</p>
          <p className="text-sm font-medium">{sale.partner?.name ?? "Consumidor final"}</p>
          {sale.partner?.rut ? (
            <p className="tabular text-xs text-muted-foreground">RUT {sale.partner.rut}</p>
          ) : null}
        </div>

        <table className="mt-4 w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase text-muted-foreground">
              <th className="pb-2">Cant.</th>
              <th className="pb-2">Descripción</th>
              <th className="pb-2 text-right">Unitario</th>
              <th className="pb-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sale.items.map((item: { id: string; quantity: { toString(): string }; name: string; discount: number; unitPrice: number; lineTotal: number }) => (
              <tr key={item.id} className="tabular align-top">
                <td className="py-2 pr-2">{quantity(item.quantity)}</td>
                <td className="py-2 pr-2">
                  <span className="block">{item.name}</span>
                  {item.discount > 0 ? (
                    <span className="block text-xs text-muted-foreground">
                      Descuento {formatCLP(item.discount)}
                    </span>
                  ) : null}
                </td>
                <td className="py-2 pr-2 text-right">{formatCLP(item.unitPrice)}</td>
                <td className="py-2 text-right font-medium">{formatCLP(item.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <dl className="mt-4 ml-auto flex max-w-xs flex-col gap-1 border-t border-border pt-3 text-sm">
          <div className="flex justify-between gap-6">
            <dt className="text-muted-foreground">Neto</dt>
            <dd className="tabular">{formatCLP(sale.subtotal)}</dd>
          </div>
          <div className="flex justify-between gap-6">
            <dt className="text-muted-foreground">IVA</dt>
            <dd className="tabular">{formatCLP(sale.tax)}</dd>
          </div>
          <div className="flex justify-between gap-6 border-t border-border pt-1 text-base font-bold">
            <dt>Total</dt>
            <dd className="tabular">{formatCLP(sale.total)}</dd>
          </div>
        </dl>

        <div className="mt-4 border-t border-border pt-3">
          <p className="text-xs uppercase text-muted-foreground">Pagos</p>
          {sale.payments.length === 0 ? (
            <p className="mt-1 text-sm text-muted-foreground">Sin pagos registrados.</p>
          ) : (
            <ul className="mt-1 flex flex-col gap-1 text-sm">
              {sale.payments.map((payment: { id: string; method: string; reference: string | null; amount: number }) => (
                <li key={payment.id} className="flex justify-between gap-6">
                  <span className="text-muted-foreground">
                    {payment.method}
                    {payment.reference ? ` · ${payment.reference}` : ""}
                  </span>
                  <span className="tabular">{formatCLP(payment.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {sale.notes ? (
          <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
            Nota: {sale.notes}
          </p>
        ) : null}

        {sale.relatedSale ? (
          <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
            Este ticket es la devolución de {sale.relatedSale.saleNumber}.
          </p>
        ) : null}
        {sale.relatedReturns.length > 0 ? (
          <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
            {sale.relatedReturns.length === 1 ? "Este ticket tiene una devolución registrada" : "Este ticket tiene devoluciones registradas"}
            {": "}
            {sale.relatedReturns.map((devolucion: { saleNumber: string }) => devolucion.saleNumber).join(", ")}.
          </p>
        ) : null}

        <footer className="mt-6 border-t border-border pt-3 text-center text-xs text-muted-foreground">
          <DteInfo saleId={sale.id} dtes={sale.dtes as any} />
          <DteDownloadButton dtes={sale.dtes as any} />
          <p className="mt-1">Gracias por su compra.</p>
        </footer>
      </article>

      {/* Thermal printer version - only visible when printing */}
      <article className="thermal-ticket print-only">
        <header>
          <h1>{ctx.company.name}</h1>
          {ctx.company.rut && <p>RUT {ctx.company.rut}</p>}
          {ctx.company.giro && <p>{ctx.company.giro}</p>}
          {ctx.company.address && (
            <p>{ctx.company.address}{ctx.company.commune ? `, ${ctx.company.commune}` : ""}</p>
          )}
        </header>

        <div className="ticket-meta">
          <div>
            <span className="label">{sale.total < 0 || sale.relatedSaleId ? "Devolución de venta" : "Ticket de venta"}</span>
            <span className="value">{sale.saleNumber}</span>
          </div>
          <div>
            <span className="label">Fecha</span>
            <span className="value">{formatPosDateTime(sale.createdAt)}</span>
          </div>
          <div>
            <span className="label">Cajero</span>
            <span className="value">{sale.user.name}</span>
          </div>
        </div>

        <div className="client-info">
          <span className="label">Cliente</span>
          <span className="value">{sale.partner?.name ?? "Consumidor final"}</span>
          {sale.partner?.rut && <span className="value">RUT {sale.partner.rut}</span>}
        </div>

        <table>
          <thead>
            <tr>
              <th className="qty">Cant.</th>
              <th className="desc">Descripción</th>
              <th className="price">Unitario</th>
              <th className="total">Total</th>
            </tr>
          </thead>
          <tbody>
            {sale.items.map((item: { id: string; quantity: { toString(): string }; name: string; discount: number; unitPrice: number; lineTotal: number }) => (
              <tr key={item.id} className="tabular align-top">
                <td className="qty">{quantity(item.quantity)}</td>
                <td className="desc">
                  <span className="item-name">{item.name}</span>
                  {item.discount > 0 ? (
                    <span className="item-discount">Descuento {formatCLP(item.discount)}</span>
                  ) : null}
                </td>
                <td className="price">{formatCLP(item.unitPrice)}</td>
                <td className="total">{formatCLP(item.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="totals">
          <div className="total-row">
            <span className="label">Neto</span>
            <span className="value">{formatCLP(sale.subtotal)}</span>
          </div>
          <div className="total-row">
            <span className="label">IVA</span>
            <span className="value">{formatCLP(sale.tax)}</span>
          </div>
          <div className="total-row grand-total">
            <span className="label">Total</span>
            <span className="value">{formatCLP(sale.total)}</span>
          </div>
        </div>

        <div className="payments">
          <span className="label">Pagos</span>
          {sale.payments.length === 0 ? (
            <p>Sin pagos registrados.</p>
          ) : (
            <ul>
              {sale.payments.map((payment: { id: string; method: string; reference: string | null; amount: number }) => (
                <li key={payment.id} className="payment-row">
                  <span className="method">
                    {payment.method}
                    {payment.reference ? <span className="reference"> · {payment.reference}</span> : null}
                  </span>
                  <span className="amount">{formatCLP(payment.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {sale.notes ? (
          <div className="notes">
            Nota: {sale.notes}
          </div>
        ) : null}

        {sale.relatedSale && (
          <div className="devolution-badge">
            Devolución de {sale.relatedSale.saleNumber}
          </div>
        )}

        <footer>
          <DteInfo saleId={sale.id} dtes={sale.dtes as any} />
          <p>Gracias por su compra.</p>
        </footer>
      </article>

      {sale.status === "COMPLETED" && sale.total >= 0 && sale.session.status === "OPEN" ? (
        <section className={cardClass + " p-4 print:hidden"}>
          <h2 className="text-sm font-semibold">Anular este ticket</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Úsalo solo si la venta no se concretó: los productos vuelven al inventario y el ticket
            deja de contar en el resumen y en la caja.
          </p>
          <div className="mt-3 max-w-md">
            <VoidSaleForm saleId={sale.id} saleNumber={sale.saleNumber} />
          </div>
        </section>
      ) : null}

      {sale.status === "COMPLETED" &&
      sale.total >= 0 &&
      sale.relatedReturns.length === 0 &&
      sale.session.status === "CLOSED" ? (
        <section className={cardClass + " p-4 print:hidden"}>
          <h2 className="text-sm font-semibold">Devolver este ticket</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            El cliente ya se llevó la mercadería y vuelve a entregarla: se registra una devolución
            por el monto completo, el dinero sale de tu caja abierta y los productos vuelven al
            inventario.
          </p>
          <div className="mt-3 max-w-md">
            <ReturnSaleForm saleId={sale.id} saleNumber={sale.saleNumber} />
          </div>
        </section>
      ) : null}
    </div>
  );
}