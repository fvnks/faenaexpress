import Link from "next/link";
import { notFound } from "next/navigation";

import { PrintTicketButton } from "@/app/pos/ventas/[id]/print-ticket-button";
import { ReturnSaleForm } from "@/app/pos/ventas/[id]/return-form";
import { DteInfo } from "@/app/pos/ventas/[id]/dte-info";
import { DteDownloadButton } from "@/app/pos/ventas/[id]/dte-download";
import { VoidSaleForm } from "@/app/pos/ventas/[id]/void-sale-form";
import { formatPosDateTime } from "@/app/pos/fecha";
import { requireContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatCLP } from "@/lib/money";
import { getPosSale } from "@/lib/pos";
import { cardClass, controlClass, labelClass, primaryButtonClass, secondaryButtonClass } from "@/lib/ui";
import { recordPosCreditPaymentFormAction, type PosActionState } from "@/app/actions/pos";

import "@/app/pos/ventas/[id]/thermal-ticket.css";

function quantity(value: { toString(): string }) {
  return Number(value.toString()).toLocaleString("es-CL", { maximumFractionDigits: 3 });
}

export default async function PosTicketPage(props: PageProps<"/pos/ventas/[id]">) {
  const ctx = await requireContext();
  const { id } = await props.params;
  const sale = await getPosSale(ctx.company.id, id);

  if (!sale) notFound();

  // Compras previas del cliente en Facturas (historial para mostrar en el POS).
  let customerPurchases: { id: string; documentNumber: string | null; totalAmount: number; createdAt: Date; status: string }[] = [];
  if (sale.partnerId) {
    const purchases = await db.sale.findMany({
      where: {
        companyId: ctx.company.id,
        partnerId: sale.partnerId,
        id: { not: sale.id },
      },
      select: {
        id: true,
        documentNumber: true,
        totalAmount: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });
    customerPurchases = purchases.map((p) => ({
      id: p.id,
      documentNumber: p.documentNumber,
      totalAmount: Number(p.totalAmount),
      status: p.status,
      createdAt: p.createdAt,
    }));
  }

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

        {sale.balanceDue > 0 ? (
          <>
            <div className="mt-4 border-t border-border pt-3 bg-accent-soft rounded-control">
              <div className="flex justify-between gap-6 border-b border-border pb-2">
                <dt className="font-medium">Saldo pendiente</dt>
                <dd className="tabular font-semibold text-danger">{formatCLP(sale.balanceDue)}</dd>
              </div>
              {sale.creditDueDate ? (
                <div className="flex justify-between gap-6 pt-1 text-xs">
                  <dt className="text-muted-foreground">Vence</dt>
                  <dd className="tabular">{new Date(sale.creditDueDate).toLocaleDateString("es-CL")}</dd>
                </div>
              ) : null}
            </div>
          </>
        ) : null}

        {sale.balanceDue > 0 ? (
          <section className={cardClass + " p-4 mt-4 print:hidden"}>
            <h2 className="text-sm font-semibold">Abono a cuenta corriente</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Registra un abono a este ticket. Solo un supervisor puede hacerlo.
            </p>
            <form action={recordPosCreditPaymentFormAction} className="mt-3 flex flex-col sm:flex-row gap-3">
              <input type="hidden" name="saleId" value={sale.id} />
              <div className="flex flex-col gap-1 sm:flex-1">
                <label htmlFor="pos-credit-amount" className={labelClass}>Monto del abono</label>
                <input
                  id="pos-credit-amount"
                  name="amount"
                  type="number"
                  min="0"
                  step="1"
                  className={controlClass}
                  required
                />
              </div>
              <div className="flex flex-col gap-1 sm:flex-1">
                <label htmlFor="pos-credit-method" className={labelClass}>Medio de pago</label>
                <select id="pos-credit-method" name="method" className={controlClass} required>
                  <option value="">Selecciona</option>
                  <option>Efectivo</option>
                  <option>Transferencia</option>
                  <option>Tarjeta de crédito</option>
                  <option>Tarjeta de débito</option>
                  <option>Cheque</option>
                  <option>Otro</option>
                </select>
              </div>
              <div className="flex flex-col gap-1 sm:flex-1">
                <label htmlFor="pos-credit-reference" className={labelClass}>Referencia (opcional)</label>
                <input
                  id="pos-credit-reference"
                  name="reference"
                  type="text"
                  placeholder="N° de autorización, cheque…"
                  className={controlClass}
                />
              </div>
              <div className="flex flex-col gap-1 sm:flex-1">
                <label htmlFor="pos-credit-notes" className={labelClass}>Nota (opcional)</label>
                <input
                  id="pos-credit-notes"
                  name="notes"
                  type="text"
                  placeholder="Comentario del abono…"
                  className={controlClass}
                />
              </div>
              <button type="submit" className={primaryButtonClass}>
                Registrar abono
              </button>
            </form>
          </section>
        ) : null}

        {customerPurchases.length > 0 ? (
          <section className={cardClass + " p-4 mt-4 print:hidden"}>
            <h2 className="text-sm font-semibold">Compras previas del cliente</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Últimas {customerPurchases.length} facturas de este cliente en Facturas.
            </p>
            <table className="mt-2 w-full text-sm divide-y divide-border">
              <thead>
                <tr className="text-left text-xs uppercase text-muted-foreground">
                  <th className="px-4 py-2">Fecha</th>
                  <th className="px-4 py-2">Documento</th>
                  <th className="px-4 py-2 text-right">Total</th>
                  <th className="px-4 py-2">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {customerPurchases.map((p) => (
                  <tr key={p.id} className="tabular">
                    <td className="px-4 py-2 text-muted-foreground">
                      {new Date(p.createdAt).toLocaleDateString("es-CL")}
                    </td>
                    <td className="px-4 py-2">{p.documentNumber ?? "—"}</td>
                    <td className="px-4 py-2 text-right tabular">{formatCLP(p.totalAmount)}</td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">{p.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
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